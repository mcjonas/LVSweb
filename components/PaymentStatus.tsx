'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No transaction reference found.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage('Payment verified successfully!');
          if (data.token) {
            localStorage.setItem('lvs_learning_token', data.token);
          }
          if (data.courseId) {
            setCourseId(data.courseId);
          }
          if (data.tempPassword) {
            setTempPassword(data.tempPassword);
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying the payment.');
      }
    };

    verifyPayment();
  }, [reference]);

  const handleContinueToLearning = () => {
    if (courseId) {
      window.location.href = `/learning/course/${courseId}`;
    } else {
      window.location.href = '/learning/dashboard';
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '3rem',
      borderRadius: '24px',
      boxShadow: '0 20px 40px rgba(45, 27, 78, 0.1)',
      textAlign: 'center',
      maxWidth: '550px',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(123, 63, 160, 0.1)'
    }}>
      {/* Decorative background element */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        background: 'var(--blush)',
        opacity: 0.2,
        zIndex: 0
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {status === 'loading' && (
          <>
            <div className="animate-spin-custom" style={{
              width: '60px',
              height: '60px',
              border: '4px solid var(--cream)',
              borderTop: '4px solid var(--rose)',
              borderRadius: '50%',
              margin: '0 auto 2rem'
            }}></div>
            <h2 style={{ color: 'var(--deep)', fontSize: '2rem', marginBottom: '1rem', fontWeight: '600' }}>Processing</h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="animate-scale-in" style={{
              width: '80px',
              height: '80px',
              background: 'var(--rose)',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 2rem',
              boxShadow: '0 10px 20px rgba(123, 63, 160, 0.3)',
            }}>✓</div>
            <h2 style={{ color: 'var(--deep)', fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: '600' }}>Thank You!</h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Your enrollment in our course is now confirmed. We've received your payment and secured your spot. A confirmation email has been sent to your inbox.
            </p>
            {tempPassword && (
              <div style={{ background: '#fdf8f5', border: '1px solid var(--gold)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--deep)', marginBottom: '0.5rem' }}>Please save your login password:</p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--rose)', letterSpacing: '2px' }}>{tempPassword}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>(Use this password whenever you want to log in to learn at your self-paced learning)</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-ghost" style={{ padding: '1rem 2rem' }}>
                Return Home
              </Link>
              <button
                onClick={handleContinueToLearning}
                className="btn-primary"
                style={{ padding: '1rem 2rem', background: 'var(--rose)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none' }}
              >
                Start Learning Now
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="animate-scale-in" style={{
              width: '80px',
              height: '80px',
              background: '#ef4444',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 2rem',
              boxShadow: '0 10px 20px rgba(239, 68, 68, 0.2)'
            }}>✕</div>
            <h2 style={{ color: 'var(--deep)', fontSize: '2.2rem', marginBottom: '1rem', fontWeight: '600' }}>Verification Failed</h2>
            <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>{message}</p>
            <Link href="/enroll" className="btn-ghost" style={{ padding: '1rem 2rem' }}>
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatus() {
  return (
    <Suspense fallback={
      <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', textAlign: 'center', maxWidth: '550px', width: '100%' }}>
        <h2 style={{ color: 'var(--deep)' }}>Loading...</h2>
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
