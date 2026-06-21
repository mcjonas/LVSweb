import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import styles from '@/components/public/Pricing/Pricing.module.css';
import Link from 'next/link';
import { getCourses } from '@/lib/actions';

// Fallback — shown only if the database has no courses yet
const FALLBACK_COURSES = [
  { num: '01', title: 'Pre-Marital Counselling',       fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '02', title: 'Post-Marital Counselling',      fees: [{ type: 'Single', ghs: 'GHS 1,200', usd: '$109' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$181' }] },
  { num: '03', title: 'Sex in Marriage',               fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '04', title: 'Legal Advice on Marriage & Divorce', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '05', title: 'Crisis Management in Marriage', fees: [{ type: 'Single', ghs: 'GHS 1,300', usd: '$118' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '06', title: 'Thriving Beyond Divorce',       fees: [{ type: 'Fee', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '07', title: 'Single and Searching',          fees: [{ type: 'Fee', ghs: 'GHS 1,000', usd: '$90' }] },
  { num: '08', title: 'Dating Well',                   fees: [{ type: 'Fee', ghs: 'GHS 1,000', usd: '$90' }] },
];

export const dynamic = 'force-dynamic';

export default async function SelfPacedCoursesPage() {
  const dbCourses = await getCourses();

  // Build the display list from DB; fall back to static list only if DB is empty
  const courses = dbCourses.length > 0
    ? dbCourses.map((c, i) => {
        const fees: { type: string; ghs: string; usd: string }[] = [];
        if (c.priceSingleGHS) {
          fees.push({
            type: 'Single',
            ghs: `GHS ${c.priceSingleGHS.toLocaleString()}`,
            usd: c.priceSingleUSD ? `$${c.priceSingleUSD.toLocaleString()}` : `$${Math.round(c.priceSingleGHS / 11).toLocaleString()}`,
          });
        }
        if (c.priceCoupleGHS) {
          fees.push({
            type: 'Couple',
            ghs: `GHS ${c.priceCoupleGHS.toLocaleString()}`,
            usd: c.priceCoupleUSD ? `$${c.priceCoupleUSD.toLocaleString()}` : `$${Math.round(c.priceCoupleGHS / 11).toLocaleString()}`,
          });
        }
        if (fees.length === 0) fees.push({ type: 'Fee', ghs: 'TBD', usd: 'TBD' });

        return {
          num: String(i + 1).padStart(2, '0'),
          title: c.title,
          fees,
        };
      })
    : FALLBACK_COURSES;

  return (
    <>
      <Navbar />
      <div style={{ background: 'var(--cream)', minHeight: '100vh', paddingTop: '6rem', paddingBottom: '4rem' }}>
        <section className={styles.pricing} style={{ background: 'transparent' }}>
          <div className={`${styles['section-header']} fade-in visible`}>
            <div className={styles['section-tag']} style={{ color: 'var(--rose)' }}>Self-Paced Learning</div>
            <h2 style={{ color: 'var(--deep)' }}>Learn at Your Own Pace</h2>
            <p style={{ color: 'var(--muted)' }}>
              Get lifetime access to our premium pre-recorded coaching programs. Watch video lessons,
              download resources, and complete modules whenever it fits your schedule.
            </p>
          </div>

          <div className={styles['courses-grid']}>
            {courses.map((c) => (
              <div
                key={c.num}
                className={styles['course-card']}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(212,175,55,0.4)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                }}
              >
                <div className={styles['course-badge']} style={{ background: 'var(--gold)', color: 'white' }}>Self-Paced</div>
                <div className={styles['course-num']} style={{ color: 'rgba(212,175,55,0.55)' }}>{c.num}</div>
                <h3 style={{ color: 'var(--deep)' }}>{c.title}</h3>
                <p className={styles['course-lang']} style={{ fontStyle: 'normal', color: 'var(--muted)' }}>Premium Video Course</p>
                <div className={styles['course-duration']}>⏱ Duration: Flexible</div>

                <div className={styles['course-fees']}>
                  {c.fees.map((fee, idx) => (
                    <div key={idx} className={styles['fee-row']}>
                      <span className={styles['fee-type']} style={{ color: 'var(--muted, #666)' }}>{fee.type}</span>
                      <span className={styles['fee-amount']}>
                        {fee.ghs} <span className={styles['fee-usd']} style={{ color: 'var(--muted, #666)' }}>/ {fee.usd}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/learning/enroll?course=${encodeURIComponent(c.title)}`}
                  className={styles['btn-course']}
                  style={{ background: 'var(--rose)', color: 'white', borderColor: 'var(--rose)' }}
                >
                  Enroll &amp; Start Learning
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
