import Image from 'next/image';
import styles from './CountryManagers.module.css';

// flagcdn.com — free, no API key needed. Format: /w40/{iso2}.png
const FLAG = (code: string) => `https://flagcdn.com/w40/${code}.png`;

const MANAGERS = [
  {
    // 1st — 90122_8k-1.png (tall portrait on white bg — zoom into face)
    name: 'Mr. Jonas Salom Gasu',
    role: 'Chief Operations Director',
    flagCode: 'gh',
    country: 'Ghana',
    photo: '/90122_8k-1.png',
    photoPosition: 'center 18%',
    featured: true,
  },
  {
    // 2nd — IMG-20260617-WA0016.jpg
    name: 'Mrs. Phoebe Okine',
    role: 'Country Manager',
    flagCode: 'gb',
    country: 'United Kingdom',
    photo: '/IMG-20260617-WA0016.jpg.jpeg',
    photoPosition: 'center top',
    featured: false,
  },
  {
    // 3rd — IMG-20260616-WA0002.jpg
    name: 'Pastor Admiro',
    role: 'Country Manager',
    flagCode: 'mz',
    country: 'Mozambique',
    photo: '/IMG-20260616-WA0002.jpg.jpeg',
    photoPosition: 'center top',
    featured: false,
  },
  {
    // 4th — IMG-20260616-WA0011.jpg
    name: 'Rev. Micheal Ajibade',
    role: 'Country Manager',
    flagCode: 'ng',
    country: 'Nigeria',
    photo: '/IMG-20260616-WA0011.jpg.jpeg',
    photoPosition: 'center top',
    featured: false,
  },
  {
    // 5th — IMG-20260618-WA0036.jpg
    name: 'Elder Primrose Najemba',
    role: 'Country Manager',
    flagCode: 'ug',
    country: 'Uganda',
    photo: '/IMG-20260618-WA0036.jpg.jpeg',
    photoPosition: 'center top',
    featured: false,
  },
  {
    // 6th — Lady_Pastor_Emma_Makozho.jpeg
    name: 'Lady Pastor Emma Makozho',
    role: 'Country Manager',
    flagCode: 'zw',
    country: 'Zimbabwe',
    photo: '/Lady_Pastor_Emma_Makozho.jpeg',
    photoPosition: 'center 20%',
    featured: false,
  },
];

export default function CountryManagers() {
  return (
    <section className={styles.section} id="team">
      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.tag}>Our Global Network</span>
        <h2 className={styles.title}>
          Meet Our <em>Country</em> Managers
        </h2>
        <p className={styles.subtitle}>
          Building global connections through leadership &amp; innovation —
          our dedicated team spans continents, bringing Love Vibe Studio&apos;s
          mission to families worldwide.
        </p>
      </div>

      {/* ── Cards Grid ── */}
      <div className={styles.grid}>
        {MANAGERS.map((mgr) => (
          <div
            key={mgr.name}
            className={`${styles.card}${mgr.featured ? ' ' + styles.featured : ''}`}
          >
            {mgr.featured && (
              <span className={styles.featuredBadge}>COO · Head</span>
            )}

            {/* Photo */}
            <div className={styles.photoWrap}>
              <Image
                src={mgr.photo}
                alt={mgr.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 300px"
                className={styles.photo}
                style={{ objectFit: 'cover', objectPosition: mgr.photoPosition }}
              />
              <div className={styles.photoOverlay} />

              {/* Real flag image badge — top right corner */}
              <div className={styles.flagBadge}>
                <img
                  src={FLAG(mgr.flagCode)}
                  alt={mgr.country}
                  width={40}
                  height={27}
                  className={styles.flagImg}
                />
              </div>
            </div>

            {/* Info */}
            <div className={styles.body}>
              <div className={styles.role}>{mgr.role}</div>
              <h3 className={styles.name}>{mgr.name}</h3>
              <div className={styles.country}>
                {/* Small inline flag next to country name */}
                <img
                  src={FLAG(mgr.flagCode)}
                  alt={mgr.country}
                  width={20}
                  height={14}
                  className={styles.countryFlag}
                />
                {mgr.country}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats Bar ── */}
      <div className={styles.statBar}>
        <div className={styles.stat}>
          <div className={styles.statNum}>5+</div>
          <div className={styles.statLabel}>Countries</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>6</div>
          <div className={styles.statLabel}>Country Managers</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>1000+</div>
          <div className={styles.statLabel}>Families Impacted</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>4</div>
          <div className={styles.statLabel}>Continents</div>
        </div>
      </div>
    </section>
  );
}
