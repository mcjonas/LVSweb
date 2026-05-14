'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your enrollment...');
  const [token, setToken] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No transaction reference found.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`/api/learning/paystack/verify?reference=${reference}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setStatus('success');
          setMessage('Enrollment successful! Your account is active.');
          if (data.tempPassword) {
            setTempPassword(data.tempPassword);
          }
          if (data.token) {
            setToken(data.token);
            // Clear any previous student session before saving the new token
            localStorage.removeItem('lvs_learning_token');
            localStorage.setItem('lvs_learning_token', data.token);
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying the enrollment.');
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        {status === 'loading' && (
          <>
            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--rose)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
            <h2 style={{ color: 'var(--deep)', marginBottom: '1rem' }}>Setting up your account...</h2>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: '60px', height: '60px', background: 'var(--rose)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 1.5rem' }}>✓</div>
            <h2 style={{ color: 'var(--deep)', marginBottom: '1rem' }}>Welcome to the Learning Platform!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Your account has been created. We have automatically logged you in.
            </p>
            
            {tempPassword && (
              <div style={{ background: '#fdf8f5', border: '1px solid var(--gold)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--deep)', marginBottom: '0.5rem' }}>Please save your login password for future access:</p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--rose)', letterSpacing: '2px' }}>{tempPassword}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>(You can use this to log in on other devices)</p>
              </div>
            )}
            
            <Link href="/learning/dashboard" style={{ display: 'inline-block', background: 'var(--rose)', color: 'white', padding: '1rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', width: '100%' }}>
              Go to My Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: '60px', height: '60px', background: '#dc3545', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 1.5rem' }}>✕</div>
            <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Enrollment Failed</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>{message}</p>
            <Link href="/learning/courses" style={{ display: 'inline-block', background: 'var(--deep)', color: 'white', padding: '0.8rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold' }}>
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyLearningEnrollment() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>Loading verification...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
