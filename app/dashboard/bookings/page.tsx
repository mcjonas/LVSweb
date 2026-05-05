import { getBookings } from '@/lib/actions';
import styles from './bookings.module.css';
import BookingsClient from './BookingsClient';

export default async function BookingsPage() {
  const bookings = await getBookings();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Enrollments & Bookings</h1>
        <p>Track all course enrollments and payment statuses.</p>
      </div>

      <BookingsClient initialBookings={bookings} />
    </div>
  );
}
