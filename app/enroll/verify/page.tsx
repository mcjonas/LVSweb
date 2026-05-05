import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import VerifyPayment from './VerifyPayment';

export default function VerifyPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '120px', minHeight: '80vh', background: 'var(--cream)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <VerifyPayment />
      </main>
      <Footer />
    </>
  );
}
