import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login } from '../services/api';
import { useToast } from './Toast';
import { ParticleCanvas } from './ParticleCanvas';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side validation with descriptive toasts ────────────────────
    if (!email.trim()) {
      toast.warning('Email Required', 'Please enter your email address to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.warning('Invalid Email', 'Please enter a valid email address (e.g. you@example.com).');
      return;
    }
    if (!password) {
      toast.warning('Password Required', 'Please enter your password to sign in.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!', `Signed in as ${data.name}.`);
      // Small delay so the user sees the success toast before navigating
      setTimeout(() => navigate('/dashboard', { replace: true }), 600);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';

      // Map API messages to clear, user-friendly explanations
      if (raw.toLowerCase().includes('invalid email or password')) {
        toast.error(
          'Sign In Failed',
          'The email or password you entered is incorrect. Please check and try again.'
        );
      } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('failed to fetch')) {
        toast.error(
          'Cannot Reach Server',
          'Unable to connect to the server. Make sure the backend is running on port 3001.'
        );
      } else if (raw) {
        toast.error('Sign In Failed', raw);
      } else {
        toast.error('Sign In Failed', 'Something went wrong. Please try again in a moment.');
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

      {/* Brand Panel — Left Side with 3D Parallax */}
      <div className="auth-brand-panel">
        <div
          className="auth-brand-content"
          style={{
            transform: `perspective(1000px) rotateY(${mousePos.x * 8}deg) rotateX(${-mousePos.y * 8}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className="auth-brand-logo">
            <span className="auth-brand-logo-letter">S</span>
          </div>
          <h1 className="auth-brand-title">SHIVSTORE</h1>
          <p className="auth-brand-tagline">
            Complete management system for gate passes, billing, and business analytics.
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
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-subtitle">Enter your credentials to access your dashboard</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            {/* Email */}
            <div className="auth-input-group">
              <label htmlFor="login-email" className="auth-input-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  id="login-email"
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
              <div className="auth-input-label-row">
                <label htmlFor="login-password" className="auth-input-label">Password</label>
                <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="auth-spinner">Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-footer-link">Create one</Link>
            </p>
            <p className="auth-footer-copyright">© 2026 SHIVSTORE. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
