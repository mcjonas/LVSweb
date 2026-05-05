'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

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

  return (
    <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '500px', margin: '0 1rem', width: '100%' }}>
      {status === 'loading' && (
        <>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Processing...</h2>
          <p style={{ color: 'var(--muted)' }}>{message}</p>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ width: '60px', height: '60px', background: 'var(--accent)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 1.5rem' }}>✓</div>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Payment Successful!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Thank you for enrolling. Your payment has been confirmed and we have secured your spot.</p>
          <Link href="/" style={{ display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold' }}>
            Return to Home
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ width: '60px', height: '60px', background: '#dc3545', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 1.5rem' }}>✕</div>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Verification Failed</h2>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>{message}</p>
          <Link href="/enroll" style={{ display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold' }}>
            Try Again
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyPayment() {
  return (
    <Suspense fallback={
      <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', textAlign: 'center' }}>
        Loading verification...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
