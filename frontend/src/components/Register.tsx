import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle } from 'lucide-react';
import { register } from '../services/api';
import { useToast } from './Toast';
import { ParticleCanvas } from './ParticleCanvas';
import './Login.css';
import './Register.css';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password strength
  const getStrength = (pw: string): { level: number; label: string; color: string } => {
    if (pw.length === 0) return { level: 0, label: '', color: '' };
    if (pw.length < 6) return { level: 1, label: 'Too short', color: '#ef4444' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 2, label: 'Weak', color: '#f97316' };
    if (score === 2) return { level: 3, label: 'Fair', color: '#eab308' };
    if (score === 3) return { level: 4, label: 'Good', color: '#22c55e' };
    return { level: 5, label: 'Strong', color: '#6366f1' };
  };

  const strength = getStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side validation with descriptive toasts ────────────────────
    if (!name.trim()) {
      toast.warning('Name Required', 'Please enter your full name to create an account.');
      return;
    }
    if (name.trim().length < 2) {
      toast.warning('Name Too Short', 'Your name must be at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      toast.warning('Email Required', 'Please enter your email address — it will be your login ID.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.warning('Invalid Email', 'Please enter a valid email address (e.g. you@example.com).');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password Too Short', 'Your password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords Do Not Match', 'Make sure both password fields contain the same value.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await register(name.trim(), email.trim().toLowerCase(), password);
      toast.success(
        'Account Created!',
        `Welcome to SHIVSTORE, ${data.name}. Redirecting to your dashboard...`
      );
      setTimeout(() => navigate('/dashboard', { replace: true }), 700);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';

      if (raw.toLowerCase().includes('already exists')) {
        toast.error(
          'Email Already Registered',
          'An account with this email already exists. Please sign in instead, or use a different email.'
        );
      } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('failed to fetch')) {
        toast.error(
          'Cannot Reach Server',
          'Unable to connect to the server. Make sure the backend is running on port 3001.'
        );
      } else if (raw.toLowerCase().includes('password must be at least')) {
        toast.error('Password Too Short', 'Your password must be at least 6 characters long.');
      } else if (raw) {
        toast.error('Registration Failed', raw);
      } else {
        toast.error('Registration Failed', 'Something went wrong. Please try again in a moment.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (e.clientY - innerHeight / 2) / (innerHeight / 2);
    setMousePos({ x, y });
    setCursorPos({ x: e.clientX, y: e.clientY });
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
            <svg width="46" height="46" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-brand-svg-logo">
              <defs>
                <linearGradient id="sLogoGradReg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e0e7ff" />
                </linearGradient>
                <filter id="logoGlowFilterReg" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.3" />
                </filter>
              </defs>
              <path
                d="M32 14C32 10.6863 29.3137 8 26 8H18C13.5817 8 10 11.5817 10 16C10 20.4183 13.5817 24 18 24H30C34.4183 24 38 27.5817 38 32C38 36.4183 34.4183 40 30 40H22C18.6863 40 16 37.3137 16 34"
                stroke="url(#sLogoGradReg)"
                strokeWidth="5.5"
                strokeLinecap="round"
                filter="url(#logoGlowFilterReg)"
              />
              <circle cx="35" cy="11" r="2.5" fill="#a78bfa" />
              <circle cx="13" cy="37" r="2.5" fill="#6366f1" />
            </svg>
          </div>
          <h1 className="auth-brand-title">SHIVSTORE</h1>
          <p className="auth-brand-tagline">
            Create your account to start managing gate passes, billing, and analytics.
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
            <h2 className="auth-card-title">Create Account</h2>
            <p className="auth-card-subtitle">Join SHIVSTORE Management System</p>
          </div>

          <form className="auth-form auth-form--register" onSubmit={handleRegister}>
            {/* Full Name */}
            <div className="auth-input-group">
              <label htmlFor="reg-name" className="auth-input-label">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-input-group">
              <label htmlFor="reg-email" className="auth-input-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-input-group">
              <label htmlFor="reg-password" className="auth-input-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-toggle-pw-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="auth-strength-meter">
                  <div className="auth-strength-bars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`auth-strength-bar${i <= strength.level ? ' active' : ''}`}
                        style={{
                          background: i <= strength.level ? strength.color : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <span className="auth-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="auth-input-group">
              <label htmlFor="reg-confirm-password" className="auth-input-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-toggle-pw-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {confirmPassword.length > 0 && password === confirmPassword && (
                  <CheckCircle size={18} className="auth-confirm-check" />
                )}
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="auth-spinner">Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-footer-link">Sign in</Link>
            </p>
            <p className="auth-footer-copyright">© 2026 SHIVSTORE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
