'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Course } from '@/lib/schema';
import styles from '@/app/enroll/EnrollForm.module.css';

function FormContent({ courses }: { courses: Course[] }) {
  const searchParams = useSearchParams();
  const initialCourse = searchParams.get('course') || '';

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    country: '',
    maritalStatus: '',
    course: initialCourse,
    type: 'Single'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Map incoming database courses to our options
  const availableCourses = courses && courses.length > 0 
    ? courses.map(c => ({
        label: c.title,
        val: c.title,
        priceSingleGHS: c.priceSingleGHS || 0,
        priceCoupleGHS: c.priceCoupleGHS || 0,
      }))
    : [
        { label: 'Pre- Marital Counselling', val: 'Pre-Marital Counselling', priceSingleGHS: 1500, priceCoupleGHS: 1500 },
        { label: 'Post- Marital Counselling', val: 'Post-Marital Counselling', priceSingleGHS: 1200, priceCoupleGHS: 2000 },
      ]; // Fallback

  useEffect(() => {
    // If course from URL params matches partially, pre-select it
    if (!formData.course && availableCourses.length > 0) {
      setFormData(prev => ({ ...prev, course: availableCourses[0].val }));
    } else {
      const match = availableCourses.find(c => c.val.toLowerCase().includes(formData.course.toLowerCase()));
      if (match && match.val !== formData.course) {
        setFormData(prev => ({ ...prev, course: match.val }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCourseDetails = availableCourses.find(c => c.val === formData.course) || availableCourses[0];
  let courseAmount = 0;
  if (formData.type === 'Couple') {
    courseAmount = selectedCourseDetails?.priceCoupleGHS || selectedCourseDetails?.priceSingleGHS || 0;
  } else {
    courseAmount = selectedCourseDetails?.priceSingleGHS || selectedCourseDetails?.priceCoupleGHS || 0;
  }

  const totalAmount = courseAmount > 0 ? courseAmount + 200 : 0; // Adding Ghc200 for the registration form

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.name || !formData.email || !formData.phone || !formData.course || !formData.dob || !formData.gender || !formData.country || !formData.maritalStatus) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call LMS initialize endpoint
      const response = await fetch('/api/learning/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: totalAmount
        })
      });

      const data = await response.json();

      if (response.ok && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to initialize payment. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h1>Self-Paced Enrollment</h1>
        <p>Create your student account and get instant access to video modules.</p>
      </div>

      {error && <div className={styles.generalError}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Student&apos;s Full Name (Nombre/ nom) *</label>
          <input 
            type="text" 
            required 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Enter your answer"
          />
        </div>

        <div className={styles.formGroup}>
          <label>D.O.B (Fecha de nacimiento/ Date de naissance) *</label>
          <input 
            type="date" 
            required 
            value={formData.dob}
            onChange={(e) => setFormData({...formData, dob: e.target.value})}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Gender (El Género/ Le sexe) *</label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal', textTransform: 'none' }}>
              <input 
                type="radio" 
                name="gender" 
                value="Female" 
                required 
                checked={formData.gender === 'Female'}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                style={{ width: 'auto' }}
              />
              Female (Una mujer/ Une femme)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal', textTransform: 'none' }}>
              <input 
                type="radio" 
                name="gender" 
                value="Male" 
                required 
                checked={formData.gender === 'Male'}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                style={{ width: 'auto' }}
              />
              Male (Un hombre/ Un homme)
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Email address (El correo electrónico/ L&apos;adresse email) *</label>
          <input 
            type="email" 
            required 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Enter your answer"
          />
        </div>

        <div className={styles.formGroup}>
          <label>WhatsApp Contact *</label>
          <input 
            type="tel" 
            required 
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="Enter your answer"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Country (Nacionalidad/ Nationalité) *</label>
          <input 
            type="text" 
            required 
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            placeholder="Enter your answer"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Current status (tu situación actual/situation actuelle) *</label>
          <select 
            value={formData.maritalStatus}
            onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
            required
          >
            <option value="" disabled>Select your status...</option>
            <option value="Single">Single (Solo/célibataire)</option>
            <option value="In a relationship">In a relationship (En una relación/Dans une relation)</option>
            <option value="Married">Married (Casado(a) / Marié(e))</option>
            <option value="Divorced">Divorced (Divorciado/ Divorcé)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Which course/ program would you like to enrol in? <br/><span style={{fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'none'}}>(¿En qué curso te gustaría matricularte? / À quel cours souhaitez-vous vous inscrire ?)</span> *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {availableCourses.map((c, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontWeight: 'normal', textTransform: 'none', lineHeight: '1.4' }}>
                <input 
                  type="radio" 
                  name="course" 
                  value={c.val} 
                  required 
                  checked={formData.course === c.val}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                  style={{ width: 'auto', marginTop: '4px' }}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Enrollment Type (For Payment) *</label>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="Single">Single Enrollment</option>
            <option value="Couple">Couple Enrollment</option>
          </select>
        </div>

        <div className={styles.feeDisplay}>
          <h3>Total Investment</h3>
          <div className={styles.amount}>
            {totalAmount > 0 ? `GHS ${totalAmount.toLocaleString()}` : 'TBD'}
          </div>
          <p style={{fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: '1.4'}}>
            *This total amount includes your course fee (GHS {courseAmount.toLocaleString()}) plus a one-time <strong>GHS 200 registration form fee</strong>.<br/>
            You will be redirected to Paystack securely. Your student login details will be shown to you immediately after payment.
          </p>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

export default function LearningEnrollForm({ courses }: { courses: Course[] }) {
  return (
    <Suspense fallback={<div style={{textAlign: 'center', padding: '2rem'}}>Loading form...</div>}>
      <FormContent courses={courses} />
    </Suspense>
  );
}
