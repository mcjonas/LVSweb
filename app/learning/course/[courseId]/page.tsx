'use client';

import { useEffect, useState, use } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import Link from 'next/link';

export default function CourseClassroom({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [error, setError] = useState('');
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    const fetchCourseData = async () => {
      try {
        const res = await fetch(`/api/learning/course/${resolvedParams.courseId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          setCourse(data.course);
          setCompletedLessons(data.completedLessonIds || []);
          // Set first lesson as active by default
          if (data.course.modules && data.course.modules.length > 0) {
            const firstMod = data.course.modules[0];
            if (firstMod.lessons && firstMod.lessons.length > 0) {
              setActiveLesson(firstMod.lessons[0]);
            }
          }
        } else {
          setError(data.error || 'Failed to load classroom');
        }
      } catch (err) {
        setError('Error loading classroom');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [resolvedParams.courseId]);

  const handleMarkCompleted = async () => {
    if (!activeLesson) return;
    setMarking(true);
    try {
      const token = localStorage.getItem('lvs_learning_token');
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lessonId: activeLesson.id })
      });
      const data = await res.json();
      if (data.success) {
        if (!completedLessons.includes(activeLesson.id)) {
          setCompletedLessons([...completedLessons, activeLesson.id]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #ccc', borderTop: '3px solid var(--rose)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      {/* Course Header */}
      <div style={{ background: 'var(--deep)', color: 'white', padding: '2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/learning/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '1.2rem' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{course.title}</h1>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'flex-start' }}>
        
        {/* Main Content Area (Video Player) */}
        <div style={{ flex: '1 1 70%', minWidth: 0 }}>
          {activeLesson ? (
            <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              {activeLesson.videoUrl ? (
                <video 
                  src={activeLesson.videoUrl} 
                  controls 
                  autoPlay
                  controlsList="nodownload"
                  style={{ width: '100%', aspectRatio: '16/9', display: 'block', background: '#000' }} 
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'var(--muted)' }}>
                  Video content is being processed. Check back later.
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#fff', padding: '4rem', borderRadius: '12px', textAlign: 'center', color: 'var(--muted)' }}>
              Select a lesson from the sidebar to begin.
            </div>
          )}

          {activeLesson && (
            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', marginTop: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h2 style={{ color: 'var(--deep)', marginBottom: '1rem' }}>{activeLesson.title}</h2>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
                {activeLesson.description || 'No description available for this lesson.'}
              </p>
              
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>⏱ {activeLesson.durationMinutes} minutes</span>
                <button 
                  style={{ 
                    background: completedLessons.includes(activeLesson.id) ? '#4caf50' : 'var(--rose)', 
                    color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '50px', 
                    fontWeight: 'bold', cursor: marking ? 'not-allowed' : 'pointer',
                    opacity: marking ? 0.7 : 1
                  }}
                  onClick={handleMarkCompleted}
                  disabled={marking}
                >
                  {marking ? 'Marking...' : completedLessons.includes(activeLesson.id) ? '✅ Completed' : 'Mark as Completed'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (Modules & Lessons) */}
        <div style={{ flex: '0 0 350px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden', position: 'sticky', top: '2rem' }}>
          <div style={{ padding: '1.5rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
            <h3 style={{ color: 'var(--deep)', margin: 0 }}>Course Content</h3>
          </div>
          
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {course.modules && course.modules.map((mod: any, modIdx: number) => (
              <div key={modIdx} style={{ borderBottom: '1px solid #eee' }}>
                <div style={{ padding: '1rem 1.5rem', background: '#fff', fontWeight: 'bold', color: 'var(--deep)', cursor: 'pointer' }}>
                  {mod.title}
                </div>
                
                <div style={{ background: '#fafafa' }}>
                  {mod.lessons && mod.lessons.map((lesson: any, lesIdx: number) => {
                    const isActive = activeLesson?.id === lesson.id;
                    return (
                      <div 
                        key={lesIdx} 
                        onClick={() => setActiveLesson(lesson)}
                        style={{ 
                          padding: '1rem 1.5rem 1rem 3rem', 
                          cursor: 'pointer', 
                          borderLeft: isActive ? '4px solid var(--rose)' : '4px solid transparent',
                          background: isActive ? '#f9f3fc' : 'transparent',
                          color: isActive ? 'var(--rose)' : 'var(--muted)',
                          transition: 'all 0.2s',
                          fontSize: '0.95rem'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>
                            {completedLessons.includes(lesson.id) ? '✅' : isActive ? '▶' : '📺'}
                          </span>
                          <div>
                            <div style={{ fontWeight: isActive ? 'bold' : 'normal', marginBottom: '0.2rem' }}>
                              {lesson.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                              {lesson.durationMinutes} min
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {(!course.modules || course.modules.length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                No modules available yet.
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
