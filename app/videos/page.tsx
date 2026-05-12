'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Video {
  id: number;
  title: string;
  createdAt: string;
}

function VideosContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState<{ url: string, title: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No access token provided. Please use the link sent to your email or from the success page.');
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        const res = await fetch(`/api/videos?token=${token}`);
        const data = await res.json();
        if (data.success) {
          setVideos(data.videos);
        } else {
          setError(data.error || 'Failed to load videos.');
        }
      } catch (err) {
        setError('Error fetching videos.');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [token]);

  const playVideo = async (id: number) => {
    try {
      const res = await fetch(`/api/videos/${id}?token=${token}`);
      const data = await res.json();
      if (data.success) {
        setActiveVideo({ url: data.url, title: data.title });
      } else {
        alert(data.error || 'Could not load video.');
      }
    } catch (err) {
      alert('Error fetching secure video URL.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading secure sessions...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary)' }}>
        <h2>Access Denied</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Your Recorded Sessions</h1>
      
      {activeVideo && (
        <div style={{ marginBottom: '3rem', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', background: '#222', color: '#fff', fontWeight: 'bold' }}>
            Now Playing: {activeVideo.title}
          </div>
          <video 
            src={activeVideo.url} 
            controls 
            autoPlay
            style={{ width: '100%', maxHeight: '600px', display: 'block' }} 
          />
        </div>
      )}

      {videos.length === 0 ? (
        <p>No recorded sessions available yet. Please check back later.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {videos.map(video => (
            <div key={video.id} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{video.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Recorded on: {new Date(video.createdAt).toLocaleDateString()}
              </p>
              <button 
                onClick={() => playVideo(video.id)}
                style={{ background: '#000', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '1rem', fontSize: '1rem' }}
              >
                ▶ Watch Session
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>}>
      <VideosContent />
    </Suspense>
  );
}
