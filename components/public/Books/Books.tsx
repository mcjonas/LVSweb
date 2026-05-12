import Image from 'next/image';
import styles from './Books.module.css';
import book1 from "../../../public/Book_1.png"
import book2 from "../../../public/Book_2.png"

const BOOKS = [
  {
    num: 'Book 01',
    title: 'Understanding Dating',
    author: 'Lady Rev. Baabah Djirackor',
    img: book1,
  },
  {
    num: 'Book 02',
    title: 'The Beauty of Sex',
    author: 'Lady Rev. Baabah Djirackor',
    img: book2,
  },
];

export default function Books() {
  return (
    <section className={styles.books} id="books">
      <div className={`${styles['section-header']} fade-in`}>
        <div className={styles['section-tag']}>By the Founder</div>
        <h2>Books by <em>Lady Rev. Baabah Djirackor</em></h2>
        <p>Transformational reads that equip, heal, and inspire — available now.</p>
      </div>
      <div className={styles['books-grid']}>
        {BOOKS.map(b => (
          <div key={b.num} className={`${styles['book-card']} fade-in`}>
            <div className={styles['book-cover-wrap']}>
              <Image 
                src={b.img} 
                alt={b.title} 
                fill 
                sizes="(max-width: 768px) 50vw, 25vw"
                className={styles['cover-image']}
              />
              <div className={styles['book-overlay']}>
                <span>View Book</span>
              </div>
            </div>
            <div className={styles['book-number']}>{b.num}</div>
            <div className={styles['book-title']}>{b.title}</div>
            <div className={styles['book-author']}>{b.author}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
