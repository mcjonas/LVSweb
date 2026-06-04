'use client';

import { useState, useEffect } from 'react';
import styles from './bookings.module.css';
import { Booking } from '@/lib/schema';
import ExcelJS from 'exceljs';

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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    worksheet.columns = [
      { header: 'Date',           key: 'date',          width: 15 },
      { header: 'Time',           key: 'time',          width: 12 },
      { header: 'Name',           key: 'name',          width: 25 },
      { header: 'Email',          key: 'email',         width: 30 },
      { header: 'Phone',          key: 'phone',         width: 18 },
      { header: 'Course',         key: 'course',        width: 35 },
      { header: 'Amount',         key: 'amount',        width: 12 },
      { header: 'Payment Status', key: 'paymentStatus', width: 18 },
      { header: 'Payment Time',   key: 'paymentTime',   width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF107C41' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const b of filteredBookings) {
      const createdAt = b.createdAt ? new Date(b.createdAt) : null;
      const payStatus =
        b.paymentStatus === 'success' || b.paymentStatus === 'paid' ? 'Paid'
        : b.paymentStatus === 'failed' ? 'Failed'
        : 'Pending';

      worksheet.addRow({
        date:          createdAt ? createdAt.toLocaleDateString() : '',
        time:          createdAt ? createdAt.toLocaleTimeString() : '',
        name:          b.name || '',
        email:         b.email || '',
        phone:         b.phone || '',
        course:        b.course || '',
        amount:        b.amount ?? '',
        paymentStatus: payStatus,
        paymentTime:   b.paymentTimestamp
          ? new Date(b.paymentTimestamp).toLocaleTimeString()
          : '',
      });
    }

    // Write to buffer and trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          onClick={exportToExcel}
          style={{
            marginLeft: 'auto',
            padding: '0.5rem 1rem',
            backgroundColor: '#107c41',
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
          📊 Export to Excel
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
                  <td>
                    <span className={styles.badge}>{b.course}</span>
                    {b.bookingDate && b.bookingTime && (
                      <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#7b3fa0', fontWeight: '600' }}>
                        📅 {new Date(b.bookingDate).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })} at {b.bookingTime}
                      </div>
                    )}
                    {b.notes && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#555', fontStyle: 'italic', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        📝 {b.notes}
                      </div>
                    )}
                  </td>
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
