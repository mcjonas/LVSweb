import styles from './HowItWorks.module.css';

const STEPS = [
  { num: '01', title: 'Book a Free Discovery Call', desc: 'Tell us where you are and what you need. No judgment, just a warm, confidential conversation with one of our counselors.' },
  { num: '02', title: 'Choose Your Program', desc: 'We\'ll match you with the right class or counselor and help you pick a plan that fits your schedule and budget.' },
  { num: '03', title: 'Attend Online Sessions', desc: 'Join live video courses or one-on-one sessions from the comfort of your home. All sessions are fully private and secure.' },
  { num: '04', title: 'Transform & Thrive', desc: 'Apply your learnings with ongoing support, resources, and community. Watch your relationship — and yourself — flourish.' },
];

export default function HowItWorks() {
  return (
    <section className={styles.how} id="how">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>The Process</div>
        <h2>Simple Steps to <em>Transform</em> Your Relationship</h2>
      </div>
      <div className={styles.steps}>
        {STEPS.map(s => (
          <div key={s.num} className={`${styles.step} fade-in`}>
            <div className={styles.num}>{s.num}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
