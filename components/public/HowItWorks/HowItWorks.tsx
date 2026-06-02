import Link from 'next/link';
import styles from './HowItWorks.module.css';

const BOOKINGS = [
  {
    title: 'Walk-In Session (Solo)',
    rate: 'GHS 750',
    duration: '1 Hour',
    channel: 'In-person / Solo',
    venue: "Love Vibe Studio's Office - Adenta",
    link: '/enroll?course=Walk-In Session (Solo)&booking=true'
  },
  {
    title: 'Walk-In Session (Joint)',
    rate: 'GHS 1,200',
    duration: '1 Hour 30 Mins',
    channel: 'In-person / Couple',
    venue: "Love Vibe Studio's Office - Adenta",
    link: '/enroll?course=Walk-In Session (Joint)&booking=true'
  },
  {
    title: 'Telephone Session',
    rate: 'GHS 200',
    duration: '1 Hour',
    channel: 'Local / Regular call',
    venue: 'Voice Call',
    link: '/enroll?course=Telephone Session&booking=true'
  },
  {
    title: 'Online Call (WhatsApp)',
    rate: 'GHS 450',
    duration: '1 Hour',
    channel: 'WhatsApp Call',
    venue: 'Voice & Video Format',
    link: '/enroll?course=Online WhatsApp Call&booking=true'
  },
  {
    title: 'Virtual Audio Session',
    rate: 'GHS 450',
    duration: '1 Hour',
    channel: 'Google Meet / Zoom',
    venue: 'Audio Session',
    link: '/enroll?course=Virtual Audio Session&booking=true'
  },
  {
    title: 'Virtual Video Session',
    rate: 'GHS 600',
    duration: '1 Hour',
    channel: 'Google Meet / Zoom',
    venue: 'Video Format',
    link: '/enroll?course=Virtual Video Session&booking=true'
  }
];

const CalendarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="10" width="32" height="30" rx="4" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="6" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="16" cy="28" r="2" fill="currentColor"/>
    <circle cx="24" cy="28" r="2" fill="currentColor"/>
    <circle cx="32" cy="28" r="2" fill="currentColor"/>
    <circle cx="16" cy="34" r="2" fill="currentColor"/>
    <circle cx="24" cy="34" r="2" fill="currentColor"/>
    <circle cx="32" cy="34" r="2" fill="currentColor"/>
  </svg>
);

const ProcedureIcon = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2"/>
    <line x1="16" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="32" x2="26" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10H32" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export default function HowItWorks() {
  return (
    <section className={styles.how} id="how">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>Private Consultations</div>
        <h2>Special Bookings <em>for Individuals</em></h2>
        <p className={styles.subtitle}>Book a private one-on-one session to receive tailored relationship guidance.</p>
      </div>

      {/* Grid of Session Options */}
      <div className={styles.grid}>
        {BOOKINGS.map((b, idx) => (
          <div key={idx} className={`${styles.card} fade-in`}>
            <div className={styles.durationBadge}>⏱ {b.duration}</div>
            <h3>{b.title}</h3>
            <div className={styles.rate}>{b.rate}</div>
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span>Format:</span>
                <strong>{b.channel}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Location:</span>
                <strong>{b.venue}</strong>
              </div>
            </div>
            <Link href={b.link} className={styles.btn}>
              Book Session Now
            </Link>
          </div>
        ))}
      </div>

      {/* Availability & Procedures */}
      <div className={`${styles.infoBlock} fade-in`}>
        <div className={styles.infoCol}>
          <div className={styles.infoTitleRow}>
            <div className={styles.infoIcon}>
              <CalendarIcon />
            </div>
            <h3>Service Availability</h3>
          </div>
          <ul className={styles.availabilityList}>
            <li>
              <strong>Tuesday - Friday:</strong> 
              <span>9:00 AM — 4:00 PM</span>
            </li>
            <li>
              <strong>Saturdays:</strong> 
              <span>12:00 PM — 5:00 PM</span>
            </li>
          </ul>
        </div>
        
        <div className={styles.infoCol}>
          <div className={styles.infoTitleRow}>
            <div className={styles.infoIcon}>
              <ProcedureIcon />
            </div>
            <h3>Booking Procedure</h3>
          </div>
          <p className={styles.procedureText}>
            To schedule a session, please select a day and time that suits you and we&apos;ll confirm its availability. 
            Once payment is confirmed, you will be added to our booking list. 
            Kindly note that, all bookings are done prior to the sessions. We look forward to serving you.
          </p>
        </div>
      </div>
    </section>
  );
}
