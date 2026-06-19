import Navbar from '@/components/public/Navbar/Navbar';
import Hero from '@/components/public/Hero/Hero';
import Stats from '@/components/public/Stats/Stats';
import Services from '@/components/public/Services/Services';
import HowItWorks from '@/components/public/HowItWorks/HowItWorks';
import Founder from '@/components/public/Founder/Founder';
import Testimonials from '@/components/public/Testimonials/Testimonials';
import Pricing from '@/components/public/Pricing/Pricing';
import CountryManagers from '@/components/public/CountryManagers/CountryManagers';
import Books from '@/components/public/Books/Books';
import Enquiries from '@/components/public/Enquiries/Enquiries';
import SocialBar from '@/components/public/SocialBar/SocialBar';
import Footer from '@/components/public/Footer/Footer';
import ScrollAnimations from '@/components/public/ScrollAnimations/ScrollAnimations';
import { getCourses } from '@/lib/actions';

export default async function Home() {
  const courses = await getCourses();
  
  const rawPrograms = courses.length > 0
    ? [...courses.map(c => c.title), 'Not sure — I need guidance']
    : [
        'Pre-Marital Counseling',
        'Post-Marital Counseling',
        'Sex in Marriage',
        'Legal Advice: Marriage & Divorce',
        'Crisis Management in Marriage',
        'Thriving Beyond Divorce',
        'Not sure — I need guidance'
      ];
      
  const programs = Array.from(new Set(rawPrograms));

  return (
    <>
      <ScrollAnimations />
      <Navbar />
      <Hero />
      <Stats />
      <Services />
      <HowItWorks />
      <Founder />
      <Testimonials />
      <Pricing />
      <CountryManagers />
      <Books />
      <Enquiries />
      <SocialBar />
      <Footer />
    </>
  );
}
