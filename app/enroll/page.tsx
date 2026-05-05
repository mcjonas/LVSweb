import { getCourses } from '@/lib/actions';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import EnrollForm from './EnrollForm';

export default async function EnrollPage() {
  const dbCourses = await getCourses();
  
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--cream)', paddingBottom: '4rem' }}>
        <EnrollForm courses={dbCourses} />
      </main>
      <Footer />
    </>
  );
}
