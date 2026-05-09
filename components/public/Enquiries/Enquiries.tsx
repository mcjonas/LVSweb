import styles from './Enquiries.module.css';

export default function Enquiries() {
  return (
    <section className={styles.enquiries} id="enquiries">
      <div className={styles['enquiries-inner']}>
        <div className={`${styles['enquiries-content']} fade-in`}>
          <div className={styles['section-tag']}>Get In Touch</div>
          <h2>For <em>Enquiries</em><br />Contact Us</h2>

          <div className={styles['contact-detail']}>
            <div className={styles['contact-detail-icon']}>📞</div>
            <div className={styles['contact-detail-text']}>
              <span className={styles['contact-detail-label']}>Phone / WhatsApp</span>
              <div className={styles['contact-detail-value']}>
                <a href="tel:+233250000000">+233 250 000 000</a><br />
                <a href="tel:+233250000000">+233 250 000 000</a>
              </div>
            </div>
          </div>

          <div className={styles['contact-detail']}>
            <div className={styles['contact-detail-icon']}>✉️</div>
            <div className={styles['contact-detail-text']}>
              <span className={styles['contact-detail-label']}>Email Address</span>
              <div className={styles['contact-detail-value']}>
                <a href="mailto:lovevibestudio726@gmail.com">lovevibestudio726@gmail.com</a>
              </div>
            </div>
          </div>

          <div className={styles['contact-detail']}>
            <div className={styles['contact-detail-icon']}>🌐</div>
            <div className={styles['contact-detail-text']}>
              <span className={styles['contact-detail-label']}>Social Media</span>
              <div className={styles['contact-detail-value']}>@LoveVibeStudio on YouTube, TikTok & Instagram</div>
            </div>
          </div>
        </div>

        <div className={`${styles['qr-wrap']} fade-in`}>
          <div className={styles['qr-frame']}>
            <img src="/qr_code.jpeg" alt="Scan to Register" width={200} height={200} />
          </div>
          <div className={styles['qr-label']}>
            Scan to Register
            <span>Point your phone camera at the QR code</span>
          </div>
        </div>
      </div>
    </section>
  );
}

