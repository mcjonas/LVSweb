export const dynamic = 'force-dynamic';

import { getCourses } from '@/lib/actions';
import Navbar from '@/components/public/Navbar/Navbar';
import Footer from '@/components/public/Footer/Footer';
import EnrollForm from './EnrollForm';
import { Course } from '@/lib/schema';

export default async function EnrollPage() {
  const dbCourses = await getCourses();
  
  // Serialize courses to avoid Date object serialization error between Server and Client Components
  const serializedCourses = dbCourses.map(c => ({
    ...c,
    createdAt: null
  })) as any as Course[];
  
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--cream)', paddingBottom: '4rem' }}>
        <EnrollForm courses={serializedCourses} />
      </main>
      <Footer />
    </>
  );
}
