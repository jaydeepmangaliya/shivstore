import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { resetPassword } from '../services/api';
import { useToast } from './Toast';
import './Login.css';
import './Register.css';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
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

  const strength = getStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid Request', 'Reset token is missing from the URL link.');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('Password Too Short', 'Your password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords Do Not Match', 'Make sure both password fields contain the same value.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await resetPassword(token, newPassword);
      toast.success('Password Updated', msg);
      setTimeout(() => navigate('/login', { replace: true }), 1000);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      toast.error('Reset Failed', raw || 'Invalid or expired token.');
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
            Set your new password to regain access.
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
            <h2 className="auth-card-title">Set New Password</h2>
            <p className="auth-card-subtitle">
              Enter and confirm your new account password below
            </p>
          </div>

          {!token ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Invalid or missing reset token in URL link.
              </p>
              <Link to="/forgot-password" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {/* New Password */}
              <div className="auth-input-group">
                <label htmlFor="new-password" className="auth-input-label">New Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength meter */}
                {newPassword.length > 0 && (
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
                <label htmlFor="confirm-password" className="auth-input-label">Confirm New Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Re-enter new password"
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
                  {confirmPassword.length > 0 && newPassword === confirmPassword && (
                    <CheckCircle size={18} className="auth-confirm-check" />
                  )}
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="auth-spinner">Updating password...</span>
                ) : (
                  <>
                    <span>Set New Password</span>
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

export default ResetPassword;
