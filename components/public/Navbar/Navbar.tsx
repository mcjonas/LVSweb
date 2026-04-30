'use client';

import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link href="#" className={styles.logo}>
        Love <span>Vibe</span> Studios
      </Link>
      <ul className={styles.links}>
        <li><a href="#services">Services</a></li>
        <li><a href="#how">How It Works</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#testimonials">Stories</a></li>
      </ul>
      <a href="#pricing" className={styles.cta}>Take a Course</a>
    </nav>
  );
}
