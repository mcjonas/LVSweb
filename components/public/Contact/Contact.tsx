'use client';

import { useState } from 'react';
import { submitEnquiry } from '@/lib/actions';
import styles from './Contact.module.css';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    const fd = new FormData(e.currentTarget);
    const result = await submitEnquiry({
      firstName: fd.get('firstName') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      program: fd.get('program') as string,
      message: fd.get('message') as string,
    });
    setStatus(result.success ? 'success' : 'error');
  }

  return (
    <section className={styles.contact} id="contact">
      <div className={`${styles.inner} fade-in`}>
        <div className={styles.tag}>Take a Course</div>
        <h2>Start Your <em>Journey</em> Today</h2>
        <p>Fill in the form below and one of our counselors will reach out within 24 hours to schedule your free discovery call.</p>

        {status === 'success' ? (
          <div className={styles.success}>
            💛 Thank you! We will be in touch within 24 hours to schedule your free discovery call.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <div className={styles.group}>
                <label>First Name</label>
                <input name="firstName" type="text" placeholder="Your first name" required />
              </div>
              <div className={styles.group}>
                <label>Last Name</label>
                <input name="lastName" type="text" placeholder="Your last name" required />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.group}>
                <label>Email Address</label>
                <input name="email" type="email" placeholder="you@email.com" required />
              </div>
              <div className={styles.group}>
                <label>Phone (optional)</label>
                <input name="phone" type="tel" placeholder="+1 000 000 0000" />
              </div>
            </div>
            <div className={styles.group}>
              <label>I&apos;m interested in</label>
              <select name="program">
                <option value="">Select a program…</option>
                <option>Pre-Marital Counseling</option>
                <option>Post-Marital Counseling</option>
                <option>Sex in Marriage</option>
                <option>Legal Advice: Marriage &amp; Divorce</option>
                <option>Crisis Management in Marriage</option>
                <option>Thriving Beyond Divorce</option>
                <option>Not sure — I need guidance</option>
              </select>
            </div>
            <div className={styles.group}>
              <label>Tell us a little about your situation</label>
              <textarea name="message" placeholder="Share as much or as little as you'd like. Everything is confidential." />
            </div>
            {status === 'error' && <p className={styles.error}>Something went wrong. Please try again.</p>}
            <button type="submit" disabled={status === 'loading'} className={styles.btn}>
              {status === 'loading' ? 'Sending…' : 'Send Message & Book Free Call'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
