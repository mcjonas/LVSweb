import type { Metadata } from 'next';
import './globals.css';
import LenisProvider from '@/components/LenisProvider';
import WhatsAppFloatingIcon from '@/components/WhatsAppFloatingIcon';

export const metadata: Metadata = {
  title: 'Love Vibe Studio',
  description: 'Professional online courses & programmes for pre-marital preparation, post-marital growth, sex in marriage, legal guidance, and thriving beyond divorce.',
  keywords: 'marriage counseling, pre-marital counseling, relationship courses, love coaching, Ghana',
  openGraph: {
    title: 'Love Vibe Studio',
    description: 'Where love is learned and not left to chance.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LenisProvider>
          {children}
        </LenisProvider>
        <WhatsAppFloatingIcon />
      </body>
    </html>
  );
}
