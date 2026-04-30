import Navbar from '@/components/public/Navbar/Navbar';
import Hero from '@/components/public/Hero/Hero';
import Stats from '@/components/public/Stats/Stats';
import Services from '@/components/public/Services/Services';
import HowItWorks from '@/components/public/HowItWorks/HowItWorks';
import Founder from '@/components/public/Founder/Founder';
import Testimonials from '@/components/public/Testimonials/Testimonials';
import Pricing from '@/components/public/Pricing/Pricing';
import Contact from '@/components/public/Contact/Contact';
import Books from '@/components/public/Books/Books';
import Enquiries from '@/components/public/Enquiries/Enquiries';
import SocialBar from '@/components/public/SocialBar/SocialBar';
import Footer from '@/components/public/Footer/Footer';
import ScrollAnimations from '@/components/public/ScrollAnimations/ScrollAnimations';

export default function Home() {
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
      <Contact />
      <Books />
      <Enquiries />
      <SocialBar />
      <Footer />
    </>
  );
}
