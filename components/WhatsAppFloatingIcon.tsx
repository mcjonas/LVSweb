'use client';

import { useState, useEffect } from 'react';

export default function WhatsAppFloatingIcon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay appearance for a smooth entrance
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <a
        href="https://wa.me/233503915160"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        id="whatsapp-floating-btn"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37, 211, 102, 0.45)',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, opacity 0.5s ease',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.5)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.12)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37, 211, 102, 0.55)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37, 211, 102, 0.45)';
        }}
      >
        {/* WhatsApp SVG Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="white"
        >
          <path d="M16.004 0C7.164 0 0 7.163 0 16.004a15.94 15.94 0 0 0 2.14 7.99L.076 32l8.18-2.146A15.92 15.92 0 0 0 16.004 32C24.836 32 32 24.836 32 16.004 32 7.163 24.836 0 16.004 0zm0 29.317a13.26 13.26 0 0 1-6.77-1.855l-.486-.288-5.03 1.32 1.342-4.9-.316-.503A13.27 13.27 0 0 1 2.683 16.004 13.32 13.32 0 0 1 16.004 2.683 13.32 13.32 0 0 1 29.317 16.004 13.32 13.32 0 0 1 16.004 29.317zm7.296-9.95c-.4-.2-2.368-1.17-2.735-1.303-.367-.133-.634-.2-.9.2-.268.4-1.035 1.303-1.27 1.57-.233.268-.467.3-.867.1-.4-.2-1.688-.622-3.216-1.984-1.189-1.06-1.99-2.37-2.224-2.77-.233-.4-.024-.616.176-.815.18-.18.4-.467.6-.7.2-.234.267-.4.4-.668.134-.267.067-.5-.033-.7-.1-.2-.9-2.17-1.234-2.97-.325-.78-.655-.675-.9-.687l-.767-.012a1.47 1.47 0 0 0-1.067.5c-.367.4-1.4 1.37-1.4 3.34s1.433 3.873 1.633 4.14c.2.267 2.82 4.305 6.832 6.036.955.412 1.7.658 2.28.843.958.305 1.83.262 2.52.16.77-.115 2.368-.968 2.702-1.903.333-.935.333-1.736.233-1.903-.1-.168-.367-.268-.767-.468z"/>
        </svg>
      </a>

      {/* Pulse animation */}
      <style>{`
        @keyframes whatsapp-pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.5); }
          70% { box-shadow: 0 0 0 18px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        #whatsapp-floating-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: whatsapp-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }
        @media (max-width: 480px) {
          #whatsapp-floating-btn {
            width: 52px !important;
            height: 52px !important;
            bottom: 20px !important;
            right: 20px !important;
          }
          #whatsapp-floating-btn svg {
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
    </>
  );
}
