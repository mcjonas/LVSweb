'use client';

import { useState } from 'react';
import styles from './bookings.module.css';
import { Booking } from '@/lib/schema';

export default function BookingsClient({ initialBookings }: { initialBookings: Booking[] }) {
  const [filterCourse, setFilterCourse] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const courses = Array.from(new Set(initialBookings.map(b => b.course).filter(Boolean))) as string[];

  const filteredBookings = initialBookings.filter(b => {
    if (filterCourse && b.course !== filterCourse) return false;
    if (filterPayment && b.paymentStatus !== filterPayment) return false;
    return true;
  });

  return (
    <div>
      <div className={styles.filters} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <select 
          value={filterCourse} 
          onChange={(e) => setFilterCourse(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All Courses</option>
          {courses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select 
          value={filterPayment} 
          onChange={(e) => setFilterPayment(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All Payment Statuses</option>
          <option value="success">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className={styles.tableCard}>
        {filteredBookings.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Email / Phone</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(b => (
                <tr key={b.id}>
                  <td>{new Date(b.createdAt!).toLocaleDateString()}</td>
                  <td><strong>{b.name}</strong></td>
                  <td>
                    <div>{b.email}</div>
                    <small>{b.phone}</small>
                  </td>
                  <td><span className={styles.badge}>{b.course}</span></td>
                  <td>{b.amount ? `GHS ${b.amount.toLocaleString()}` : '-'}</td>
                  <td>
                    <span className={`${styles.status} ${styles[b.paymentStatus || 'pending']}`} style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: b.paymentStatus === 'success' ? '#def7ec' : b.paymentStatus === 'failed' ? '#fde8e8' : '#fef3c7',
                      color: b.paymentStatus === 'success' ? '#03543f' : b.paymentStatus === 'failed' ? '#9b1c1c' : '#92400e'
                    }}>
                      {b.paymentStatus === 'success' ? 'Paid' : b.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.empty}>
            <p>No bookings found matching filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
