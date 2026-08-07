import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './CustomDatePicker.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  label?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Date',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date
  const parseValueToDate = (valStr: string): Date => {
    if (valStr && valStr.includes('-')) {
      const [y, m, d] = valStr.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const selectedDate = value ? parseValueToDate(value) : null;
  const initialNavDate = selectedDate || new Date();

  const [navMonth, setNavMonth] = useState<number>(initialNavDate.getMonth());
  const [navYear, setNavYear] = useState<number>(initialNavDate.getFullYear());

  useEffect(() => {
    if (selectedDate) {
      setNavMonth(selectedDate.getMonth());
      setNavYear(selectedDate.getFullYear());
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM-DD to DD/MM/YYYY for display
  const formatDisplay = (valStr: string): string => {
    if (!valStr || !valStr.includes('-')) return '';
    const [y, m, d] = valStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Calendar cells generation
  const getCalendarCells = (m: number, y: number) => {
    const rawFirst = new Date(y, m, 1).getDay();
    const firstDayIndex = (rawFirst + 6) % 7;
    const totalDays = new Date(y, m + 1, 0).getDate();
    const prevTotalDays = new Date(y, m, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: prevTotalDays - i, isCurrentMonth: false, dateObj: new Date(y, m - 1, prevTotalDays - i) });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, isCurrentMonth: true, dateObj: new Date(y, m, d) });
    }
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, isCurrentMonth: false, dateObj: new Date(y, m + 1, i) });
    }
    return cells;
  };

  const handleSelectDay = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  };

  const isSelected = (d: Date) => {
    if (!selectedDate) return false;
    return d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <div className="cdp-wrapper" ref={wrapperRef}>
      {label && <label className="cdp-label">{label}</label>}
      <button
        type="button"
        className={`cdp-trigger-btn ${isOpen ? 'active' : ''} ${value ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon size={15} className="cdp-icon" />
        <span className="cdp-text">
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value ? (
          <span className="cdp-clear-btn" onClick={handleClear} title="Clear date">
            <X size={13} />
          </span>
        ) : (
          <span className="cdp-arrow">▾</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="cdp-backdrop" onClick={() => setIsOpen(false)} />
          <div className="cdp-popover">
          {/* Header Month/Year Nav */}
          <div className="cdp-header">
            <button
              type="button"
              className="cdp-nav-btn"
              onClick={() => {
                if (navMonth === 0) { setNavMonth(11); setNavYear(navYear - 1); }
                else setNavMonth(navMonth - 1);
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="cdp-month-title">
              <strong>{MONTH_NAMES[navMonth]}</strong>&nbsp;{navYear}
            </span>
            <button
              type="button"
              className="cdp-nav-btn"
              onClick={() => {
                if (navMonth === 11) { setNavMonth(0); setNavYear(navYear + 1); }
                else setNavMonth(navMonth + 1);
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="cdp-weekdays">
            {WEEKDAYS.map(w => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {/* Grid Days */}
          <div className="cdp-days-grid">
            {getCalendarCells(navMonth, navYear).map((cell, idx) => {
              const selected = isSelected(cell.dateObj);
              const today = isToday(cell.dateObj);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`cdp-day-btn ${!cell.isCurrentMonth ? 'padding-day' : ''} ${selected ? 'selected' : ''} ${today ? 'today' : ''}`}
                  onClick={() => handleSelectDay(cell.dateObj)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default CustomDatePicker;
