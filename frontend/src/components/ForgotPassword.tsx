import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../services/api';
import { useToast } from './Toast';
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
      {/* Background Effects */}
      <div className="auth-bg-gradient" />
      <div className="auth-grid-overlay" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Brand Panel — Left Side */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <span className="auth-brand-logo-letter">S</span>
          </div>
          <h1 className="auth-brand-title">SHIVSTORE</h1>
          <p className="auth-brand-tagline">
            Account recovery system.
          </p>

          <div className="auth-brand-decoration">
            <div className="auth-deco-ring auth-deco-ring-1" />
            <div className="auth-deco-ring auth-deco-ring-2" />
            <div className="auth-deco-ring auth-deco-ring-3" />
            <div className="auth-deco-dot auth-deco-dot-1" />
            <div className="auth-deco-dot auth-deco-dot-2" />
            <div className="auth-deco-dot auth-deco-dot-3" />
            <div className="auth-deco-dot auth-deco-dot-4" />
            <div className="auth-deco-dot auth-deco-dot-5" />
            <div className="auth-deco-line auth-deco-line-1" />
            <div className="auth-deco-line auth-deco-line-2" />
          </div>
        </div>
      </div>

      {/* Form Panel — Right Side */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-subtitle">
              {isSubmitted
                ? 'Check your inbox for password reset instructions'
                : 'Enter your registered email address to receive a password reset link'}
            </p>
          </div>

          {isSubmitted ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Reset Link Sent!
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13.5, lineHeight: 1.5, marginBottom: 28 }}>
                We have sent a reset link to <strong style={{ color: '#6366f1' }}>{email}</strong>. The link is valid for 15 minutes.
              </p>

              <button
                type="button"
                className="auth-submit-btn"
                onClick={() => setIsSubmitted(false)}
                style={{ width: '100%', marginBottom: 16 }}
              >
                Send Another Link
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label htmlFor="reset-email" className="auth-input-label">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
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
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={18} />
                  </>
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
            <p className="auth-footer-copyright">© 2026 SHIVSTORE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
