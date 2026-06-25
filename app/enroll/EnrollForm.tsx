'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Course } from '@/lib/schema';
import styles from './EnrollForm.module.css';

const TUE_FRI_SLOTS = [
  { val: '09:00', label: '9:00 AM - 10:00 AM' },
  { val: '10:00', label: '10:00 AM - 11:00 AM' },
  { val: '11:00', label: '11:00 AM - 12:00 PM' },
  { val: '12:00', label: '12:00 PM - 1:00 PM' },
  { val: '13:00', label: '1:00 PM - 2:00 PM' },
  { val: '14:00', label: '2:00 PM - 3:00 PM' },
  { val: '15:00', label: '3:00 PM - 4:00 PM' },
  { val: '16:00', label: '4:00 PM - 5:00 PM' },
];

const SAT_SLOTS = [
  { val: '12:00', label: '12:00 PM - 1:00 PM' },
  { val: '13:00', label: '1:00 PM - 2:00 PM' },
  { val: '14:00', label: '2:00 PM - 3:00 PM' },
  { val: '15:00', label: '3:00 PM - 4:00 PM' },
  { val: '16:00', label: '4:00 PM - 5:00 PM' },
  { val: '17:00', label: '5:00 PM - 6:00 PM' },
];

const BOOKING_OPTIONS = [
  { label: 'Walk-In Session (Solo)', val: 'Walk-In Session (Solo)', priceSingleGHS: 500, priceCoupleGHS: 500, isSpecial: true, details: 'In-person / Solo @ Adenta' },
  { label: 'Walk-In Session (Joint)', val: 'Walk-In Session (Joint)', priceSingleGHS: 850, priceCoupleGHS: 850, isSpecial: true, details: 'In-person / Couple @ Adenta' },
  { label: 'Telephone Session', val: 'Telephone Session', priceSingleGHS: 200, priceCoupleGHS: 200, isSpecial: true, details: 'Local / Regular voice call' },
  { label: 'Online WhatsApp Call', val: 'Online WhatsApp Call', priceSingleGHS: 350, priceCoupleGHS: 350, isSpecial: true, details: 'Voice & Video on WhatsApp' },
  { label: 'Virtual Audio Session', val: 'Virtual Audio Session', priceSingleGHS: 400, priceCoupleGHS: 400, isSpecial: true, details: 'Google Meet or Zoom audio' },
  { label: 'Virtual Video Session', val: 'Virtual Video Session', priceSingleGHS: 600, priceCoupleGHS: 600, isSpecial: true, details: 'Google Meet or Zoom video' },
];

function FormContent({ courses }: { courses: Course[] }) {
  const searchParams = useSearchParams();
  const initialCourse = searchParams.get('course') || '';

  const dbCoursesMapped = courses && courses.length > 0 
    ? courses.map(c => ({
        label: c.title,
        val: c.title,
        priceSingleGHS: c.priceSingleGHS || 0,
        priceCoupleGHS: c.priceCoupleGHS || 0,
        isSpecial: false,
        details: c.description
      }))
    : [
        { label: 'Pre-Marital Counselling', val: 'Pre-Marital Counselling', priceSingleGHS: 1500, priceCoupleGHS: 2500, isSpecial: false, details: 'Counselling program' },
        { label: 'Post-Marital Counselling', val: 'Post-Marital Counselling', priceSingleGHS: 1200, priceCoupleGHS: 2000, isSpecial: false, details: 'Counselling program' },
      ];

  const isBookingFlow = searchParams.get('booking') === 'true' || 
    BOOKING_OPTIONS.some(opt => opt.val.toLowerCase() === initialCourse.toLowerCase());

  const availableCourses = isBookingFlow ? BOOKING_OPTIONS : dbCoursesMapped;

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    country: '',
    maritalStatus: '',
    course: initialCourse || (availableCourses[0]?.val || ''),
    type: 'Single'
  });

  // Booking Flow Specific States
  const [step, setStep] = useState(1);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [bookedSlots, setBookedSlots] = useState<{ bookingDate: string; bookingTime: string; course: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-select initial course matching URL param
  useEffect(() => {
    if (initialCourse) {
      const matched = availableCourses.find(c => c.val.toLowerCase() === initialCourse.toLowerCase());
      if (matched) {
        setFormData(prev => ({ ...prev, course: matched.val }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourse]);

  // Fetch booked slots if in special booking flow
  useEffect(() => {
    if (isBookingFlow) {
      setIsLoadingSlots(true);
      fetch('/api/bookings/booked-slots')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBookedSlots(data);
          }
        })
        .catch(err => console.error('Error fetching booked slots:', err))
        .finally(() => setIsLoadingSlots(false));
    }
  }, [isBookingFlow]);

  const selectedCourseDetails = availableCourses.find(c => c.val === formData.course) || availableCourses[0];
  const isSpecial = selectedCourseDetails?.isSpecial || false;

  let courseAmount = 0;
  if (formData.type === 'Couple') {
    courseAmount = selectedCourseDetails?.priceCoupleGHS || selectedCourseDetails?.priceSingleGHS || 0;
  } else {
    courseAmount = selectedCourseDetails?.priceSingleGHS || selectedCourseDetails?.priceCoupleGHS || 0;
  }

  const totalAmount = courseAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Field validations for final submit
    if (isSpecial) {
      if (!formData.name || !formData.email || !formData.phone || !selectedDateStr || !selectedTime) {
        setError('Please fill in all required fields and pick a slot.');
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!formData.name || !formData.email || !formData.phone || !formData.course || !formData.dob || !formData.gender || !formData.country || !formData.maritalStatus) {
        setError('Please fill in all required fields.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: totalAmount,
          bookingDate: isSpecial ? selectedDateStr : null,
          bookingTime: isSpecial ? selectedTime : null,
          notes: isSpecial ? notes : null
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

  // Calendar Helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });

  const firstDayIndex = getFirstDayOfMonth(year, month);
  const totalDays = getDaysInMonth(year, month);

  const blanks = Array(firstDayIndex).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  const formatDateString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getDayOfWeek = (y: number, m: number, d: number) => {
    return new Date(y, m, d).getDay();
  };

  const isWalkIn = formData.course.toLowerCase().includes('walk-in');

  const isTimeSlotBooked = (timeVal: string) => {
    if (!isWalkIn) return false;
    return bookedSlots.some(b => 
      b.bookingDate === selectedDateStr && 
      b.bookingTime === timeVal && 
      (b.course || '').toLowerCase().includes('walk-in')
    );
  };

  const isTimeSlotInPast = (timeVal: string) => {
    const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
    if (selectedDateStr !== todayStr) return false;
    
    const [slotHour] = timeVal.split(':').map(Number);
    const currentHour = new Date().getHours();
    return slotHour <= currentHour;
  };

  // Determine current day slots
  let timeSlots: { val: string; label: string }[] = [];
  if (selectedDateStr) {
    const [selY, selM, selD] = selectedDateStr.split('-').map(Number);
    const dayOfWeek = getDayOfWeek(selY, selM - 1, selD);
    if (dayOfWeek >= 2 && dayOfWeek <= 5) {
      timeSlots = TUE_FRI_SLOTS;
    } else if (dayOfWeek === 6) {
      timeSlots = SAT_SLOTS;
    }
  }

  // WIZARD RENDER (Special Bookings)
  if (isSpecial) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.header}>
          <h1>Schedule Private Session</h1>
          <p>Book a one-on-one session with Relationship Guidance.</p>
        </div>

        {/* Step Indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${((step - 1) / 3) * 100}%` }} />
          <div className={`${styles.stepDot} ${step >= 1 ? styles.active : ''} ${step > 1 ? styles.completed : ''}`}>1</div>
          <div className={`${styles.stepDot} ${step >= 2 ? styles.active : ''} ${step > 2 ? styles.completed : ''}`}>2</div>
          <div className={`${styles.stepDot} ${step >= 3 ? styles.active : ''} ${step > 3 ? styles.completed : ''}`}>3</div>
          <div className={`${styles.stepDot} ${step >= 4 ? styles.active : ''}`}>4</div>
        </div>

        {error && <div className={styles.generalError}>{error}</div>}

        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className={styles.timeSectionTitle} style={{marginTop: 0}}>1. Choose Service Type</h2>
            <div className={styles.serviceGrid}>
              {BOOKING_OPTIONS.map((opt) => (
                <div 
                  key={opt.val} 
                  className={`${styles.serviceCard} ${formData.course === opt.val ? styles.selected : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, course: opt.val }))}
                >
                  <h3>{opt.label}</h3>
                  <div className={styles.servicePrice}>GHS {opt.priceSingleGHS.toLocaleString()}</div>
                  <div className={styles.serviceMeta}>
                    <span>Format: <strong>{opt.details}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.wizardControls}>
              <div />
              <button 
                type="button" 
                className={styles.nextBtn}
                onClick={() => setStep(2)}
                disabled={!formData.course}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Calendar Slot Picker */}
        {step === 2 && (
          <div>
            <h2 className={styles.timeSectionTitle} style={{marginTop: 0}}>2. Select Date & Time Slot</h2>
            {isLoadingSlots ? (
              <div style={{textAlign: 'center', padding: '2rem'}}>Loading slot availability...</div>
            ) : (
              <>
                <div className={styles.calendarContainer}>
                  <div className={styles.calendarNav}>
                    <button 
                      type="button" 
                      onClick={handlePrevMonth}
                      className={styles.calendarNavBtn}
                      disabled={year === today.getFullYear() && month === today.getMonth()}
                    >
                      &lt;
                    </button>
                    <span className={styles.calendarMonthName}>{monthName} {year}</span>
                    <button type="button" onClick={handleNextMonth} className={styles.calendarNavBtn}>&gt;</button>
                  </div>

                  <div className={styles.calendarGridName}>
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>

                  <div className={styles.calendarGridDays}>
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className={`${styles.calendarDay} ${styles.empty}`} />;
                      }

                      const dateStr = formatDateString(year, month, day);
                      const dayOfWeek = getDayOfWeek(year, month, day);
                      
                      // Filter: Sundays & Mondays: completely hidden/blocked
                      const isBlockedDay = dayOfWeek === 0 || dayOfWeek === 1;
                      
                      const cellDate = new Date(year, month, day);
                      const isPastDay = cellDate < today;

                      const isSelected = selectedDateStr === dateStr;
                      const isDisabled = isBlockedDay || isPastDay;

                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedDateStr(dateStr);
                            setSelectedTime(''); // Reset time selection
                          }}
                          className={`${styles.calendarDay} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.blocked : ''}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDateStr && (
                  <div>
                    <h3 className={styles.timeSectionTitle}>Available Hours for {new Date(selectedDateStr).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    {timeSlots.length > 0 ? (
                      <div className={styles.timeSlotsGrid}>
                        {timeSlots.map((slot) => {
                          const isBooked = isTimeSlotBooked(slot.val);
                          const isPast = isTimeSlotInPast(slot.val);
                          const isSlotSelected = selectedTime === slot.val;

                          return (
                            <button
                              key={slot.val}
                              type="button"
                              disabled={isBooked || isPast}
                              onClick={() => setSelectedTime(slot.val)}
                              className={`${styles.timeSlotBtn} ${isSlotSelected ? styles.selected : ''}`}
                            >
                              {slot.label.split(' - ')[0]}
                              {isBooked && <div style={{fontSize: '0.65rem', color: '#ff7878'}}>Booked</div>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{color: '#ff7878', fontSize: '0.9rem'}}>No time slots available on this day.</div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className={styles.wizardControls}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>Back</button>
              <button 
                type="button" 
                className={styles.nextBtn}
                onClick={() => setStep(3)}
                disabled={!selectedDateStr || !selectedTime}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Customer Details Form */}
        {step === 3 && (
          <div>
            <h2 className={styles.timeSectionTitle} style={{marginTop: 0}}>3. Fill in Your Details</h2>
            
            <div className={styles.formGroup}>
              <label>Full Name *</label>
              <input 
                type="text" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email Address *</label>
              <input 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>WhatsApp Number *</label>
              <input 
                type="tel" 
                required 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g. +233 55 123 4567"
              />
            </div>

            {/* Quick additional fields to align with DB schema */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label>D.O.B *</label>
                <input 
                  type="date" 
                  required
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Gender *</label>
                <select 
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Country *</label>
                <input 
                  type="text" 
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="Your country"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Marital Status *</label>
                <select 
                  required
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
                >
                  <option value="" disabled>Select...</option>
                  <option value="Single">Single</option>
                  <option value="In a relationship">In a relationship</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Special Notes / Request</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special details or topics you want to discuss..."
                rows={3}
              />
            </div>

            <div className={styles.wizardControls}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>Back</button>
              <button 
                type="button" 
                className={styles.nextBtn}
                onClick={() => setStep(4)}
                disabled={!formData.name || !formData.email || !formData.phone || !formData.dob || !formData.gender || !formData.country || !formData.maritalStatus}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review and Pay via Paystack */}
        {step === 4 && (
          <div>
            <h2 className={styles.timeSectionTitle} style={{marginTop: 0}}>4. Review Booking Details</h2>
            
            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span>Session:</span>
                <strong>{selectedCourseDetails?.label}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Date:</span>
                <strong>{new Date(selectedDateStr).toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Time Slot:</span>
                <strong>{selectedTime ? (TUE_FRI_SLOTS.find(s => s.val === selectedTime) || SAT_SLOTS.find(s => s.val === selectedTime))?.label : ''}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Client Name:</span>
                <strong>{formData.name}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Contact:</span>
                <strong>{formData.phone}</strong>
              </div>
              {notes && (
                <div className={styles.summaryRow} style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                  <span>Notes:</span>
                  <p style={{fontSize: '0.85rem', color: 'var(--deep)', margin: '0.3rem 0 0 0', fontStyle: 'italic'}}>{notes}</p>
                </div>
              )}
            </div>

            <div className={styles.feeDisplay}>
              <h3>Total Investment</h3>
              <div className={styles.amount}>
                GHS {totalAmount.toLocaleString()}
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: '1.4'}}>
                You will be redirected to Paystack to complete your secure payment.
              </p>
            </div>

            <div className={styles.wizardControls}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(3)}>Back</button>
              <button 
                type="submit" 
                className={styles.nextBtn}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Initializing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD COURSE ENROLLMENT FORM
  return (
    <div className={styles.formContainer}>
      <div className={styles.header}>
        <h1>Course Enrollment</h1>
        <p>Take the next step in your relationship journey.</p>
      </div>

      {error && <div className={styles.generalError}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Full Name (Nombre/ nom) *</label>
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
          <label>Which course/ program would you like to enrol in? *</label>
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
            You will be redirected to Paystack to complete your payment securely.
          </p>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}

export default function EnrollForm({ courses }: { courses: Course[] }) {
  return (
    <Suspense fallback={<div style={{textAlign: 'center', padding: '2rem'}}>Loading form...</div>}>
      <FormContent courses={courses} />
    </Suspense>
  );
}
