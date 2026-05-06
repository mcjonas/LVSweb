import PaymentStatus from '@/components/PaymentStatus';

export const metadata = {
  title: 'Payment Status | Love Vibe Studios',
  description: 'Verifying your course enrollment payment.',
};

export default function PaymentSuccessPage() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--cream)',
      padding: '20px'
    }}>
      <PaymentStatus />
    </main>
  );
}
