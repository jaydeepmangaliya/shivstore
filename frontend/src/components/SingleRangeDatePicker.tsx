import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './SingleRangeDatePicker.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface SingleRangeDatePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onApply: (start: string, end: string) => void;
  onReset: () => void;
  buttonLabel?: string;
  inline?: boolean;
}

export const SingleRangeDatePicker: React.FC<SingleRangeDatePickerProps> = ({
  startDate,
  endDate,
  onApply,
  onReset,
  buttonLabel = 'Filter',
  inline = false,
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Helper parse YYYY-MM-DD to Date
  const parseISO = (str: string): Date | null => {
    if (!str || !str.includes('-')) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return null;
  };

  // Format Date to YYYY-MM-DD
  const formatISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Format YYYY-MM-DD to DD MMM (e.g. 05 Aug)
  const formatShortDisplay = (str: string): string => {
    const d = parseISO(str);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3);
    return `${day} ${monthShort}`;
  };

  // Pending selection state inside popover
  const [pendingStart, setPendingStart] = useState<Date | null>(parseISO(startDate));
  const [pendingEnd, setPendingEnd] = useState<Date | null>(parseISO(endDate));
  const [presetMode, setPresetMode] = useState<string>('Custom');

  const initialMonthDate = parseISO(startDate) || new Date();
  const [navMonth, setNavMonth] = useState<number>(initialMonthDate.getMonth());
  const [navYear, setNavYear] = useState<number>(initialMonthDate.getFullYear());

  // Sync internal state when props change or popover opens
  useEffect(() => {
    setPendingStart(parseISO(startDate));
    setPendingEnd(parseISO(endDate));
    if (startDate) {
      const d = parseISO(startDate);
      if (d) {
        setNavMonth(d.getMonth());
        setNavYear(d.getFullYear());
      }
    }
  }, [startDate, endDate, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCellClick = (d: Date) => {
    setPresetMode('Custom');
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(d);
      setPendingEnd(null);
    } else {
      if (d < pendingStart) {
        setPendingEnd(pendingStart);
        setPendingStart(d);
      } else {
        setPendingEnd(d);
      }
    }
  };

  const applyPreset = (preset: 'Last 7 Days' | 'This Month' | 'Last Month' | 'All Time') => {
    setPresetMode(preset);
    const now = new Date();
    if (preset === 'Last 7 Days') {
      const start = new Date();
      start.setDate(now.getDate() - 6);
      setPendingStart(start);
      setPendingEnd(now);
      setNavMonth(now.getMonth());
      setNavYear(now.getFullYear());
    } else if (preset === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setPendingStart(start);
      setPendingEnd(end);
      setNavMonth(now.getMonth());
      setNavYear(now.getFullYear());
    } else if (preset === 'Last Month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setPendingStart(start);
      setPendingEnd(end);
      setNavMonth(start.getMonth());
      setNavYear(start.getFullYear());
    } else if (preset === 'All Time') {
      setPendingStart(null);
      setPendingEnd(null);
    }
  };

  const handleApply = () => {
    const s = pendingStart ? formatISO(pendingStart) : '';
    const e = pendingEnd ? formatISO(pendingEnd) : (pendingStart ? formatISO(pendingStart) : '');
    onApply(s, e);
    setIsOpen(false);
  };

  const handleReset = () => {
    setPendingStart(null);
    setPendingEnd(null);
    setPresetMode('Custom');
    onReset();
    setIsOpen(false);
  };

  // Calendar cells calculation
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

  const getCellClass = (d: Date) => {
    if (!pendingStart) return '';
    const t = d.setHours(0,0,0,0);
    const st = new Date(pendingStart).setHours(0,0,0,0);
    const et = pendingEnd ? new Date(pendingEnd).setHours(0,0,0,0) : null;

    if (st === t && (!et || st === et)) return 'srdp-cell-selected srdp-cell-single';
    if (st === t) return 'srdp-cell-selected srdp-cell-start';
    if (et && et === t) return 'srdp-cell-selected srdp-cell-end';
    if (et && t > st && t < et) return 'srdp-cell-in-range';
    return '';
  };

  const hasActiveFilter = Boolean(startDate || endDate);

  // Button title string
  const getButtonTitle = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatShortDisplay(startDate);
      return `${formatShortDisplay(startDate)} - ${formatShortDisplay(endDate)}`;
    }
    if (startDate) return `From ${formatShortDisplay(startDate)}`;
    if (endDate) return `Until ${formatShortDisplay(endDate)}`;
    return buttonLabel;
  };

  const showPopover = inline || isOpen;

  return (
    <div className={`srdp-wrapper ${inline ? 'srdp-inline-wrapper' : ''}`} ref={wrapperRef}>
      {!inline && (
        <button
          type="button"
          className={`srdp-trigger-btn ${isOpen ? 'active' : ''} ${hasActiveFilter ? 'has-filter' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={14} className="srdp-icon" />
          <span className="srdp-title">{getButtonTitle()}</span>
          {hasActiveFilter && <span className="srdp-active-dot" />}
        </button>
      )}

      {showPopover && (
        <div className={`srdp-popover ${inline ? 'srdp-inline-popover' : ''}`}>
          {/* Left Presets & Actions Panel */}
          <div className="srdp-left-panel">
            <span className="srdp-panel-title">PRESETS</span>
            {(['Last 7 Days', 'This Month', 'Last Month', 'All Time'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`srdp-preset-btn ${presetMode === p ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p}
              </button>
            ))}

            <div className="srdp-panel-spacer" />

            <button type="button" className="srdp-btn-apply" onClick={handleApply}>
              Apply Filter
            </button>
            {hasActiveFilter && (
              <button type="button" className="srdp-btn-reset" onClick={handleReset}>
                <X size={13} /> Reset Filter
              </button>
            )}
          </div>

          {/* Right Calendar Panel */}
          <div className="srdp-right-panel">
            <div className="srdp-nav-header">
              <button
                type="button"
                className="srdp-nav-btn"
                onClick={() => {
                  if (navMonth === 0) { setNavMonth(11); setNavYear(navYear - 1); }
                  else setNavMonth(navMonth - 1);
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="srdp-month-title">
                <strong>{MONTH_NAMES[navMonth]}</strong>&nbsp;{navYear}
              </span>
              <button
                type="button"
                className="srdp-nav-btn"
                onClick={() => {
                  if (navMonth === 11) { setNavMonth(0); setNavYear(navYear + 1); }
                  else setNavMonth(navMonth + 1);
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="srdp-weekdays">
              {WEEKDAYS.map(w => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="srdp-days-grid">
              {getCalendarCells(navMonth, navYear).map((cell, idx) => {
                const cellClass = getCellClass(cell.dateObj);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`srdp-day-btn ${!cell.isCurrentMonth ? 'padding-day' : ''} ${cellClass}`}
                    onClick={() => handleCellClick(cell.dateObj)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Selected range hint */}
            <div className="srdp-range-hint">
              {pendingStart ? (
                <span>
                  Range: <strong>{formatShortDisplay(formatISO(pendingStart))}</strong>
                  {pendingEnd ? <> to <strong>{formatShortDisplay(formatISO(pendingEnd))}</strong></> : ' (Click end date)'}
                </span>
              ) : (
                <span>Select start and end date</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleRangeDatePicker;
