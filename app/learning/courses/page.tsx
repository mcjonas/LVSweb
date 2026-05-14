import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import styles from '@/components/public/Pricing/Pricing.module.css';
import Link from 'next/link';

// Using the same fallback courses from the main site
const SELF_PACED_COURSES = [
  { num: '01', title: 'Pre-Marital Counselling', duration: 'Flexible', fees: [{ type: 'Couple', ghs: 'GHS 1,500', usd: '$137' }] },
  { num: '02', title: 'Post-Marital Counselling', duration: 'Flexible', fees: [{ type: 'Single', ghs: 'GHS 1,200', usd: '$109' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$181' }] },
  { num: '03', title: 'Sex in Marriage', duration: 'Flexible', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '04', title: 'Legal Advice on Marriage & Divorce', duration: 'Flexible', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '05', title: 'Crisis Management in Marriage', duration: 'Flexible', fees: [{ type: 'Single', ghs: 'GHS 1,300', usd: '$118' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '06', title: 'Thriving Beyond Divorce', duration: 'Flexible', fees: [{ type: 'Fee', ghs: 'GHS 2,000', usd: '$182' }] },
];

export default function SelfPacedCoursesPage() {
  return (
    <>
      <Navbar />
      <div style={{ background: 'var(--cream)', minHeight: '100vh', paddingTop: '6rem', paddingBottom: '4rem' }}>
        <section className={styles.pricing} style={{ background: 'transparent' }}>
          <div className={`${styles['section-header']} fade-in visible`}>
            <div className={styles['section-tag']} style={{color: 'var(--rose)'}}>Self-Paced Learning</div>
            <h2 style={{color: 'var(--deep)'}}>Learn at Your Own Pace</h2>
            <p style={{color: 'var(--muted)'}}>Get lifetime access to our premium pre-recorded coaching programs. Watch video lessons, download resources, and complete modules whenever it fits your schedule.</p>
          </div>

          <div className={styles['courses-grid']}>
            {SELF_PACED_COURSES.map((c) => (
              <div key={c.num} className={styles['course-card']} style={{ border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                <div className={styles['course-badge']} style={{ background: 'var(--gold)', color: 'white' }}>Self-Paced</div>
                <div className={styles['course-num']}>{c.num}</div>
                <h3 style={{ color: 'var(--deep)' }}>{c.title}</h3>
                <p className={styles['course-lang']} style={{ fontStyle: 'normal' }}>Premium Video Course</p>
                <div className={styles['course-duration']}>⏱ Duration: {c.duration}</div>
                
                <div className={styles['course-fees']}>
                  {c.fees.map((fee, idx) => (
                    <div key={idx} className={styles['fee-row']}>
                      <span className={styles['fee-type']}>{fee.type}</span>
                      <span className={styles['fee-amount']}>{fee.ghs} <span className={styles['fee-usd']}>/ {fee.usd}</span></span>
                    </div>
                  ))}
                </div>
                
                <Link 
                  href={`/learning/enroll?course=${encodeURIComponent(c.title)}`} 
                  className={styles['btn-course']}
                  style={{ background: 'var(--rose)', color: 'white', borderColor: 'var(--rose)' }}
                >
                  Enroll & Start Learning
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
