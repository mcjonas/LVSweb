import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses, modules, lessons, enrollments, videos, progress } from '@/lib/schema';
import { eq, asc, and, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { getVideoUrl } from '@/lib/cloudinary';

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
    const course = courseRecord.length > 0 ? courseRecord[0] : { title: 'Self-Paced Course' };

    // Fetch Modules
    let courseModules = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex));

    // Auto-seed if completely empty
    if (courseModules.length === 0) {
      const newModule = await db.insert(modules).values({
        courseId,
        title: 'Module 1: Introduction to the Course',
        orderIndex: 0
      }).returning();
      courseModules = newModule;

      const uploadedVideos = await db.select().from(videos).where(eq(videos.courseId, courseId)).limit(3);

      for (let i = 0; i < uploadedVideos.length; i++) {
        await db.insert(lessons).values({
          moduleId: newModule[0].id,
          title: uploadedVideos[i].title,
          description: 'Watch this session to begin your journey.',
          cloudinaryPublicId: uploadedVideos[i].cloudinaryPublicId,
          zoomId: uploadedVideos[i].zoomId,
          orderIndex: i,
          durationMinutes: 45
        });
      }

      if (uploadedVideos.length === 0) {
        await db.insert(lessons).values({
          moduleId: newModule[0].id,
          title: 'Welcome Session',
          description: 'This is a placeholder lesson until the Admin uploads real videos.',
          orderIndex: 0,
          durationMinutes: 5
        });
      }
    }

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
      
      const videoMap = new Map(relatedVideos.map(v => [v.zoomId, v.downloadUrl]));

      // Resolve video URLs for lessons
      const lessonsWithUrls = modLessons.map(lesson => {
        let videoUrl = null;
        if (lesson.cloudinaryPublicId) {
          videoUrl = getVideoUrl(lesson.cloudinaryPublicId);
        } else if (lesson.zoomId) {
          videoUrl = videoMap.get(lesson.zoomId) || null;
        }

        return {
          ...lesson,
          videoUrl
        };
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
