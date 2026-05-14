'use client';

import { useState, Suspense } from 'react';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';

function StudentLoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/learning/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('lvs_learning_token', data.token);
        window.location.href = '/learning/dashboard';
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '450px', width: '100%' }}>
          <h1 style={{ color: 'var(--deep)', marginBottom: '0.5rem', textAlign: 'center' }}>Student Login</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', textAlign: 'center' }}>Welcome back to your learning dashboard.</p>

          {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Password / Secure Code</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
            </div>

            <button type="submit" disabled={loading} style={{ background: 'var(--rose)', color: 'white', padding: '1rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '1rem' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>}>
      <StudentLoginContent />
    </Suspense>
  );
}
