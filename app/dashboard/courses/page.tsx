import styles from './courses.module.css';

const COURSES = [
  { num: '01', title: 'Pre-Marital Counselling', duration: '3 Months', fees: [{ type: 'Couple', ghs: 'GHS 1,500', usd: '$137' }] },
  { num: '02', title: 'Post-Marital Counselling', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,200', usd: '$109' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$181' }] },
  { num: '03', title: 'Sex in Marriage', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }], featured: true },
  { num: '04', title: 'Legal Advice on Marriage & Divorce', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '05', title: 'Crisis Management in Marriage', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,300', usd: '$118' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '06', title: 'Thriving Beyond Divorce', duration: '3 Months', fees: [{ type: 'Fee', ghs: 'GHS 2,000', usd: '$182' }] },
];

export default function CoursesPage() {
  return (
    <div>
      <div className={styles.header}>
        <h1>Courses</h1>
        <p>Manage course listings, pricing, and enrolment details.</p>
      </div>
      <div className={styles.grid}>
        {COURSES.map(c => (
          <div key={c.num} className={`${styles.card} ${c.featured ? styles.featured : ''}`}>
            {c.featured && <span className={styles.badge}>Popular</span>}
            <div className={styles.num}>{c.num}</div>
            <h3>{c.title}</h3>
            <p className={styles.duration}>⏱ {c.duration}</p>
            <div className={styles.fees}>
              {c.fees.map(f => (
                <div key={f.type} className={styles.feeRow}>
                  <span className={styles.feeType}>{f.type}</span>
                  <span className={styles.feeAmt}>{f.ghs} <span>/ {f.usd}</span></span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
