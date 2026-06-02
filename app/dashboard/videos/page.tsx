'use client';

import { useState } from 'react';

export default function VideosDashboard() {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [zoomId, setZoomId] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');

  const handleAddZoomVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !downloadUrl) {
      setMessage('Please provide a title and the Zoom recording link.');
      return;
    }

    setUploading(true);
    setMessage('Saving to database...');

    try {
      const dbRes = await fetch('/api/videos/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          zoomId: zoomId || `zoom_${Date.now()}`,
          downloadUrl,
          passcode,
        }),
      });

      if (!dbRes.ok) {
        throw new Error('Failed to save to database');
      }

      setMessage('Zoom video added successfully! Your students can now access this session.');
      setTitle('');
      setZoomId('');
      setDownloadUrl('');
      setPasscode('');

    } catch (error: any) {
      console.error(error);
      setMessage(`Operation failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Manage Course Videos (Zoom Flow)</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Add your Zoom recording links here. These will be available to students in their dashboard and LMS classroom.
      </p>

      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Add Zoom Recording</h2>
        
        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', background: message.includes('failed') ? '#ffebee' : '#e8f5e9', color: message.includes('failed') ? '#c62828' : '#2e7d32' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleAddZoomVideo} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Session Title (e.g. Session 1 - Introduction)</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter session title..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={uploading}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Zoom Recording Link (Direct MP4 URL or Share Link)</label>
            <input 
              type="url" 
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://zoom.us/rec/share/..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={uploading}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Passcode (Optional)</label>
            <input 
              type="text" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter Zoom passcode if required..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={uploading}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Zoom Recording ID (Optional)</label>
            <input 
              type="text" 
              value={zoomId}
              onChange={(e) => setZoomId(e.target.value)}
              placeholder="Enter Zoom ID if available..."
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={uploading}
            />
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            style={{ 
              background: uploading ? '#ccc' : '#0b5ed7', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {uploading ? 'Processing...' : 'Add Video to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
