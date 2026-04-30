import styles from './Footer.module.css';

export default function Footer() {
  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.brand}>
          <span className={styles.logo}>Love <span>Vibe</span> Studios</span>
          <p>Where love is learned and not left to chance. Professional counselling and courses online.</p>
        </div>
        <div className={styles.col}>
          <h4>Services</h4>
          <ul>
            <li><a href="#services">Pre-Marital Counseling</a></li>
            <li><a href="#services">Post-Marital Counseling</a></li>
            <li><a href="#services">Sex in Marriage</a></li>
            <li><a href="#services">Legal Advice</a></li>
            <li><a href="#services">Crisis Management</a></li>
          </ul>
        </div>
        <div className={styles.col}>
          <h4>Company</h4>
          <ul>
            <li><a href="#founder">About the Founder</a></li>
            <li><a href="#testimonials">Client Stories</a></li>
            <li><a href="#books">Books</a></li>
            <li><a href="#how">How It Works</a></li>
          </ul>
        </div>
        <div className={styles.col}>
          <h4>Contact</h4>
          <ul>
            <li><a href="#contact">Book a Call</a></li>
            <li><a href="#enquiries">Enquiries</a></li>
            <li><a href="https://www.facebook.com/LoveVibeStudios" target="_blank" rel="noreferrer">Facebook</a></li>
            <li><a href="https://www.instagram.com/lovevibe_studios" target="_blank" rel="noreferrer">Instagram</a></li>
          </ul>
        </div>
      </footer>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Love Vibe Studios. All rights reserved.</span>
        <span>Where love is learned and not left to chance</span>
      </div>
    </>
  );
}
