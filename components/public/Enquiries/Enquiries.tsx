import styles from './Enquiries.module.css';

// Phone / WhatsApp icon – 24×24 viewport rendered inside a 44px circle container
const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.47 11.47 0 0 0 3.59.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.59a1 1 0 0 1-.25 1.01l-2.2 2.19Z"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

// Email icon
const EmailIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Social / share icon
const SocialMediaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);



export default function Enquiries() {
  return (
    <section className={styles.enquiries} id="enquiries">
      <div className={styles['enquiries-inner']}>
        <div className={`${styles['enquiries-content']} fade-in`}>
          <div className={styles['section-tag']}>Get In Touch</div>
          <h2>For <em>Enquiries</em><br />Contact Us</h2>

          <div className={styles['contact-detail']}>
            <div className={styles['contact-detail-icon']} style={{ color: 'inherit' }}>
              <PhoneIcon />
            </div>
            <div className={styles['contact-detail-text']}>
              <span className={styles['contact-detail-label']}>Phone / WhatsApp</span>
              <div className={styles['contact-detail-value']}>
                <a href="tel:+233250000000">+233 250 000 000</a><br />
                <a href="tel:+233250000000">+233 250 000 000</a>
              </div>
            </div>
          </div>

          <div className={styles['contact-detail']}>
            <div className={styles['contact-detail-icon']} style={{ color: 'inherit' }}>
              <EmailIcon />
            </div>
            <div className={styles['contact-detail-text']}>
              <span className={styles['contact-detail-label']}>Email Address</span>
              <div className={styles['contact-detail-value']}>
                <a href="mailto:lovevibestudio726@gmail.com">lovevibestudio726@gmail.com</a>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles['cta-wrap']} fade-in`}>
          <a
            href="https://forms.office.com/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAANAAX6CbARUMkc5RjE3STFISFg3VElZV0tNR1lIS0FNRy4u&origin=QRCode"
            target="_blank"
            rel="noopener noreferrer"
            className={styles['cta-btn']}
          >
            Buy your Forms Here
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginLeft: '0.5rem' }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

