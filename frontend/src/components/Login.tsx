import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login } from '../services/api';
import { useToast } from './Toast';
import logoImg from '../assets/LOGO.png';
import './Login.css';

// ── Swipe-to-Login Component ──────────────────────────────────────────────
interface SwipeButtonProps {
  onSuccess: () => void;
  isLoading: boolean;
  text: string;
}

const SwipeButton: React.FC<SwipeButtonProps> = ({ onSuccess, isLoading, text }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startX = useRef(0);

  // Springs back if loading stops (e.g. login completes or fails)
  useEffect(() => {
    if (!isLoading && isSuccess) {
      setIsSuccess(false);
      setDragX(0);
    }
  }, [isLoading]);

  // Visual spring-back fallback: if validation fails instantly, loading is never set.
  // We automatically reset the handle after 1 second if no loading state starts.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isSuccess && !isLoading) {
      timeout = setTimeout(() => {
        setIsSuccess(false);
        setDragX(0);
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [isSuccess, isLoading]);

  const handleStart = (clientX: number) => {
    if (isLoading || isSuccess) return;
    setIsDragging(true);
    startX.current = clientX - dragX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || isLoading || isSuccess || !containerRef.current || !handleRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const handleWidth = handleRef.current.clientWidth;
    const maxDrag = containerWidth - handleWidth - 8; // 4px padding on each side
    
    let currentDrag = clientX - startX.current;
    if (currentDrag < 0) currentDrag = 0;
    if (currentDrag > maxDrag) currentDrag = maxDrag;
    
    setDragX(currentDrag);

    // Trigger success when dragged past 95% of track
    if (currentDrag >= maxDrag * 0.95) {
      setIsDragging(false);
      setDragX(maxDrag);
      setIsSuccess(true);
      onSuccess();
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!isSuccess) {
      setDragX(0);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  const containerWidth = containerRef.current?.clientWidth || 0;
  const handleWidth = handleRef.current?.clientWidth || 0;
  const maxDrag = containerWidth - handleWidth - 8 || 1;
  const dragPercentage = Math.min(100, (dragX / maxDrag) * 100);

  return (
    <div 
      className={`swipe-button-container ${isLoading || isSuccess ? 'loading' : ''} ${isDragging ? 'dragging' : ''}`}
      ref={containerRef}
    >
      <div 
        className="swipe-button-fill" 
        style={{ width: `calc(${dragPercentage}% + 44px)` }}
      />
      <span 
        className="swipe-button-text"
        style={{ opacity: Math.max(0, 1 - (dragX / maxDrag) * 1.5) }}
      >
        {isLoading ? 'Signing in...' : text}
      </span>
      <div
        className="swipe-button-handle"
        ref={handleRef}
        style={{ transform: `translateX(${dragX}px)` }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      >
        {isLoading ? (
          <div className="swipe-button-spinner" />
        ) : (
          <ArrowRight size={18} />
        )}
      </div>
    </div>
  );
};

// ── Login Component ────────────────────────────────────────────────────────
export const Login: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
      setTimeout(() => navigate('/dashboard', { replace: true }), 600);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
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

  const triggerSubmit = () => {
    const hiddenSubmit = document.getElementById('login-submit-hidden-btn');
    if (hiddenSubmit) {
      hiddenSubmit.click();
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
            {/* Branding Header */}
            <div className="auth-card-brand">
              <div className="auth-brand-logo">
                <img src={logoImg} alt="Shiv Stone Crusher Logo" />
              </div>
              <h1 className="auth-brand-title">SHIV STONE</h1>
              <p className="auth-brand-tagline">Enter your credentials to access your dashboard</p>
            </div>

            <div className="auth-card-divider" />

            {/* Login Form */}
            <form className="auth-form" onSubmit={handleLogin}>
              {/* Email */}
              <div className="auth-input-group">
                <label htmlFor="login-email" className="auth-input-label">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
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
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••"
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Swipe-to-Login Trigger Button */}
              <div className="auth-submit-wrapper">
                <SwipeButton 
                  onSuccess={triggerSubmit}
                  isLoading={isLoading}
                  text="Swipe to Sign In"
                />
              </div>

              {/* Hidden Standard Submit Button for Fallback (Enter Key) */}
              <button 
                type="submit" 
                id="login-submit-hidden-btn" 
                style={{ display: 'none' }} 
              />
            </form>

            <div className="auth-footer">
              <p className="auth-footer-copyright">© 2026 SHIV STONE. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
