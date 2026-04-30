import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Love Vibe Studios | Where Love is Learned and Not Left to Chance',
  description: 'Professional online courses & programmes for pre-marital preparation, post-marital growth, sex in marriage, legal guidance, and thriving beyond divorce.',
  keywords: 'marriage counseling, pre-marital counseling, relationship courses, love coaching, Ghana',
  openGraph: {
    title: 'Love Vibe Studios',
    description: 'Where love is learned and not left to chance.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
