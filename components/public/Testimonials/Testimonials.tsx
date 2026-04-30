import styles from './Testimonials.module.css';

const TESTIMONIALS = [
  { quote: 'The pre-marital courses gave us a language to talk about things we\'d never even discussed. We went into marriage with so much more confidence and understanding of each other.', name: '— Amara & Tunde', role: 'Pre-Marital Counseling' },
  { quote: 'I didn\'t think we could come back from where we were. The crisis counseling saved our marriage. Having someone skilled to guide us through the storm made all the difference.', name: '— David & Mercy', role: 'Crisis Management' },
  { quote: 'After my divorce, I felt lost. Love Vibe Studios helped me find myself again. I\'m not just surviving — I am genuinely thriving and excited about my future.', name: '— Chioma O.', role: 'Thriving Beyond Divorce' },
];

export default function Testimonials() {
  return (
    <section className={styles.testimonials} id="testimonials">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>Client Stories</div>
        <h2>Real <em>Transformations</em>, Real People</h2>
      </div>
      <div className={styles.grid}>
        {TESTIMONIALS.map(t => (
          <div key={t.name} className={`${styles.card} fade-in`}>
            <div className={styles.quoteChar}>&ldquo;</div>
            <div className={styles.stars}>★★★★★</div>
            <p>{t.quote}</p>
            <div className={styles.name}>{t.name}</div>
            <div className={styles.role}>{t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
