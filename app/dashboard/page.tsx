import styles from './overview.module.css';

const STAT_CARDS = [
  { label: 'Total Enquiries', value: '—', icon: '📬', color: '#7B3FA0' },
  { label: 'New (Unread)', value: '—', icon: '🔔', color: '#D4AF37' },
  { label: 'Courses Offered', value: '6', icon: '📚', color: '#3d9e7e' },
  { label: 'Testimonials', value: '—', icon: '💬', color: '#e07b54' },
];

export default function DashboardPage() {
  return (
    <div>
      <div className={styles.header}>
        <h1>Overview</h1>
        <p>Welcome back to the Love Vibe Studios admin dashboard.</p>
      </div>

      <div className={styles.cards}>
        {STAT_CARDS.map(c => (
          <div key={c.label} className={styles.card} style={{ borderTopColor: c.color }}>
            <div className={styles.cardIcon}>{c.icon}</div>
            <div className={styles.cardValue}>{c.value}</div>
            <div className={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <h2>🚀 Getting Started</h2>
        <p>Your dashboard is set up and ready. To enable live data:</p>
        <ol>
          <li>Create a <strong>Neon Postgres</strong> database at <a href="https://neon.tech" target="_blank" rel="noreferrer">neon.tech</a></li>
          <li>Copy your <strong>connection string</strong> and paste it into <code>.env.local</code> as <code>DATABASE_URL</code></li>
          <li>Run <code>npm run db:push</code> to create the tables</li>
          <li>Update your <code>DASHBOARD_PASSWORD</code> in <code>.env.local</code></li>
        </ol>
      </div>
    </div>
  );
}
