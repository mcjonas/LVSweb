import LearningEnrollForm from './LearningEnrollForm';
import { getCourses } from '@/lib/actions';

export default async function LearningEnrollPage() {
  const courses = await getCourses();

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '6rem 2rem' }}>
      <LearningEnrollForm courses={courses} />
    </div>
  );
}
