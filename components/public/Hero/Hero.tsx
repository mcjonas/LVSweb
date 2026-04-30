import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.tag}>Online Courses &amp; Programmes</div>
        <h1>
          Where <em>Love</em> is Learned<br />and Not Left to Chance
        </h1>
        <p>
          Professional online courses &amp; programmes for pre-marital preparation,
          post-marital growth, sex in marriage, legal guidance on marriage &amp; divorce,
          and thriving beyond divorce.
        </p>
        <div className={styles.btns}>
          <a href="#services" className={styles.btnPrimary}>Explore Our Courses</a>
          <a href="#pricing" className={styles.btnGhost}>Take a Course</a>
        </div>
      </div>

      <div className={styles.visual}>
        <div className={styles.ring}></div>
        <div className={styles.circle}>
          <img
            src="/logo.jpeg"
            alt="Love Vibe Studios"
            style={{ width: '160px', height: '160px', borderRadius: '50%', marginBottom: '1.5rem', objectFit: 'cover' }}
          />
          <h2>Where Love is Learned</h2>
          <p>Expert-led · Confidential · Online</p>
        </div>
      </div>
    </section>
  );
}
