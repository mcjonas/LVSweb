'use client';

import { useState, useEffect } from 'react';
import styles from './Stats.module.css';
import { useCountUp } from '../../../hooks/useCountUp';

const STATS = [
  { num: 500, suffix: '+', label: 'Couples Served' },
  { num: 6, suffix: '', label: 'Expert Counselors' },
  { num: 100, suffix: '%', label: 'Online & Private' },
  { num: 5, suffix: '★', label: 'Client Satisfaction' },
];

function StatItem({ stat }: { stat: typeof STATS[0] }) {
  const count = useCountUp(stat.num, 2500);
  return (
    <div>
      <div className={styles.num}>{count}{stat.suffix}</div>
      <div className={styles.label}>{stat.label}</div>
    </div>
  );
}

export default function Stats() {
  return (
    <div className={styles.stats}>
      {STATS.map(s => (
        <StatItem key={s.label} stat={s} />
      ))}
    </div>
  );
}
