import { getTestimonials } from '@/lib/actions';
import styles from './testimonials.module.css';

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  let testimonials: Awaited<ReturnType<typeof getTestimonials>> = [];
  let dbError = false;

  try {
    testimonials = await getTestimonials();
  } catch {
    dbError = true;
  }

  const seeded = [
    { id: -1, name: '— Amara & Tunde', role: 'Pre-Marital Counseling', content: 'The pre-marital courses gave us a language to talk about things we\'d never even discussed.', status: 'approved', createdAt: null, stars: 5 },
    { id: -2, name: '— David & Mercy', role: 'Crisis Management', content: 'I didn\'t think we could come back from where we were. The crisis counseling saved our marriage.', status: 'approved', createdAt: null, stars: 5 },
    { id: -3, name: '— Chioma O.', role: 'Thriving Beyond Divorce', content: 'After my divorce, I felt lost. Love Vibe Studios helped me find myself again.', status: 'approved', createdAt: null, stars: 5 },
  ];

  const all = dbError ? seeded : (testimonials.length === 0 ? seeded : testimonials);

  return (
    <div>
      <div className={styles.header}>
        <h1>Testimonials</h1>
        <p>Manage client stories and reviews.</p>
      </div>
      {dbError && (
        <div className={styles.notice}>⚠️ Showing sample data — connect your database to manage real testimonials.</div>
      )}
      <div className={styles.grid}>
        {all.map(t => (
          <div key={t.id} className={styles.card}>
            <div className={styles.stars}>{'★'.repeat(t.stars ?? 5)}</div>
            <p>&ldquo;{t.content}&rdquo;</p>
            <div className={styles.meta}>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
            <span className={`${styles.badge} ${t.status === 'approved' ? styles.approved : styles.pending}`}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
