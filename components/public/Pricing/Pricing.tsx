import { getCourses } from '@/lib/actions';
import styles from './Pricing.module.css';

// Removed static ENROL_URL

const FALLBACK_COURSES = [
  { num: '01', title: 'Pre-Marital Counselling', lang: 'Asesoramiento prematrimonial / Conseil prénuptial', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '02', title: 'Post-Marital Counselling', lang: 'Asesoramiento postmatrimonial / Conseil post-nuptial', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,200', usd: '$109' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$181' }] },
  { num: '03', title: 'Sex in Marriage', lang: 'El sexo en el matrimonio / Les relations sexuelles dans le mariage', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }], featured: true },
  { num: '04', title: 'Legal Advice on Marriage & Divorce', lang: 'Asesoramiento legal sobre matrimonio y divorcio', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '05', title: 'Crisis Management in Marriage', lang: 'Gestión de crisis en el matrimonio / Gestion des crises conjugales', duration: '3 Months', fees: [{ type: 'Single', ghs: 'GHS 1,300', usd: '$118' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '06', title: 'Thriving Beyond Divorce', lang: "Prosperando después del divorcio / S'épanouir après le divorce", duration: '3 Months', fees: [{ type: 'Fee', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '07', title: 'Single and Searching', lang: 'Soltero y buscando / Célibataire et à la recherche', duration: '3 Months', fees: [{ type: 'Fee', ghs: 'GHS 1,000', usd: '$90' }] },
  { num: '08', title: 'Dating Well', lang: 'Tener citas exitosas / Rencontres réussies', duration: '3 Months', fees: [{ type: 'Fee', ghs: 'GHS 1,000', usd: '$90' }] },
];

export default async function Pricing() {
  const dbCourses = await getCourses();
  
  const courses = dbCourses.length > 0 
    ? dbCourses.map((c, i) => {
        const fees = [];
        if (c.priceSingleGHS) {
          fees.push({ 
            type: 'Single', 
            ghs: `GHS ${c.priceSingleGHS.toLocaleString()}`, 
            usd: c.priceSingleUSD ? `$${c.priceSingleUSD.toLocaleString()}` : `$${Math.round(c.priceSingleGHS / 11).toLocaleString()}` 
          });
        }
        if (c.priceCoupleGHS) {
          fees.push({ 
            type: 'Couple', 
            ghs: `GHS ${c.priceCoupleGHS.toLocaleString()}`, 
            usd: c.priceCoupleUSD ? `$${c.priceCoupleUSD.toLocaleString()}` : `$${Math.round(c.priceCoupleGHS / 11).toLocaleString()}` 
          });
        }
        // Fallback for "Thriving Beyond Divorce" style single fee
        if (fees.length === 0 && (c.priceSingleGHS || c.priceCoupleGHS)) {
           // handled above
        } else if (fees.length === 0) {
           fees.push({ type: 'Fee', ghs: 'TBD', usd: 'TBD' });
        }
        
        return {
          num: String(i + 1).padStart(2, '0'),
          title: c.title,
          lang: c.description,
          duration: c.duration || '3 Months',
          fees,
          featured: i === 2 
        };
      })
    : FALLBACK_COURSES;

  return (
    <section className={styles.pricing} id="pricing">
      <div className={`${styles['section-header']} fade-in`}>
        <div className={styles['section-tag']} style={{color: 'var(--gold)'}}>Investment in Love</div>
        <h2 style={{color: 'var(--white)'}}>Courses <em style={{color: 'var(--gold)', fontStyle: 'italic'}}>(Los Cursos / Les Cours)</em></h2>
        <p style={{color: 'rgba(255,255,255,0.55)'}}>All programmes run for 3 months. Fees listed in Ghana Cedis (GHS) and US Dollars ($).</p>
      </div>
      <div className={styles['courses-grid']}>
        {courses.map(c => (
          <div key={c.num} className={`${styles['course-card']} ${c.featured ? styles['featured-course'] : ''} fade-in`}>
            {c.featured && <div className={styles['course-badge']}>Popular</div>}
            <div className={styles['course-num']}>{c.num}</div>
            <h3>{c.title}</h3>
            <p className={styles['course-lang']}>{c.lang}</p>
            <div className={styles['course-duration']}>⏱ Duration: {c.duration}</div>
            <div className={styles['course-fees']}>
              {c.fees.map((f, idx) => (
                <div key={idx} className={styles['fee-row']}>
                  <span className={styles['fee-type']}>{f.type}</span>
                  <span className={styles['fee-amount']}>{f.ghs} <span className={styles['fee-usd']}>/ {f.usd}</span></span>
                </div>
              ))}
            </div>
            <a href={`/enroll?course=${encodeURIComponent(c.title)}`} className={styles['btn-course']}>Enroll Now</a>
          </div>
        ))}
        
        {/* NEW: Self-Paced Learning Card */}
        <div className={styles['course-card']} style={{ border: '2px solid var(--gold)' }}>
          <div className={styles['course-badge']} style={{ background: 'var(--gold)', color: 'white' }}>Self-Paced</div>
          <div className={styles['course-num']} style={{ fontSize: '1.5rem', lineHeight: '1.2' }}>⭐</div>
          <h3>Learn at Your Own Pace</h3>
          <p className={styles['course-lang']} style={{ fontStyle: 'normal' }}>
            Access pre-recorded lessons anytime and learn flexibly at your own pace. Perfect for busy schedules!
          </p>
          <div className={styles['course-duration']}>⏱ Duration: Flexible</div>
          <div className={styles['course-fees']}>
            <div className={styles['fee-row']}>
              <span className={styles['fee-type']}>All Courses</span>
              <span className={styles['fee-amount']}>Available on demand</span>
            </div>
          </div>
          <a href="/learning/courses" className={styles['btn-course']} style={{ background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }}>
            Explore Courses
          </a>
        </div>
      </div>
    </section>
  );
}
