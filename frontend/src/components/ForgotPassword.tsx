import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { forgotPassword } from '../services/api';
import { useToast } from './Toast';
import { ParticleCanvas } from './ParticleCanvas';
import './Login.css';

export const ForgotPassword: React.FC = () => {
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    setMousePos({ x, y });
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

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
    <div className="auth-page" onMouseMove={handleMouseMove}>
      {/* Interactive Background Particle Constellation Canvas */}
      <ParticleCanvas />

      {/* Dynamic Cursor Spotlight Follower */}
      <div
        className="auth-mouse-spotlight"
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
        }}
      />
      <div
        className="auth-mouse-dot"
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
        }}
      />

      {/* Background Effects */}
      <div className="auth-bg-gradient" />
      <div className="auth-grid-overlay" />
      <div
        className="auth-orb auth-orb-1"
        style={{
          transform: `translate(${mousePos.x * 45}px, ${mousePos.y * 45}px)`,
        }}
      />
      <div
        className="auth-orb auth-orb-2"
        style={{
          transform: `translate(${mousePos.x * -55}px, ${mousePos.y * -55}px)`,
        }}
      />
      <div
        className="auth-orb auth-orb-3"
        style={{
          transform: `translate(${mousePos.x * 35}px, ${mousePos.y * -35}px)`,
        }}
      />

      {/* Brand Panel — Left Side */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <span className="auth-brand-logo-letter">S</span>
          </div>
          <h1 className="auth-brand-title">SHIV STONE</h1>
          <p className="auth-brand-tagline">
            Account recovery system.
          </p>
        </div>
      </div>

      {/* Form Panel — Right Side */}
      <div className="auth-form-panel">
        <div className="auth-card">
          {/* Dynamic Specular Light Shine Reflection */}
          <div
            className="auth-card-shine"
            style={{
              background: `radial-gradient(circle at ${((mousePos.x + 1) * 50).toFixed(1)}% ${((mousePos.y + 1) * 50).toFixed(1)}%, rgba(255, 255, 255, 0.16) 0%, rgba(99, 102, 241, 0.06) 45%, transparent 70%)`,
            }}
          />

          <div className="auth-card-header">
            <h2 className="auth-card-title">Reset Password</h2>
            <p className="auth-card-subtitle">
              {isSubmitted
                ? 'Check your inbox for password reset instructions'
                : 'Enter your registered email address to receive a password reset link'}
            </p>
          </div>

          {isSubmitted ? (
            <div className="reset-success-box">
              <div className="reset-success-icon">
                <CheckCircle2 size={32} />
              </div>
              <p className="reset-success-title">
                Reset Link Sent!
              </p>
              <p className="reset-success-desc">
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
            <p className="auth-footer-copyright">© 2026 SHIV STONE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
