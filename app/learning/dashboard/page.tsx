'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';

export default function LearningDashboard() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    // Decode name from JWT payload (no library needed — just base64)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.name) setStudentName(payload.name.split(' ')[0]);
    } catch {}

    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/learning/student/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setCourses(data.courses);
        } else {
          if (res.status === 401) {
            localStorage.removeItem('lvs_learning_token');
            window.location.href = '/learning/login';
          }
          setError(data.error || 'Failed to load courses');
        }
      } catch {
        setError('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lvs_learning_token');
    window.location.href = '/learning/login';
  };

  if (loading) return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #ccc', borderTop: '3px solid var(--rose)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, padding: 'clamp(1.5rem, 4vw, 4rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: 'var(--deep)', marginBottom: '0.3rem', fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
              {studentName ? `Welcome back, ${studentName}!` : 'My Learning Dashboard'}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Here are your enrolled courses.</p>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'white', border: '1px solid #ddd', color: 'var(--muted)', padding: '0.5rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            Log Out
          </button>
        </div>

        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>{error}</div>}

        {courses.length === 0 ? (
          <div style={{ background: '#fff', padding: 'clamp(2rem, 6vw, 3rem)', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
            <h2 style={{ color: 'var(--rose)', marginBottom: '1rem' }}>No active courses yet</h2>
            <p style={{ color: 'var(--muted)', maxWidth: '500px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
              When you enroll in a self-paced course, it will appear here along with your progress tracking and video lessons.
            </p>
            <a href="/learning/courses" style={{ background: 'var(--deep)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
              Browse Courses
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
            {courses.map((course, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid rgba(123,63,160,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--deep), var(--rose))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: '3rem' }}>
                  🎓
                </div>
                <div style={{ padding: '1.2rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'var(--rose)', color: 'white', fontSize: '0.65rem', padding: '0.25rem 0.6rem', borderRadius: '4px', display: 'inline-block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'flex-start' }}>
                    Active
                  </div>
                  <h3 style={{ color: 'var(--deep)', marginBottom: '0.5rem', fontSize: '1.05rem', lineHeight: '1.4' }}>{course.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                    {course.description || 'Your premium self-paced learning material.'}
                  </p>

                  {/* Progress */}
                  <div style={{ marginBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      <span>Lessons accessed</span>
                      <span style={{ fontWeight: 'bold', color: course.progressPercentage > 0 ? 'var(--rose)' : 'var(--muted)' }}>{course.progressPercentage || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${course.progressPercentage || 0}%`, height: '100%', background: 'var(--gold)', borderRadius: '3px', transition: 'width 0.5s ease-in-out' }} />
                    </div>
                  </div>

                  <a href={`/learning/course/${course.id}`} style={{ display: 'block', textAlign: 'center', background: 'var(--rose)', color: 'white', padding: '0.75rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', transition: 'background 0.3s' }}>
                    {course.progressPercentage > 0 ? '▶ Continue Learning' : '▶ Start Course'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
