'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import './dashboard.css';

export default function LearningDashboard() {
  const [loading, setLoading]     = useState(true);
  const [courses, setCourses]     = useState<any[]>([]);
  const [error, setError]         = useState('');
  const [studentName, setStudentName] = useState('');
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);

    const token = localStorage.getItem('lvs_learning_token');
    if (!token) {
      window.location.href = '/learning/login';
      return;
    }

    // Decode first name from JWT payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.name) setStudentName(payload.name.split(' ')[0]);
    } catch {}

    const fetchCourses = async () => {
      try {
        const res  = await fetch('/api/learning/student/courses', {
          headers: { Authorization: `Bearer ${token}` },
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

  /* ─── Loading ─────────────────────────────────────────────────────── */
  if (!mounted || loading) return (
    <div className="dashRoot">
      <Navbar />
      <div className="spinnerWrap">
        <div className="spinner" />
      </div>
    </div>
  );

  /* ─── Main UI ─────────────────────────────────────────────────────── */
  return (
    <div className="dashRoot">
      <Navbar />

      <main className="dashMain">

        {/* ── Header ── */}
        <div className="dashHeader">
          <div className="dashHeaderText">
            <h1 className="dashTitle">
              {studentName ? `Welcome back, ${studentName}!` : 'My Learning Dashboard'}
            </h1>
            <p className="dashSubtitle">Here are your enrolled courses.</p>
          </div>
          <button className="logoutBtn" onClick={handleLogout}>
            Log Out
          </button>
        </div>

        {/* ── Error Banner ── */}
        {error && <div className="errorBanner">{error}</div>}

        {/* ── Empty State ── */}
        {courses.length === 0 ? (
          <div className="emptyState">
            <span className="emptyIcon">🎓</span>
            <h2 className="emptyTitle">No active courses yet</h2>
            <p className="emptyText">
              When you enroll in a self-paced course, it will appear here along
              with your progress tracking and video lessons.
            </p>
            <a href="/learning/courses" className="browseBtn">Browse Courses</a>
          </div>
        ) : (

          /* ── Courses Grid ── */
          <div className="coursesGrid">
            {courses.map((course, i) => (
              <div key={i} className="courseCard">

                {/* Gradient thumbnail */}
                <div className="courseThumbnail">🎓</div>

                {/* Card body */}
                <div className="courseBody">
                  <span className="courseBadge">Active</span>

                  <h3 className="courseTitle">{course.title}</h3>

                  <p className="courseDesc">
                    {course.description || 'Your premium self-paced learning material.'}
                  </p>

                  {/* Progress */}
                  <div className="progressWrap">
                    <div className="progressMeta">
                      <span>Lessons accessed</span>
                      <span
                        className="progressPct"
                        style={{ color: (course.progressPercentage || 0) > 0 ? 'var(--rose)' : 'var(--muted)' }}
                      >
                        {course.progressPercentage || 0}%
                      </span>
                    </div>
                    <div className="progressTrack">
                      <div
                        className="progressFill"
                        style={{ width: `${course.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  <a href={`/learning/course/${course.id}`} className="courseBtn">
                    {(course.progressPercentage || 0) > 0 ? '▶ Continue Learning' : '▶ Start Course'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
