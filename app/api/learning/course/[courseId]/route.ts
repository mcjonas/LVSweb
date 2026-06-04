import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses, modules, lessons, enrollments, videos, progress, recordings } from '@/lib/schema';
import { eq, asc, and, inArray, ilike } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { getZoomAccessToken } from '@/lib/zoom/api';
// Zoom-only: no Cloudinary import needed

export async function GET(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId: courseIdString } = await params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: number };
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const courseId = Number(courseIdString);

    // Verify enrollment
    const isEnrolled = await db.select()
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, 'active')
      ))
      .limit(1);

    if (isEnrolled.length === 0) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }

    // Fetch Course
    const courseRecord = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const course = courseRecord.length > 0 
      ? courseRecord[0] 
      : { id: courseId, title: 'Self-Paced Learning Program', description: 'Your premium self-paced learning material.' };

    // Fetch Modules
    let courseModules = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex));

    // ── Gather ALL available videos and recordings for this course ──
    // 1. Legacy videos explicitly linked by courseId
    const legacyVideos = await db.select().from(videos).where(eq(videos.courseId, courseId));
    console.log(`Found ${legacyVideos.length} legacy videos linked by courseId ${courseId}`);

    // 2. Zoom recordings linked by courseId
    const zoomRecordings = await db.select().from(recordings).where(eq(recordings.courseId, courseId));
    console.log(`Found ${zoomRecordings.length} Zoom recordings linked by courseId ${courseId}`);

    // Merge them into a standardized format
    const availableVideos = [];
    const addedZoomIds = new Set<string>();

    for (const v of legacyVideos) {
      availableVideos.push({
        title: v.title,
        cloudinaryPublicId: v.cloudinaryPublicId,
        zoomId: v.zoomId,
        passcode: v.passcode,
        videoUrl: v.downloadUrl
      });
      if (v.zoomId) {
        addedZoomIds.add(v.zoomId);
      }
    }

    for (const r of zoomRecordings) {
      if (r.zoomMeetingId && !addedZoomIds.has(r.zoomMeetingId)) {
        availableVideos.push({
          title: r.title,
          cloudinaryPublicId: null,
          zoomId: r.zoomMeetingId,
          passcode: null,
          videoUrl: r.playUrl
        });
        addedZoomIds.add(r.zoomMeetingId);
      }
    }

    // 3. Fallback: match by course title in video/recording title
    if (course.title) {
      const titleMatchedVideos = await db.select()
        .from(videos)
        .where(ilike(videos.title, `%${course.title}%`));
      for (const v of titleMatchedVideos) {
        if (v.zoomId && !addedZoomIds.has(v.zoomId)) {
          availableVideos.push({
            title: v.title,
            cloudinaryPublicId: v.cloudinaryPublicId,
            zoomId: v.zoomId,
            passcode: v.passcode,
            videoUrl: v.downloadUrl
          });
          addedZoomIds.add(v.zoomId);
        }
      }

      const titleMatchedRecordings = await db.select()
        .from(recordings)
        .where(ilike(recordings.title, `%${course.title}%`));
      for (const r of titleMatchedRecordings) {
        if (r.zoomMeetingId && !addedZoomIds.has(r.zoomMeetingId)) {
          availableVideos.push({
            title: r.title,
            cloudinaryPublicId: null,
            zoomId: r.zoomMeetingId,
            passcode: null,
            videoUrl: r.playUrl
          });
          addedZoomIds.add(r.zoomMeetingId);
        }
      }
    }
    console.log(`Total merged available videos/recordings for course: ${availableVideos.length}`);

    // ── Auto-seed if NO modules exist yet ──
    if (courseModules.length === 0) {
      console.log('No modules found, auto-seeding...');
      const newModule = await db.insert(modules).values({
        courseId,
        title: `Module 1: Welcome to ${course.title}`,
        orderIndex: 0
      }).returning();
      courseModules = newModule;

      if (availableVideos.length > 0) {
        console.log(`Seeding ${availableVideos.length} lessons into new module`);
        for (let i = 0; i < availableVideos.length; i++) {
          await db.insert(lessons).values({
            moduleId: newModule[0].id,
            title: availableVideos[i].title,
            description: 'Watch this session to begin your journey.',
            cloudinaryPublicId: availableVideos[i].cloudinaryPublicId,
            zoomId: availableVideos[i].zoomId,
            passcode: availableVideos[i].passcode,
            orderIndex: i,
            durationMinutes: 45
          });
        }
      } else {
        console.log('No videos available, creating placeholder lesson');
        await db.insert(lessons).values({
          moduleId: newModule[0].id,
          title: 'Welcome Session',
          description: 'Your video content is being processed and will appear here shortly. Please check back soon.',
          orderIndex: 0,
          durationMinutes: 5
        });
      }
    } else {
      console.log(`Found ${courseModules.length} existing modules. Checking for new videos...`);
      // ── Modules already exist — sync any NEW videos/recordings that aren't linked to lessons yet ──
      
      const allExistingLessons = [];
      for (const mod of courseModules) {
        const modLessons = await db.select().from(lessons).where(eq(lessons.moduleId, mod.id));
        allExistingLessons.push(...modLessons);
      }
      console.log(`Found ${allExistingLessons.length} existing lessons across modules`);

      const linkedCloudinaryIds = new Set(allExistingLessons.map(l => l.cloudinaryPublicId).filter(Boolean));
      const linkedZoomIds = new Set(allExistingLessons.map(l => l.zoomId).filter(Boolean));

      const newVideos = availableVideos.filter(v => {
        if (v.cloudinaryPublicId && linkedCloudinaryIds.has(v.cloudinaryPublicId)) return false;
        if (v.zoomId && linkedZoomIds.has(v.zoomId)) return false;
        return v.cloudinaryPublicId || v.zoomId || v.videoUrl;
      });

      console.log(`Found ${newVideos.length} new videos to add as lessons`);

      if (newVideos.length > 0) {
        const targetModuleId = courseModules[0].id;
        const maxOrder = allExistingLessons.reduce((max, l) => Math.max(max, l.orderIndex ?? 0), -1);

        for (let i = 0; i < newVideos.length; i++) {
          console.log(`Adding new lesson: "${newVideos[i].title}"`);
          await db.insert(lessons).values({
            moduleId: targetModuleId,
            title: newVideos[i].title,
            description: 'New session added to your course.',
            cloudinaryPublicId: newVideos[i].cloudinaryPublicId || null,
            zoomId: newVideos[i].zoomId || null,
            orderIndex: maxOrder + 1 + i,
            durationMinutes: 45
          });
        }

        const placeholderLessons = allExistingLessons.filter(
          l => l.title === 'Welcome Session' && !l.cloudinaryPublicId && !l.zoomId
        );
        if (placeholderLessons.length > 0) {
          console.log(`Removing ${placeholderLessons.length} placeholder lessons`);
          for (const ph of placeholderLessons) {
            await db.delete(lessons).where(eq(lessons.id, ph.id));
          }
        }
      }
    }

    // ── Re-fetch modules and lessons after potential updates ──
    courseModules = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex));

    // Fetch Lessons for all modules
    const structuredModules = [];
    for (const mod of courseModules) {
      const modLessons = await db.select()
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.orderIndex));

      // Resolve Zoom URLs if any
      const zoomIds = modLessons.map(l => l.zoomId).filter(Boolean) as string[];
      
      const relatedVideos = zoomIds.length > 0 
        ? await db.select().from(videos).where(inArray(videos.zoomId, zoomIds))
        : [];
      const relatedRecordings = zoomIds.length > 0
        ? await db.select().from(recordings).where(inArray(recordings.zoomMeetingId, zoomIds))
        : [];

      // Get a fresh S2S access token to generate secure video URLs
      let zoomToken = '';
      try {
        zoomToken = await getZoomAccessToken();
      } catch (tokenErr) {
        console.error('[Learning Course API] Failed to fetch Zoom access token:', tokenErr);
      }

      // Build map of zoomId -> url
      const videoMap = new Map<string, string>();
      for (const v of relatedVideos) {
        if (v.zoomId && v.downloadUrl) {
          videoMap.set(v.zoomId, v.downloadUrl);
        }
      }
      for (const r of relatedRecordings) {
        if (r.zoomMeetingId) {
          if (r.downloadUrl && zoomToken) {
            const secureUrl = `${r.downloadUrl}${r.downloadUrl.includes('?') ? '&' : '?'}access_token=${zoomToken}`;
            videoMap.set(r.zoomMeetingId, secureUrl);
          } else if (r.playUrl) {
            videoMap.set(r.zoomMeetingId, r.playUrl);
          }
        }
      }

      // Resolve videoUrl
      const lessonsWithUrls = modLessons.map(lesson => {
        const videoUrl = lesson.zoomId ? (videoMap.get(lesson.zoomId) || null) : null;
        return { ...lesson, videoUrl };
      });

      structuredModules.push({
        ...mod,
        lessons: lessonsWithUrls
      });
    }

    // Fetch progress — scoped to this user AND only lessons within this course
    const allLessonIdsInCourse = structuredModules.flatMap((mod: any) => mod.lessons.map((l: any) => l.id));
    const userProgress = await db.select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.completed, 1)));
    // Only return completed lesson IDs that belong to THIS course
    const completedLessonIds = userProgress
      .map(p => p.lessonId)
      .filter(id => allLessonIdsInCourse.includes(id));

    return NextResponse.json({ 
      success: true, 
      course: {
        ...course,
        modules: structuredModules
      },
      completedLessonIds
    });
  } catch (error) {
    console.error('Error fetching course classroom:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

