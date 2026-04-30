import styles from './Services.module.css';

const SERVICES = [
  { icon: '💍', title: 'Pre-Marital Counseling', desc: 'Build a rock-solid foundation before you walk down the aisle. Learn communication skills, conflict resolution, financial planning, and aligning life goals as a couple.' },
  { icon: '🌹', title: 'Post-Marital Counseling', desc: 'Marriage is a journey. Navigate new-couple adjustments, family dynamics, personal growth, and sustaining a thriving partnership through every season of life.' },
  { icon: '🔥', title: 'Sex in Marriage', desc: 'A safe, expert-led space to explore emotional and physical intimacy, connection, desire, and building a fulfilling intimate life within your marriage.' },
  { icon: '⚖️', title: 'Legal Advice: Marriage & Divorce', desc: 'Understand your rights. Expert legal guidance on marriage contracts, divorce proceedings, child custody, asset division, and protecting yourself through it all.' },
  { icon: '🆘', title: 'Crisis Management in Marriage', desc: 'When things feel impossible — infidelity, breakdown of trust, major conflicts — our crisis counselors provide immediate, focused support to help you decide your next step.' },
  { icon: '🌅', title: 'Thriving Beyond Divorce', desc: 'Divorce is not the end. Rebuild your identity, heal emotionally, co-parent with confidence, and step into a new chapter filled with purpose, peace, and possibility.' },
];

export default function Services() {
  return (
    <section className={styles.services} id="services">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>What We Offer</div>
        <h2>Courses &amp; Programmes for Every <em>Season</em> of Love</h2>
        <p>Whether you're preparing to say &quot;I do,&quot; navigating the complexities of marriage, or healing after separation — we have a path for you.</p>
      </div>
      <div className={styles.grid}>
        {SERVICES.map(s => (
          <div key={s.title} className={`${styles.card} fade-in`}>
            <div className={styles.icon}>{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <a href="#contact" className={styles.link}>Learn More →</a>
          </div>
        ))}
      </div>
    </section>
  );
}
