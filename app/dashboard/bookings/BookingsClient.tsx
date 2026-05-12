'use client';

import { useState, useEffect } from 'react';
import styles from './bookings.module.css';
import { Booking } from '@/lib/schema';

export default function BookingsClient({ initialBookings }: { initialBookings: Booking[] }) {
  const [filterCourse, setFilterCourse] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const courses = Array.from(new Set(initialBookings.map(b => b.course).filter(Boolean))) as string[];

  const filteredBookings = initialBookings.filter(b => {
    if (filterCourse && b.course !== filterCourse) return false;
    if (filterPayment) {
      if (filterPayment === 'success' || filterPayment === 'paid') {
        if (b.paymentStatus !== 'success' && b.paymentStatus !== 'paid') return false;
      } else if (b.paymentStatus !== filterPayment) {
        return false;
      }
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Name', 'Email', 'Phone', 'Course', 'Amount', 'Payment Status', 'Payment Time'];
    
    const csvRows = filteredBookings.map(b => {
      const date = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '';
      const time = b.createdAt ? new Date(b.createdAt).toLocaleTimeString() : '';
      const amount = b.amount ? b.amount.toString() : '';
      const payStatus = (b.paymentStatus === 'success' || b.paymentStatus === 'paid') ? 'Paid' : b.paymentStatus === 'failed' ? 'Failed' : 'Pending';
      const payTime = b.paymentTimestamp ? new Date(b.paymentTimestamp).toLocaleTimeString() : '';
      
      return [
        `"${date}"`,
        `"${time}"`,
        `"${b.name || ''}"`,
        `"${b.email || ''}"`,
        `"${b.phone || ''}"`,
        `"${b.course || ''}"`,
        amount,
        `"${payStatus}"`,
        `"${payTime}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className={styles.filters} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <button 
          onClick={exportToCSV}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            backgroundColor: '#000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📄 Export to CSV
        </button>
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
                  <td>
                    <div>{mounted ? new Date(b.createdAt!).toLocaleDateString() : '...'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{mounted ? new Date(b.createdAt!).toLocaleTimeString() : ''}</div>
                  </td>
                  <td><strong>{b.name}</strong></td>
                  <td>
                    <div>{b.email}</div>
                    <small>{b.phone}</small>
                  </td>
                  <td><span className={styles.badge}>{b.course}</span></td>
                  <td>{b.amount ? `GHS ${b.amount.toLocaleString()}` : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={`${styles.status} ${styles[b.paymentStatus || 'pending']}`} style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        backgroundColor: (b.paymentStatus === 'success' || b.paymentStatus === 'paid') ? '#def7ec' : b.paymentStatus === 'failed' ? '#fde8e8' : '#fef3c7',
                        color: (b.paymentStatus === 'success' || b.paymentStatus === 'paid') ? '#03543f' : b.paymentStatus === 'failed' ? '#9b1c1c' : '#92400e'
                      }}>
                        {(b.paymentStatus === 'success' || b.paymentStatus === 'paid') ? 'Paid' : b.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                      {(b.paymentStatus === 'success' || b.paymentStatus === 'paid') && b.paymentTimestamp && (
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                          Paid at: {mounted ? new Date(b.paymentTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      )}
                    </div>
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
