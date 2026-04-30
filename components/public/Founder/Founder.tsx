import styles from './Founder.module.css';
import founder from '../../../public/founder.png';


export default function Founder() {
  return (
    <section className={styles.founder} id="founder">
      <div className={styles.inner}>
        <div className={styles.imageWrap}>
          <div className={styles.ring}></div>
          {/* Place founder photo at /public/assets/founder.jpg */}
          <img
            src={founder.src}
            alt="Lady Rev. Baabah Djirackor"
            className={styles.img}
          />
          <div className={styles.badge}>Founder &amp; Lead Counselor</div>
        </div>

        <div className={styles.content}>
          <div className={styles.tag}>Meet the Founder</div>
          <h2>
            <em>Lady Rev. Baabah Djirackor</em>
          </h2>
          <p>
            Lady Rev. Baabah Djirackor is a passionate relationship counselor, minister, and the visionary behind Love Vibe Studios. With years of dedicated experience in pre-marital and post-marital counseling, she has walked alongside hundreds of couples and individuals through every season of love — from joyful beginnings to the most challenging crossroads.
          </p>
          <p>
            Her mission is simple yet profound:{' '}
            <em className={styles.rose}>love should be learned, not left to chance.</em>{' '}
            Through expert-led online courses &amp; programmes, she equips couples and individuals with the tools, language, and confidence to build thriving, lasting relationships.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>10+</span>
              <span className={styles.statLabel}>Years Experience</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>500+</span>
              <span className={styles.statLabel}>Lives Transformed</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNum}>6</span>
              <span className={styles.statLabel}>Programs Offered</span>
            </div>
          </div>
          <a href="#pricing" className={styles.btn}>Take a Course with Her</a>
        </div>
      </div>
    </section>
  );
}
