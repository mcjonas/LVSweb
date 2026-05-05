'use client';

import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        Love <span>Vibe</span> Studio
      </Link>
      <ul className={styles.links}>
        <li><Link href="/#services">Services</Link></li>
        <li><Link href="/#how">How It Works</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
        <li><Link href="/#testimonials">Stories</Link></li>
      </ul>
      <Link href="/#pricing" className={styles.cta}>Take a Course</Link>
    </nav>
  );
}
