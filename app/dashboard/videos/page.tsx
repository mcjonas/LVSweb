'use client';

import { useState, useEffect } from 'react';
import styles from '../dashboard.module.css'; // Adjust path if needed

interface Video {
  id: number;
  title: string;
  createdAt: string;
}

export default function VideosDashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  // Fetch existing videos (we can reuse the /api/videos route but we need one without token validation for admin, or just fetch directly here using a server action. For simplicity, we can create a quick fetch or just use a Server Component.)
  // Actually, since this is a client component, we will fetch from a new admin API or just display a message.
  // Wait, let's just make this a client component for the upload logic, but we could list videos using a server component.
  // We'll just fetch from an admin API if we had one. For now, let's just implement the upload.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setMessage('Please provide a title and select a file.');
      return;
    }

    setUploading(true);
    setMessage('Generating upload signature...');

    try {
      // 1. Get Signature from our server
      const sigRes = await fetch('/api/cloudinary/sign', { method: 'POST' });
      const sigData = await sigRes.json();

      if (!sigData.signature) {
        throw new Error('Failed to get signature');
      }

      setMessage('Uploading video to Cloudinary (this may take a few minutes)...');

      // 2. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp.toString());
      formData.append('signature', sigData.signature);
      formData.append('folder', 'zoom_recordings'); // Match the folder in the signature

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        console.error('Cloudinary upload error:', uploadData);
        throw new Error('Failed to upload to Cloudinary');
      }

      setMessage('Saving to database...');

      // 3. Save to Database
      const dbRes = await fetch('/api/videos/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          cloudinaryPublicId: uploadData.public_id,
        }),
      });

      if (!dbRes.ok) {
        throw new Error('Failed to save to database');
      }

      setMessage('Upload successful! Your video is now available to paid users.');
      setTitle('');
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('videoFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error(error);
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Manage Course Videos</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        Manually upload your local Zoom recordings here. Once uploaded, they will be securely available to paid users.
      </p>

      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Upload New Video</h2>
        
        {message && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', background: message.includes('failed') ? '#ffebee' : '#e8f5e9', color: message.includes('failed') ? '#c62828' : '#2e7d32' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Video Title (e.g. Session 1 - Introduction)</label>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select MP4 Video File</label>
            <input 
              id="videoFile"
              type="file" 
              accept="video/mp4"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }}
              disabled={uploading}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            style={{ 
              background: uploading ? '#ccc' : 'var(--accent)', 
              color: 'white', 
              padding: '1rem', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Video to Cloudinary'}
          </button>
        </form>
      </div>
    </div>
  );
}
