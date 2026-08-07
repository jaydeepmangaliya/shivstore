import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import './Toast.css';

// ── Types ─────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms; default 4500
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Icon components ───────────────────────────────────────────────────────

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#22c55e" />
      <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#ef4444" />
      <path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18.66 17H1.34L10 2Z" fill="#f59e0b" />
      <path d="M10 8V12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="15" r="1" fill="white" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#6366f1" />
      <path d="M10 9V14" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="1" fill="white" />
    </svg>
  ),
};

// ── Single Toast component ─────────────────────────────────────────────────

interface ToastProps {
  toast: ToastItem;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    timerRef.current = setTimeout(() => onRemove(toast.id), 350);
  }, [toast.id, onRemove]);

  React.useEffect(() => {
    const duration = toast.duration ?? 4500;
    timerRef.current = setTimeout(handleDismiss, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleDismiss, toast.duration]);

  return (
    <div
      className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : 'toast--enter'}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Progress bar */}
      <div
        className="toast-progress"
        style={{ animationDuration: `${toast.duration ?? 4500}ms` }}
      />

      <div className="toast-icon">{icons[toast.type]}</div>

      <div className="toast-body">
        <p className="toast-title">{toast.title}</p>
        {toast.message && <p className="toast-message">{toast.message}</p>}
      </div>

      <button
        className="toast-close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

// ── Provider ──────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]); // keep at most 5
  }, []);

  const success = useCallback(
    (title: string, message?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: string) => showToast({ type: 'error', title, message }),
    [showToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast container — fixed top-right */}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
