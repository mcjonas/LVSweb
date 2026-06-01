'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import Link from 'next/link';
import './classroom.css';

export default function CourseClassroom({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [error, setError] = useState('');
  const [accessedLessons, setAccessedLessons] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tracks which lesson IDs have already been posted to /api/learning/progress
  const postedIds = useRef<Set<number>>(new Set());

  // Auto-track: called whenever a lesson is selected
  const selectLesson = useCallback(async (lesson: any) => {
    setActiveLesson(lesson);
    setSidebarOpen(false);

    // Already posted this session — skip
    if (postedIds.current.has(lesson.id)) return;

    postedIds.current.add(lesson.id);
    // Optimistically update UI
    setAccessedLessons(prev => Array.from(new Set([...prev, lesson.id])));

    const token = localStorage.getItem('lvs_learning_token');
    if (!token) return;

    try {
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      if (!res.ok) {
        console.warn('Progress tracking failed for lesson', lesson.id);
      }
    } catch (err) {
      console.warn('Progress tracking error:', err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    const fetchCourseData = async () => {
      try {
        const res = await fetch(`/api/learning/course/${resolvedParams.courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setCourse(data.course);

          const prevAccessed: number[] = data.completedLessonIds || [];
          setAccessedLessons(prevAccessed);
          // Seed postedIds so we don't re-post already-tracked lessons
          prevAccessed.forEach(id => postedIds.current.add(id));

          // Auto-select first lesson
          const firstLesson = data.course.modules?.[0]?.lessons?.[0];
          if (firstLesson) {
            // Set active without re-tracking if already tracked
            setActiveLesson(firstLesson);
            if (!postedIds.current.has(firstLesson.id)) {
              postedIds.current.add(firstLesson.id);
              setAccessedLessons(prev => Array.from(new Set([...prev, firstLesson.id])));
              fetch('/api/learning/progress', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ lessonId: firstLesson.id }),
              }).catch(() => {});
            }
          }
        } else {
          setError(data.error || 'Failed to load classroom');
        }
      } catch {
        setError('Error loading classroom');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [resolvedParams.courseId]);

  const totalLessons = course?.modules?.reduce(
    (acc: number, m: any) => acc + (m.lessons?.length || 0), 0
  ) || 0;
  const progressPct = totalLessons > 0
    ? Math.round((accessedLessons.length / totalLessons) * 100)
    : 0;

  /* ─── Loading ─── */
  if (!mounted || loading) return (
    <div className="classroomRoot">
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </div>
  );

  /* ─── Error ─── */
  if (error || !course) return (
    <div className="classroomRoot">
      <Navbar />
      <div style={{ flex: 1, padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#c62828' }}>{error || 'Course not found'}</h2>
        <Link href="/learning/dashboard" style={{ display: 'inline-block', marginTop: '2rem', background: 'var(--deep)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
      <Footer />
    </div>
  );

  /* ─── Main UI ─── */
  return (
    <div className="classroomRoot">
      <Navbar />

      {/* ── Header ── */}
      <div className="courseHeader">
        <div className="courseHeaderInner">
          <div className="courseHeaderRow">
            <Link href="/learning/dashboard" className="backLink">← Back</Link>
            <h1 className="courseTitle">{course.title}</h1>
            <button
              className="lessonToggleBtn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle lesson list"
            >
              📋 Lessons
            </button>
          </div>

          {/* Progress */}
          <div className="progressBar">
            <div className="progressLabel">
              <span>{accessedLessons.length} of {totalLessons} lessons accessed</span>
              <span>{progressPct}%</span>
            </div>
            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Overlay (mobile) ── */}
      <div
        className={`overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Body ── */}
      <div className="classroomBody">

        {/* Video Panel */}
        <div className="videoPanel">
          {activeLesson ? (
            <>
              <div className="videoWrapper">
                {activeLesson.videoUrl ? (
                  <video
                    key={activeLesson.id}
                    src={activeLesson.videoUrl}
                    controls
                    controlsList="nodownload"
                  />
                ) : (
                  <div className="videoPlaceholder">
                    <span>🎬</span>
                    <p>Video content is being processed. Check back soon.</p>
                  </div>
                )}
              </div>

              <div className="lessonInfo">
                <div className="lessonInfoRow">
                  <div>
                    <h2 className="lessonInfoTitle">{activeLesson.title}</h2>
                    <p className="lessonDescription">
                      {activeLesson.description || 'No description available for this lesson.'}
                    </p>
                  </div>
                  <div className="lessonBadge">
                    <span className={accessedLessons.includes(activeLesson.id) ? 'badgeAccessed' : 'badgeInProgress'}>
                      {accessedLessons.includes(activeLesson.id) ? '✓ Accessed' : '▶ In Progress'}
                    </span>
                    <span className="lessonDuration">⏱ {activeLesson.durationMinutes} min</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="emptyVideo">
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📺</span>
              Select a lesson from the list to start watching.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebarHeader">
            <h3>Course Content</h3>
            <p>{totalLessons} lesson{totalLessons !== 1 ? 's' : ''}</p>
          </div>

          <div className="sidebarScroll">
            {course.modules?.map((mod: any, modIdx: number) => (
              <div key={modIdx} className="moduleGroup">
                <div className="moduleTitle">{mod.title}</div>
                {mod.lessons?.map((lesson: any, lesIdx: number) => {
                  const isActive = activeLesson?.id === lesson.id;
                  const isAccessed = accessedLessons.includes(lesson.id);
                  return (
                    <div
                      key={lesIdx}
                      className={`lessonItem${isActive ? ' active' : ''}`}
                      onClick={() => selectLesson(lesson)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && selectLesson(lesson)}
                    >
                      <span className="lessonIcon">
                        {isAccessed ? '✅' : isActive ? '▶' : '📺'}
                      </span>
                      <div>
                        <div className="lessonItemTitle">{lesson.title}</div>
                        <div className="lessonItemDuration">{lesson.durationMinutes} min</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
