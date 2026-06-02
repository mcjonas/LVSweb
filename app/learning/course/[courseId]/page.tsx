'use client';

import { useEffect, useState, use, useRef, useCallback } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import Link from 'next/link';
import './classroom.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface ZoomRecording {
  id:              number;
  title:           string;
  durationMinutes: number;
  playUrl:         string;
  synchronizedAt:  string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CourseClassroom({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [error, setError] = useState('');
  const [accessedLessons, setAccessedLessons] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── P1: Zoom recordings fetched from /api/recordings/course/[courseId] ──
  const [recordings, setRecordings] = useState<ZoomRecording[]>([]);
  const [activeRecording, setActiveRecording] = useState<ZoomRecording | null>(null);
  const [recordingsTab, setRecordingsTab] = useState(false); // false=lessons, true=recordings

  const postedIds = useRef<Set<number>>(new Set());

  // ── Select a course lesson and track progress ─────────────────────────────
  const selectLesson = useCallback(async (lesson: any) => {
    setActiveLesson(lesson);
    setActiveRecording(null);
    setRecordingsTab(false);
    setSidebarOpen(false);

    if (postedIds.current.has(lesson.id)) return;
    postedIds.current.add(lesson.id);
    setAccessedLessons(prev => Array.from(new Set([...prev, lesson.id])));

    const token = localStorage.getItem('lvs_learning_token');
    if (!token) return;
    try {
      await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
    } catch { /* non-critical */ }
  }, []);

  // ── Select a Zoom recording ───────────────────────────────────────────────
  const selectRecording = useCallback((rec: ZoomRecording) => {
    setActiveRecording(rec);
    setActiveLesson(null);
    setSidebarOpen(false);
  }, []);

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    const courseId = resolvedParams.courseId;

    const fetchAll = async () => {
      try {
        // Fetch course structure (modules + lessons) in parallel with recordings
        const [courseRes, recRes] = await Promise.all([
          fetch(`/api/learning/course/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/recordings/course/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const courseData = await courseRes.json();
        const recData = await recRes.json();

        if (courseRes.ok && courseData.success) {
          setCourse(courseData.course);
          const prevAccessed: number[] = courseData.completedLessonIds || [];
          setAccessedLessons(prevAccessed);
          prevAccessed.forEach(id => postedIds.current.add(id));

          // Auto-select first available item:
          // Prefer first Zoom recording if available, otherwise first lesson
          if (recData.success && recData.recordings?.length > 0) {
            setRecordings(recData.recordings);
            setActiveRecording(recData.recordings[0]);
            setRecordingsTab(true);
          } else {
            const firstLesson = courseData.course.modules?.[0]?.lessons?.[0];
            if (firstLesson) {
              setActiveLesson(firstLesson);
              if (!postedIds.current.has(firstLesson.id)) {
                postedIds.current.add(firstLesson.id);
                setAccessedLessons(prev => Array.from(new Set([...prev, firstLesson.id])));
                fetch('/api/learning/progress', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ lessonId: firstLesson.id }),
                }).catch(() => {});
              }
            }
          }
        } else {
          setError(courseData.error || 'Failed to load classroom');
        }

        // Populate recordings even if course fetch was the primary
        if (recData.success && recData.recordings?.length > 0) {
          setRecordings(recData.recordings);
        }

      } catch {
        setError('Error loading classroom');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [resolvedParams.courseId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const totalLessons = course?.modules?.reduce(
    (acc: number, m: any) => acc + (m.lessons?.length || 0), 0,
  ) || 0;
  const progressPct = totalLessons > 0
    ? Math.round((accessedLessons.length / totalLessons) * 100)
    : 0;

  const activeItem = activeRecording || activeLesson;

  /* ─── Loading ─────────────────────────────────────────────────────────── */
  if (!mounted || loading) return (
    <div className="classroomRoot">
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </div>
  );

  /* ─── Error ───────────────────────────────────────────────────────────── */
  if (error || !course) return (
    <div className="classroomRoot">
      <Navbar />
      <div style={{ flex: 1, padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#c62828' }}>{error || 'Course not found'}</h2>
        <Link href="/learning/dashboard" style={{
          display: 'inline-block', marginTop: '2rem', background: 'var(--deep)',
          color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none',
        }}>
          Back to Dashboard
        </Link>
      </div>
      <Footer />
    </div>
  );

  /* ─── Main UI ─────────────────────────────────────────────────────────── */
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
              📋 Content
            </button>
          </div>

          {/* Progress (lesson-based) */}
          {totalLessons > 0 && (
            <div className="progressBar">
              <div className="progressLabel">
                <span>{accessedLessons.length} of {totalLessons} lessons accessed</span>
                <span>{progressPct}%</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlay (mobile) ── */}
      <div
        className={`overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Body ── */}
      <div className="classroomBody">

        {/* ── Video Panel ── */}
        <div className="videoPanel">
          {activeRecording ? (
            /* ── Zoom Cloud Recording (P1) ── */
            <>
              <div className="videoWrapper">
                <iframe
                  key={activeRecording.id}
                  src={activeRecording.playUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={activeRecording.title}
                />
              </div>
              <div className="lessonInfo">
                <div className="lessonInfoRow">
                  <div>
                    <h2 className="lessonInfoTitle">{activeRecording.title}</h2>
                    <p className="lessonDescription" style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      Zoom Cloud Recording · {activeRecording.durationMinutes > 0 ? `${activeRecording.durationMinutes} min` : 'Duration not set'}
                    </p>
                  </div>
                  <div className="lessonBadge">
                    <span className="badgeAccessed">🎥 Zoom Recording</span>
                  </div>
                </div>
              </div>
            </>
          ) : activeLesson ? (
            /* ── Legacy lesson video ── */
            <>
              <div className="videoWrapper">
                {activeLesson.videoUrl ? (
                  activeLesson.videoUrl.includes('zoom.us') ? (
                    <iframe
                      key={activeLesson.id}
                      src={activeLesson.videoUrl}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title={activeLesson.title}
                    />
                  ) : (
                    <video
                      key={activeLesson.id}
                      src={activeLesson.videoUrl}
                      controls
                      controlsList="nodownload"
                      onContextMenu={e => e.preventDefault()}
                    />
                  )
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
              Select a recording or lesson from the list to start watching.
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebarHeader">
            <h3>Course Content</h3>
            {recordings.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setRecordingsTab(false)}
                  style={{
                    flex: 1, padding: '0.35rem', borderRadius: '6px', border: 'none',
                    background: !recordingsTab ? 'var(--deep)' : '#eee',
                    color: !recordingsTab ? 'white' : '#333',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  📚 Lessons ({totalLessons})
                </button>
                <button
                  onClick={() => setRecordingsTab(true)}
                  style={{
                    flex: 1, padding: '0.35rem', borderRadius: '6px', border: 'none',
                    background: recordingsTab ? 'var(--deep)' : '#eee',
                    color: recordingsTab ? 'white' : '#333',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  🎥 Recordings ({recordings.length})
                </button>
              </div>
            )}
          </div>

          <div className="sidebarScroll">

            {/* ── Recordings Tab ── */}
            {recordingsTab && recordings.length > 0 ? (
              <div className="moduleGroup">
                <div className="moduleTitle">Zoom Cloud Recordings</div>
                {recordings.map((rec, idx) => {
                  const isActive = activeRecording?.id === rec.id;
                  return (
                    <div
                      key={rec.id}
                      className={`lessonItem${isActive ? ' active' : ''}`}
                      onClick={() => selectRecording(rec)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && selectRecording(rec)}
                    >
                      <span className="lessonIcon">{isActive ? '▶' : '🎥'}</span>
                      <div>
                        <div className="lessonItemTitle">
                          {rec.title || `Recording ${idx + 1}`}
                        </div>
                        <div className="lessonItemDuration">
                          {rec.durationMinutes > 0 ? `${rec.durationMinutes} min` : 'Zoom Session'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (

              /* ── Lessons Tab (or no recordings yet) ── */
              <>
                {recordings.length === 0 && (
                  <div style={{
                    padding: '1rem', background: '#fff8e1', borderRadius: '8px',
                    margin: '0.75rem', fontSize: '0.82rem', color: '#7b5800', lineHeight: 1.5,
                  }}>
                    <strong>🎬 Recordings</strong><br />
                    Your Zoom session recordings will appear here once they&apos;re processed — usually within 5 minutes of the session ending.
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
