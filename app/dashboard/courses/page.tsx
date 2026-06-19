export const dynamic = 'force-dynamic';

import { getCourses } from '@/lib/actions';
import Link from 'next/link';
import styles from './courses.module.css';

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Course Management</h1>
          <p>Add, edit, or remove courses from your website.</p>
        </div>
        <Link href="/dashboard/courses/new" className={styles.btn}>
          + Add New Course
        </Link>
      </div>

      <div className={styles.grid}>
        {courses.length > 0 ? (
          courses.map(c => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardContent}>
                <h3>{c.title}</h3>
                <p>{c.description.substring(0, 100)}...</p>
                <div className={styles.meta}>
                  <span>🕒 {c.duration || 'Flexible'}</span>
                  <span>💰 GHS {c.priceSingleGHS || '0'} / ${c.priceSingleUSD || '0'}</span>
                </div>
              </div>
              <div className={styles.actions}>
                <Link href={`/dashboard/courses/${c.id}`} className={styles.editBtn}>Edit</Link>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <p>No courses added yet. Click the button above to create your first course.</p>
          </div>
        )}
      </div>
    </div>
  );
}
