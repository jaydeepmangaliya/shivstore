import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../services/api';
import { useToast } from './Toast';
import logoImg from '../assets/LOGO.png';
import './Login.css';

export const ForgotPassword: React.FC = () => {
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.warning('Email Required', 'Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.warning('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await forgotPassword(email.trim().toLowerCase());
      setIsSubmitted(true);
      toast.success('Email Sent', msg);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      toast.error('Request Failed', raw || 'Unable to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Blueprint Geometric Background Circles & Glow Blobs */}
      <div className="blueprint-circle blueprint-circle-1" />
      <div className="blueprint-circle blueprint-circle-2" />
      <div className="blueprint-circle blueprint-circle-3" />
      <div className="blueprint-glow-blob blueprint-glow-blob-1" />
      <div className="blueprint-glow-blob blueprint-glow-blob-2" />

      <div className="auth-container">
        {/* Rotating Border Glow Wrapper */}
        <div className="auth-card-wrapper">
          <div className="auth-card">
            {/* Logo & Brand Header */}
            <div className="auth-card-brand">
              <div className="auth-brand-logo">
                <img src={logoImg} alt="Shiv Stone Crusher Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <h1 className="auth-brand-title">SHIV STONE</h1>
              <p className="auth-brand-tagline">Enter your email to reset your account password</p>
            </div>

            <div className="auth-card-divider" />

            {isSubmitted ? (
              <div className="reset-success-box">
                <div className="reset-success-icon">
                  <CheckCircle2 size={24} />
                </div>
                <p className="reset-success-title">Reset Link Sent!</p>
                <p className="reset-success-desc">
                  We have sent a reset link to <strong style={{ color: '#5c60f5' }}>{email}</strong>. The link is valid for 15 minutes.
                </p>

                <button
                  type="button"
                  className="auth-submit-btn"
                  onClick={() => setIsSubmitted(false)}
                  style={{ width: '100%' }}
                >
                  Send Another Link
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-input-group">
                  <label htmlFor="reset-email" className="auth-input-label">Email Address</label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="reset-email"
                      type="email"
                      className="auth-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                  {isLoading ? (
                    <span className="auth-spinner">Sending email...</span>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>
            )}

            <div className="auth-footer" style={{ marginTop: 24 }}>
              <p className="auth-footer-text">
                <Link to="/login" className="auth-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </Link>
              </p>
              <p className="auth-footer-copyright">© 2026 SHIV STONE. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
