import styles from './Enquiries.module.css';

export default function Enquiries() {
  return (
    <section className={styles.enquiries} id="enquiries">
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.tag}>Reach Out</div>
          <h2>
            Connect With Us <em>Directly</em>
          </h2>

          <div className={styles.detail}>
            <div className={styles.icon}>📧</div>
            <div className={styles.text}>
              <span className={styles.label}>Email</span>
              <span className={styles.value}>
                <a href="mailto:info@lovevibe.studio">info@lovevibe.studio</a>
              </span>
            </div>
          </div>

          <div className={styles.detail}>
            <div className={styles.icon}>📱</div>
            <div className={styles.text}>
              <span className={styles.label}>WhatsApp / Phone</span>
              <span className={styles.value}>
                <a href="tel:+233000000000">+233 000 000 000</a>
              </span>
            </div>
          </div>

          <div className={styles.detail}>
            <div className={styles.icon}>🌍</div>
            <div className={styles.text}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>Ghana · Online Worldwide</span>
            </div>
          </div>

          <div className={styles.detail}>
            <div className={styles.icon}>⏰</div>
            <div className={styles.text}>
              <span className={styles.label}>Office Hours</span>
              <span className={styles.value}>Mon – Fri, 9am – 5pm GMT</span>
            </div>
          </div>
        </div>

        <div className={styles.qrWrap}>
          <div className={styles.qrFrame}>
            {/* Place QR code image at /public/assets/qr.png */}
            <img src="/qr_code.jpeg" alt="Scan to Enrol" width={200} height={200} />
          </div>
          <div className={styles.qrLabel}>
            Scan to Enrol
            <span>Point your camera at the code to access our enrolment form</span>
          </div>
        </div>
      </div>
    </section>
  );
}
