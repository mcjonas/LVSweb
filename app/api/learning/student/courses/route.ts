import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrollments, courses, modules, lessons, progress } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  try {
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

    // Fetch user's active enrollments
    const userEnrollments = await db.select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));

    // Get course details for each enrollment
    const activeCourses = [];
    for (const enrollment of userEnrollments) {
      if (enrollment.status === 'active') {
        const courseRecord = await db.select()
          .from(courses)
          .where(eq(courses.id, enrollment.courseId))
          .limit(1);
          
        let baseCourseData = {};
        if (courseRecord.length > 0) {
          baseCourseData = courseRecord[0];
        } else {
          baseCourseData = {
            id: enrollment.courseId,
            title: 'Enrolled Course',
            description: 'Your premium self-paced learning material.',
            duration: 'Flexible'
          };
        }

        // Calculate Progress
        let totalLessonsCount = 0;
        let completedLessonsCount = 0;

        const courseModules = await db.select().from(modules).where(eq(modules.courseId, enrollment.courseId));
        
        for (const mod of courseModules) {
           const modLessons = await db.select().from(lessons).where(eq(lessons.moduleId, mod.id));
           totalLessonsCount += modLessons.length;

           for (const lesson of modLessons) {
              const prog = await db.select()
                .from(progress)
                .where(and(eq(progress.userId, userId), eq(progress.lessonId, lesson.id), eq(progress.completed, 1)))
                .limit(1);
              if (prog.length > 0) {
                 completedLessonsCount++;
              }
           }
        }
        
        let progressPercentage = 0;
        if (totalLessonsCount > 0) {
           progressPercentage = Math.round((completedLessonsCount / totalLessonsCount) * 100);
        }

        activeCourses.push({
          ...baseCourseData,
          progressPercentage
        });
      }
    }

    return NextResponse.json({ success: true, courses: activeCourses });
  } catch (error) {
    console.error('Error fetching student courses:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
