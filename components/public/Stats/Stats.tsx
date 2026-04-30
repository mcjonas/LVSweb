import styles from './Stats.module.css';

const STATS = [
  { num: '500+', label: 'Couples Served' },
  { num: '6', label: 'Expert Counselors' },
  { num: '100%', label: 'Online & Private' },
  { num: '5★', label: 'Client Satisfaction' },
];

export default function Stats() {
  return (
    <div className={styles.stats}>
      {STATS.map(s => (
        <div key={s.label}>
          <div className={styles.num}>{s.num}</div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
