import Image from 'next/image';
import styles from './Books.module.css';
import book1 from "../../../public/book1.jpeg"
import book2 from "../../../public/book2.jpeg"
import book3 from "../../../public/book3.jpeg"
import book4 from "../../../public/book4.jpeg"

const BOOKS = [
  {
    num: 'Book 01',
    title: 'Love by Design',
    author: 'Lady Rev. Baabah Djirackor',
    img: book1,
  },
  {
    num: 'Book 02',
    title: 'The Marriage Code',
    author: 'Lady Rev. Baabah Djirackor',
    img: book2,
  },
  {
    num: 'Book 03',
    title: 'Beyond the Vows',
    author: 'Lady Rev. Baabah Djirackor',
    img: book3,
  },
  {
    num: 'Book 04',
    title: 'Rising After Divorce',
    author: 'Lady Rev. Baabah Djirackor',
    img: book4,
  },
];

export default function Books() {
  return (
    <section className={styles.books} id="books">
      <div className={`${styles.header} fade-in`}>
        <div className={styles.tag}>By the Founder</div>
        <h2>Books by <em>Lady Rev. Baabah Djirackor</em></h2>
        <p>Transformational reads that equip, heal, and inspire — available now.</p>
      </div>
      <div className={styles.grid}>
        {BOOKS.map(b => (
          <div key={b.num} className={`${styles.card} fade-in`}>
            <div className={styles.coverWrap}>
              <Image 
                src={b.img} 
                alt={b.title} 
                fill 
                sizes="(max-width: 768px) 50vw, 25vw"
                className={styles.coverImage}
              />
              <div className={styles.overlay}>
                <span>View Book</span>
              </div>
            </div>
            <div className={styles.num}>{b.num}</div>
            <div className={styles.title}>{b.title}</div>
            <div className={styles.author}>{b.author}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
