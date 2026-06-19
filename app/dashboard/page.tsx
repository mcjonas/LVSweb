export const dynamic = 'force-dynamic';

import { getStats, getEnquiries, getBookings } from '@/lib/actions';
import styles from './overview.module.css';

export default async function DashboardPage() {
  const stats = await getStats();
  const recentEnquiries = (await getEnquiries()).slice(0, 5);
  const recentBookings = (await getBookings()).slice(0, 5);

  const STAT_CARDS = [
    { label: 'Total Enquiries', value: stats.totalEnquiries, icon: '📬', color: '#7B3FA0' },
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: '📅', color: '#D4AF37' },
    { label: 'Courses Offered', value: stats.totalCourses, icon: '📚', color: '#3d9e7e' },
    { label: 'Testimonials', value: stats.totalTestimonials, icon: '💬', color: '#e07b54' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dashboard Overview</h1>
        <p>Manage your courses, enquiries, and student bookings from one place.</p>
      </div>

      <div className={styles.cards}>
        {STAT_CARDS.map(c => (
          <div key={c.label} className={styles.card} style={{ '--accent-color': c.color } as any}>
            <div className={styles.cardIcon}>{c.icon}</div>
            <div className={styles.cardValue}>{c.value}</div>
            <div className={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.recentSection}>
        <div className={styles.recentBox}>
          <h2>Recent Enquiries</h2>
          {recentEnquiries.length > 0 ? (
            <div className={styles.list}>
              {recentEnquiries.map(e => (
                <div key={e.id} className={styles.listItem}>
                  <div>
                    <strong>{e.firstName} {e.lastName}</strong>
                    <p>{e.program || 'General Enquiry'}</p>
                  </div>
                  <span className={styles.time}>{new Date(e.createdAt!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No recent enquiries found.
            </div>
          )}
        </div>

        <div className={styles.recentBox}>
          <h2>Booking Queue</h2>
          {recentBookings.length > 0 ? (
            <div className={styles.list}>
               {recentBookings.map(b => (
                <div key={b.id} className={styles.listItem}>
                  <div>
                    <strong>{b.name}</strong>
                    <p>{b.course || 'Consultation'}</p>
                  </div>
                  <span className={styles.time}>{new Date(b.createdAt!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No recent bookings found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
