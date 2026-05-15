import styles from './Services.module.css';

const RingIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="16" r="8" stroke="currentColor" strokeWidth="2"/>
    <circle cx="30" cy="20" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="M24 32C24 24 28 16 32 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const HeartIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 42C24 42 6 30 6 19C6 12.4 11.5 8 16 8C19 8 21.5 10 24 12C26.5 10 29 8 32 8C36.5 8 42 12.4 42 19C42 30 24 42 24 42Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

const IntimacyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="14" r="4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="36" cy="14" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 18V30C12 36 16 40 24 40C32 40 36 36 36 30V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 26H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ScaleIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="24" y1="8" x2="24" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 20H38C39.1 20 40 20.9 40 22V24C40 25.1 39.1 26 38 26H10C8.9 26 8 25.1 8 24V22C8 20.9 8.9 20 10 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M14 26L10 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M34 26L38 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 4L8 12V24C8 34 24 42 24 42C24 42 40 34 40 24V12L24 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M20 24L24 28L32 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SunriseIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M34 18L40 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 18L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="24" cy="22" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 36H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 36C12 32 17 28 24 28C31 28 36 32 36 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FALLBACK_SERVICES = [
  { icon: RingIcon, title: 'Pre-Marital Counseling', desc: 'Build a rock-solid foundation before you walk down the aisle. Learn communication skills, conflict resolution, financial planning, and aligning life goals as a couple.' },
  { icon: HeartIcon, title: 'Post-Marital Counseling', desc: 'Marriage is a journey. Navigate new-couple adjustments, family dynamics, personal growth, and sustaining a thriving partnership through every season of life.' },
  { icon: IntimacyIcon, title: 'Sex in Marriage', desc: 'A safe, expert-led space to explore emotional and physical intimacy, connection, desire, and building a fulfilling intimate life within your marriage.' },
  { icon: ScaleIcon, title: 'Legal Advice: Marriage & Divorce', desc: 'Understand your rights. Expert legal guidance on marriage contracts, divorce proceedings, child custody, asset division, and protecting yourself through it all.' },
  { icon: ShieldIcon, title: 'Crisis Management in Marriage', desc: 'When things feel impossible — infidelity, breakdown of trust, major conflicts — our crisis counselors provide immediate, focused support to help you decide your next step.' },
  { icon: SunriseIcon, title: 'Thriving Beyond Divorce', desc: 'Divorce is not the end. Rebuild your identity, heal emotionally, co-parent with confidence, and step into a new chapter filled with purpose, peace, and possibility.' },
];

export default function Services() {
  const services = FALLBACK_SERVICES;

  return (
    <section className={styles.services} id="services">
      <div className={`${styles['section-header']} fade-in`}>
        <div className={styles['section-tag']}>What We Offer</div>
        <h2>Courses &amp; Programmes for Every <em>Season</em> of Love</h2>
        <p>Whether you&apos;re preparing to say &quot;I do,&quot; navigating the complexities of marriage, or healing after separation — we have a path for you.</p>
      </div>
      <div className={styles['services-grid']}>
        {services.map(s => {
          const IconComponent = s.icon;
          return (
            <div key={s.title} className={`${styles['service-card']} fade-in`}>
              <div className={styles['service-icon']} style={{ color: 'inherit' }}>
                <IconComponent />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <a href="#contact" className={styles['service-link']}>Learn More →</a>
            </div>
          );
        })}
      </div>
    </section>
  );
}

