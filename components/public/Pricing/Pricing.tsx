import styles from './Pricing.module.css';

const ENROL_URL = 'https://forms.office.com/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAANAAX6CbARUMkc5RjE3STFISFg3VElZV0tNR1lIS0FNRy4u&origin=QRCode';

const COURSES = [
  { num: '01', title: 'Pre-Marital Counselling', lang: 'Asesoramiento prematrimonial / Conseil prénuptial', fees: [{ type: 'Couple', ghs: 'GHS 1,500', usd: '$137' }] },
  { num: '02', title: 'Post-Marital Counselling', lang: 'Asesoramiento postmatrimonial / Conseil post-nuptial', fees: [{ type: 'Single', ghs: 'GHS 1,200', usd: '$109' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$181' }] },
  { num: '03', title: 'Sex in Marriage', lang: 'El sexo en el matrimonio / Les relations sexuelles dans le mariage', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }], featured: true },
  { num: '04', title: 'Legal Advice on Marriage & Divorce', lang: 'Asesoramiento legal sobre matrimonio y divorcio', fees: [{ type: 'Single', ghs: 'GHS 1,500', usd: '$137' }, { type: 'Couple', ghs: 'GHS 2,500', usd: '$228' }] },
  { num: '05', title: 'Crisis Management in Marriage', lang: 'Gestión de crisis en el matrimonio / Gestion des crises conjugales', fees: [{ type: 'Single', ghs: 'GHS 1,300', usd: '$118' }, { type: 'Couple', ghs: 'GHS 2,000', usd: '$182' }] },
  { num: '06', title: 'Thriving Beyond Divorce', lang: "Prosperando después del divorcio / S'épanouir après le divorce", fees: [{ type: 'Fee', ghs: 'GHS 2,000', usd: '$182' }] },
];

export default function Pricing() {
  return (
    <section className={styles.pricing} id="pricing">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>Investment in Love</div>
        <h2>Courses <em>(Los Cursos / Les Cours)</em></h2>
        <p>All programmes run for 3 months. Fees listed in Ghana Cedis (GHS) and US Dollars ($).</p>
      </div>
      <div className={styles.grid}>
        {COURSES.map(c => (
          <div key={c.num} className={`${styles.card} ${c.featured ? styles.featured : ''} fade-in`}>
            {c.featured && <div className={styles.badge}>Popular</div>}
            <div className={styles.num}>{c.num}</div>
            <h3>{c.title}</h3>
            <p className={styles.lang}>{c.lang}</p>
            <div className={styles.duration}>⏱ Duration: 3 Months</div>
            <div className={styles.fees}>
              {c.fees.map(f => (
                <div key={f.type} className={styles.feeRow}>
                  <span className={styles.feeType}>{f.type}</span>
                  <span className={styles.feeAmt}>{f.ghs} <span className={styles.feeUsd}>/ {f.usd}</span></span>
                </div>
              ))}
            </div>
            <a href={ENROL_URL} target="_blank" rel="noreferrer" className={styles.btn}>Enrol Now</a>
          </div>
        ))}
      </div>
    </section>
  );
}
