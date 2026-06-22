'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { updateCourse, deleteCourse, getCourseById } from '@/lib/actions';
import Link from 'next/link';
import ConfirmModal from '@/components/dashboard/ConfirmModal/ConfirmModal';
import styles from '../courses.module.css';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function load() {
      const found = await getCourseById(id);
      if (found) {
        setCourse(found);
      }
      setFetching(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const fd = new FormData(e.currentTarget);
    const result = await updateCourse(id, {
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
      alert(`Failed to update course: ${result.error || 'Please try again.'}`);
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    const result = await deleteCourse(id);
    if (result.success) {
      window.location.href = '/dashboard/courses';
    } else {
      alert('Failed to delete course.');
      setLoading(false);
      setShowDeleteModal(false);
    }
  }

  if (fetching) return <div className={styles.container}><p>Loading...</p></div>;
  if (!course) return <div className={styles.container}><p>Course not found.</p></div>;

  return (
    <div className={styles.container}>
      <ConfirmModal 
        isOpen={showDeleteModal}
        title="Delete Course"
        message={`Are you sure you want to delete "${course.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        loading={loading}
      />

      <div className={styles.header}>
        <div>
          <h1>Edit Course</h1>
          <p>Update the details for "{course.title}"</p>
        </div>
        <Link href="/dashboard/courses" className={styles.backLink}>← Back to List</Link>
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Course Title</label>
            <input name="title" type="text" defaultValue={course.title} required />
          </div>

          <div className={styles.field}>
            <label>Full Description / Language Text</label>
            <textarea name="description" defaultValue={course.description} required rows={5} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Duration</label>
              <input name="duration" type="text" defaultValue={course.duration || ''} />
            </div>
            <div className={styles.field}>
              <label>Match Keywords (comma-separated, e.g. PMC, Pre-Marital)</label>
              <input name="matchKeywords" type="text" defaultValue={course.matchKeywords || ''} placeholder="e.g. PMC, Pre-Marital" />
            </div>
          </div>

          <div className={styles.pricingSection}>
            <h3>Single Pricing</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Price (GHS)</label>
                <input name="priceSingleGHS" type="number" defaultValue={course.priceSingleGHS || 0} />
              </div>
              <div className={styles.field}>
                <label>Price (USD)</label>
                <input name="priceSingleUSD" type="number" defaultValue={course.priceSingleUSD || 0} />
              </div>
            </div>
          </div>

          <div className={styles.pricingSection}>
            <h3>Couple Pricing</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Price (GHS)</label>
                <input name="priceCoupleGHS" type="number" defaultValue={course.priceCoupleGHS || 0} />
              </div>
              <div className={styles.field}>
                <label>Price (USD)</label>
                <input name="priceCoupleUSD" type="number" defaultValue={course.priceCoupleUSD || 0} />
              </div>
            </div>
          </div>

          <div className={styles.footerActions}>
            <button type="button" onClick={() => setShowDeleteModal(true)} disabled={loading} className={styles.deleteBtn}>
              Delete Course
            </button>
            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
