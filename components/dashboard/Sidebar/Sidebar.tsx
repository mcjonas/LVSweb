'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/enquiries', label: 'Enquiries', icon: '📬' },
  { href: '/dashboard/bookings', label: 'Bookings', icon: '📅' },
  { href: '/dashboard/courses', label: 'Courses', icon: '📚' },
  { href: '/dashboard/testimonials', label: 'Testimonials', icon: '💬' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        Love <span>Vibe</span>
        <small>Admin</small>
      </div>

      <nav className={styles.nav}>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`${styles.link} ${path === n.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className={styles.footer}>
        <Link href="/" className={styles.siteLink}>← View Site</Link>
      </div>
    </aside>
  );
}
