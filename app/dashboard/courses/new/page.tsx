'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCourse } from '@/lib/actions';
import Link from 'next/link';
import styles from '../courses.module.css';

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const fd = new FormData(e.currentTarget);
    const result = await addCourse({
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      duration: fd.get('duration') as string,
      priceSingleGHS: parseInt(fd.get('priceSingleGHS') as string) || 0,
      priceSingleUSD: parseInt(fd.get('priceSingleUSD') as string) || 0,
      priceCoupleGHS: parseInt(fd.get('priceCoupleGHS') as string) || 0,
      priceCoupleUSD: parseInt(fd.get('priceCoupleUSD') as string) || 0,
      matchKeywords: fd.get('matchKeywords') as string,
    });

    if (result.success) {
      window.location.href = '/dashboard/courses';
    } else {
      alert('Failed to add course. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Add New Course</h1>
          <p>Create a new course to display on your website.</p>
        </div>
        <Link href="/dashboard/courses" className={styles.backLink}>← Back to List</Link>
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Course Title</label>
            <input name="title" type="text" placeholder="e.g. Pre-Marital Preparation" required />
          </div>

          <div className={styles.field}>
            <label>Full Description / Language Text</label>
            <textarea name="description" placeholder="Describe the course..." required rows={5} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Duration</label>
              <input name="duration" type="text" placeholder="e.g. 3 Months" />
            </div>
            <div className={styles.field}>
              <label>Match Keywords (comma-separated, e.g. PMC, Pre-Marital)</label>
              <input name="matchKeywords" type="text" placeholder="e.g. PMC, Pre-Marital" />
            </div>
          </div>

          <div className={styles.pricingSection}>
            <h3>Single Pricing</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Price (GHS)</label>
                <input name="priceSingleGHS" type="number" placeholder="0" />
              </div>
              <div className={styles.field}>
                <label>Price (USD)</label>
                <input name="priceSingleUSD" type="number" placeholder="0" />
              </div>
            </div>
          </div>

          <div className={styles.pricingSection}>
            <h3>Couple Pricing</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Price (GHS)</label>
                <input name="priceCoupleGHS" type="number" placeholder="0" />
              </div>
              <div className={styles.field}>
                <label>Price (USD)</label>
                <input name="priceCoupleUSD" type="number" placeholder="0" />
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
