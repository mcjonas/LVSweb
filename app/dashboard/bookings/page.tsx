import styles from './bookings.module.css';

export default function BookingsPage() {
  return (
    <div>
      <div className={styles.header}>
        <h1>Bookings</h1>
        <p>Track course enrolments and session bookings.</p>
      </div>
      <div className={styles.notice}>
        📅 Bookings will appear here once integrated with your enrolment form. Currently, enrolments go through the Microsoft Forms link. You can replace this with a Neon-backed form to track them here.
      </div>
    </div>
  );
}
