'use client';

import { useRouter } from 'next/navigation';
import styles from './Topbar.module.css';

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.title}>Love Vibe Studios Dashboard</div>
      <button onClick={handleLogout} className={styles.logout}>Sign Out</button>
    </header>
  );
}
