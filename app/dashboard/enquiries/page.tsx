import { getEnquiries } from '@/lib/actions';
import styles from './enquiries.module.css';

export const dynamic = 'force-dynamic';

export default async function EnquiriesPage() {
  let enquiries: Awaited<ReturnType<typeof getEnquiries>> = [];
  let dbError = false;

  try {
    enquiries = await getEnquiries();
  } catch {
    dbError = true;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1>Enquiries</h1>
        <p>All contact form submissions from the website.</p>
      </div>

      {dbError ? (
        <div className={styles.notice}>
          ⚠️ Database not connected yet. Add your <code>DATABASE_URL</code> to <code>.env.local</code> and run <code>npm run db:push</code>.
        </div>
      ) : enquiries.length === 0 ? (
        <div className={styles.empty}>No enquiries yet. They will appear here once visitors submit the contact form.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Program</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map(e => (
                <tr key={e.id}>
                  <td>{e.firstName} {e.lastName}</td>
                  <td>{e.email}</td>
                  <td>{e.program || '—'}</td>
                  <td><span className={`${styles.badge} ${e.status === 'new' ? styles.badgeNew : ''}`}>{e.status}</span></td>
                  <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
