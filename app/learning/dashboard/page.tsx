'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';

export default function LearningDashboard() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/learning/student/courses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
      } catch (err) {
        setError('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #ccc', borderTop: '3px solid var(--rose)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <div style={{ flex: 1, padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ color: 'var(--deep)', marginBottom: '1rem' }}>My Learning Dashboard</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '3rem' }}>Welcome! Here are your enrolled courses.</p>

        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>{error}</div>}

        {courses.length === 0 ? (
          <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--rose)', marginBottom: '1rem' }}>No active courses yet</h2>
            <p style={{ color: 'var(--muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
              When you enroll in a self-paced course, it will appear here along with your progress tracking and video lessons.
            </p>
            <a href="/learning/courses" style={{ background: 'var(--deep)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold' }}>
              Browse Courses
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {courses.map((course, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid rgba(123, 63, 160, 0.1)' }}>
                <div style={{ height: '160px', background: 'var(--deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: '3rem' }}>
                  🎓
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ background: 'var(--rose)', color: 'white', fontSize: '0.7rem', padding: '0.3rem 0.6rem', borderRadius: '4px', display: 'inline-block', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Enrolled
                  </div>
                  <h3 style={{ color: 'var(--deep)', marginBottom: '0.5rem', fontSize: '1.2rem', lineHeight: '1.4' }}>{course.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description}
                  </p>
                  
                  {/* Real Progress bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      <span>Progress</span>
                      <span>{course.progressPercentage || 0}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${course.progressPercentage || 0}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.5s ease-in-out' }}></div>
                    </div>
                  </div>

                  <a href={`/learning/course/${course.id}`} style={{ display: 'block', textAlign: 'center', background: 'var(--rose)', color: 'white', padding: '0.8rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', width: '100%', transition: 'background 0.3s' }}>
                    Enter Course Classroom
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
