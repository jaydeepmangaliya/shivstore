import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ChevronDown,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  TrendingDown,
  LogOut
} from 'lucide-react';
import { fetchDashboardRevenue, fetchDashboardOrders } from '../services/api';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTooltip, setActiveTooltip] = useState<{ type: string; index: number; x: number; y: number } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const monthLongNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Helper date functions
  const formatDateISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDateDisplay = (d: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const monthStr = months[d.getMonth()];
    return `${day} ${monthStr} ${d.getFullYear()}`;
  };

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  const getLastWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToLastSunday);
    const lastMonday = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() - 6);
    return { start: lastMonday, end: lastSunday };
  };

  const getLastMonthRange = () => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(prevMonthYear, prevMonth, 1);
    const end = new Date(prevMonthYear, prevMonth + 1, 0);
    return { start, end };
  };

  const initialCurrentMonth = getCurrentMonthRange();

  // Filter mode: 'Last Week' | 'Last Month' | 'Custom'
  const [calendarMode, setCalendarMode] = useState<'Last Week' | 'Last Month' | 'Custom'>('Custom');
  const [activeDateRange, setActiveDateRange] = useState<{ startDate: string; endDate: string; title: string }>({
    startDate: formatDateISO(initialCurrentMonth.start),
    endDate: formatDateISO(initialCurrentMonth.end),
    title: `Current Month (${monthLongNames[initialCurrentMonth.start.getMonth()]} ${initialCurrentMonth.start.getFullYear()})`
  });

  // Pending custom range picker inside calendar popover
  const [pendingRangeStart, setPendingRangeStart] = useState<Date | null>(initialCurrentMonth.start);
  const [pendingRangeEnd, setPendingRangeEnd] = useState<Date | null>(initialCurrentMonth.end);
  const [pendingMonth, setPendingMonth] = useState<number>(initialCurrentMonth.start.getMonth());
  const [pendingYear, setPendingYear] = useState<number>(initialCurrentMonth.start.getFullYear());

  // Forms Created year filter
  const [orderYear, setOrderYear] = useState<number>(currentYear);
  const [isOrderYearOpen, setIsOrderYearOpen] = useState<boolean>(false);
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const getCalendarCells = (m: number, y: number) => {
    const rawFirst = new Date(y, m, 1).getDay();
    const firstDayIndex = (rawFirst + 6) % 7;
    const totalDays = new Date(y, m + 1, 0).getDate();
    const prevTotalDays = new Date(y, m, 0).getDate();
    const cells: Array<{ day: number; isCurrentMonth: boolean; month: number; year: number; dateObj: Date }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      const pd = prevTotalDays - i;
      cells.push({ day: pd, isCurrentMonth: false, month: pm, year: py, dateObj: new Date(py, pm, pd) });
    }
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ day: i, isCurrentMonth: true, month: m, year: y, dateObj: new Date(y, m, i) });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nm = m === 11 ? 0 : m + 1;
      const ny = m === 11 ? y + 1 : y;
      cells.push({ day: i, isCurrentMonth: false, month: nm, year: ny, dateObj: new Date(ny, nm, i) });
    }
    return cells;
  };

  const applyPreset = (preset: 'Last Week' | 'Last Month' | 'Custom') => {
    setCalendarMode(preset);
    if (preset === 'Last Week') {
      const { start, end } = getLastWeekRange();
      setPendingRangeStart(start);
      setPendingRangeEnd(end);
      setPendingMonth(start.getMonth());
      setPendingYear(start.getFullYear());
    } else if (preset === 'Last Month') {
      const { start, end } = getLastMonthRange();
      setPendingRangeStart(start);
      setPendingRangeEnd(end);
      setPendingMonth(start.getMonth());
      setPendingYear(start.getFullYear());
    }
  };

  const handleCellClick = (cellDate: Date) => {
    setCalendarMode('Custom');
    if (!pendingRangeStart || (pendingRangeStart && pendingRangeEnd)) {
      setPendingRangeStart(cellDate);
      setPendingRangeEnd(null);
    } else {
      if (cellDate < pendingRangeStart) {
        setPendingRangeStart(cellDate);
        setPendingRangeEnd(null);
      } else {
        setPendingRangeEnd(cellDate);
      }
    }
  };

  const handleApplyFilter = () => {
    if (calendarMode === 'Last Week') {
      const { start, end } = getLastWeekRange();
      setActiveDateRange({
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
        title: `Last Week (${formatDateDisplay(start)} – ${formatDateDisplay(end)})`
      });
    } else if (calendarMode === 'Last Month') {
      const { start, end } = getLastMonthRange();
      setActiveDateRange({
        startDate: formatDateISO(start),
        endDate: formatDateISO(end),
        title: `Last Month (${monthLongNames[start.getMonth()]} ${start.getFullYear()})`
      });
    } else {
      if (pendingRangeStart && pendingRangeEnd) {
        setActiveDateRange({
          startDate: formatDateISO(pendingRangeStart),
          endDate: formatDateISO(pendingRangeEnd),
          title: `Custom (${formatDateDisplay(pendingRangeStart)} – ${formatDateDisplay(pendingRangeEnd)})`
        });
      } else if (pendingRangeStart) {
        setActiveDateRange({
          startDate: formatDateISO(pendingRangeStart),
          endDate: formatDateISO(pendingRangeStart),
          title: `Custom (${formatDateDisplay(pendingRangeStart)})`
        });
      }
    }
    setIsFilterOpen(false);
  };

  const getCellClass = (cellDate: Date) => {
    if (!cellDate) return '';
    const cellTime = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
    const startTime = pendingRangeStart ? new Date(pendingRangeStart.getFullYear(), pendingRangeStart.getMonth(), pendingRangeStart.getDate()).getTime() : null;
    const endTime = pendingRangeEnd ? new Date(pendingRangeEnd.getFullYear(), pendingRangeEnd.getMonth(), pendingRangeEnd.getDate()).getTime() : null;

    if (startTime && endTime) {
      if (startTime === endTime && cellTime === startTime) return 'selected-single';
      if (cellTime === startTime) return 'selected-start';
      if (cellTime === endTime) return 'selected-end';
      if (cellTime > startTime && cellTime < endTime) return 'in-range';
    } else if (startTime && cellTime === startTime) {
      return 'selected-single';
    }
    return '';
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ── Data states ────────────────────────────────────────────────────────
  const [revenueData, setRevenueData] = useState<Array<{ label: string; date?: string; dayName?: string; val1: number; val2: number }>>([]);
  const [monthlyOrderData, setMonthlyOrderData] = useState<Array<{ label: string; current: number; previous: number }>>(() => {
    return monthLabels.map((label) => ({ label, current: 0, previous: 0 }));
  });

  // ── Fetch Live DB Data ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    fetchDashboardRevenue(undefined, undefined, activeDateRange.startDate, activeDateRange.endDate)
      .then(data => {
        if (isMounted && data && Array.isArray(data)) {
          setRevenueData(data);
        }
      })
      .catch(err => console.error('Failed to load dashboard revenue from DB:', err));

    fetchDashboardOrders(orderYear)
      .then(data => {
        if (isMounted && data && Array.isArray(data)) {
          setMonthlyOrderData(data.map(d => ({
            label: d.label,
            current: d.current,
            previous: d.previous
          })));
        }
      })
      .catch(err => console.error('Failed to load dashboard orders from DB:', err));

    return () => { isMounted = false; };
  }, [activeDateRange, orderYear]);

  // ── Ton Overview summary computations ──────────────────────────────────────
  const totalTonsThisPeriod = revenueData.reduce((a, d) => a + d.val1, 0);
  const totalTonsPrevPeriod = revenueData.reduce((a, d) => a + d.val2, 0);
  const tonGrowth = totalTonsPrevPeriod > 0
    ? ((totalTonsThisPeriod - totalTonsPrevPeriod) / totalTonsPrevPeriod * 100).toFixed(1)
    : null;
  const tonIsUp = tonGrowth !== null && Number(tonGrowth) >= 0;

  // ── Forms Created summary computations ──────────────────────────────────────
  const totalFormsThisYear = monthlyOrderData.reduce((a, d) => a + d.current, 0);
  const totalFormsLastYear = monthlyOrderData.reduce((a, d) => a + d.previous, 0);
  const formGrowth = totalFormsLastYear > 0
    ? ((totalFormsThisYear - totalFormsLastYear) / totalFormsLastYear * 100).toFixed(1)
    : null;
  const formsIsUp = formGrowth !== null && Number(formGrowth) >= 0;

  // ── Dynamic Y-axis for forms line chart ───────────────────────────────────
  const maxFormVal = Math.max(...monthlyOrderData.map(d => Math.max(d.current, d.previous)), 1);
  const getFormY = (val: number) => {
    const chartH = 100; const topM = 15;
    return (topM + chartH) - (val / maxFormVal) * chartH;
  };
  const formTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxFormVal * f));
  const getTickY = (f: number) => getFormY(maxFormVal * f);

  // Dynamic max value for bar chart
  const maxBarVal = Math.max(...revenueData.map(d => Math.max(d.val1, d.val2)), 1);

  return (
    <div className="dashboard-container">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">S</div>
          <span className="brand-name">SHIVSTORE</span>
          <button className="sidebar-close-btn" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close sidebar">
            &times;
          </button>
        </div>

        {/* User card in sidebar */}
        <div className="sidebar-user-card" onClick={handleLogout} title="Click to Logout">
          <div className="sidebar-avatar">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=80" alt="User" />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{userName}</span>
            <span className="sidebar-user-role">{userRole}</span>
          </div>
          <LogOut size={16} className="sidebar-chevron" style={{ color: '#d84315' }} />
        </div>

        <nav className="sidebar-menu">
          <div className="menu-group">
            <span className="menu-title">MENU</span>
            <ul className="menu-list">
              <li className="menu-item active">
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/users')}>
                <User size={20} />
                <span>Users</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/forms')}>
                <FileText size={20} />
                <span>Forms</span>
              </li>
              <li className="menu-item logout-item" onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Top Header */}
        <header className="top-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="page-title-area">
            <h1 className="page-title">Dashboard</h1>
            <span className="page-date">{currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </header>

        {/* ── Dashboard Grid ──────────────────────────────────────────────── */}
        <div className="dashboard-grid">

          {/* ── CARD 1: Ton Overview ───────────────────────────────────────── */}
          <div className="dashboard-card revenue-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Ton Overview</h3>
                <h2 className="card-value">
                  {totalTonsThisPeriod.toFixed(2)} Tons
                </h2>
                {tonGrowth !== null ? (
                  <div className={tonIsUp ? 'trendUp' : 'trendDown'}>
                    {tonIsUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{tonGrowth}% vs prev period</span>
                  </div>
                ) : (
                  <div className="trendNeutral"><span>Total tons dispatched</span></div>
                )}
              </div>

              {/* Ton Overview Filter (calendar) */}
              <div className="filter-wrapper">
                <button
                  className={`btn-filter ${isFilterOpen ? 'active' : ''}`}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter size={14} />
                  <span>Filter</span>
                  {activeDateRange.title !== `Current Month (${monthLongNames[initialCurrentMonth.start.getMonth()]} ${initialCurrentMonth.start.getFullYear()})` && (
                    <span className="filter-active-dot" />
                  )}
                </button>

                {isFilterOpen && (
                  <>
                    <div className="filter-popover-backdrop" onClick={() => setIsFilterOpen(false)} />
                    <div className="calendar-popover two-panel">
                    {/* Left Presets Panel — NO "Last Year" */}
                    <div className="popover-left-panel">
                      {(['Last Week', 'Last Month', 'Custom'] as const).map(preset => (
                        <button
                          key={preset}
                          className={`preset-btn ${calendarMode === preset ? 'active' : ''}`}
                          onClick={() => applyPreset(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                      <div className="popover-left-spacer" />
                      <button className="btn-apply" onClick={handleApplyFilter}>
                        Apply
                      </button>
                      <button
                        className="btn-reset-ton-filter"
                        onClick={() => {
                          const cur = getCurrentMonthRange();
                          setActiveDateRange({
                            startDate: formatDateISO(cur.start),
                            endDate: formatDateISO(cur.end),
                            title: `Current Month (${monthLongNames[cur.start.getMonth()]} ${cur.start.getFullYear()})`
                          });
                          setCalendarMode('Custom');
                          setPendingRangeStart(cur.start);
                          setPendingRangeEnd(cur.end);
                          setPendingMonth(cur.start.getMonth());
                          setPendingYear(cur.start.getFullYear());
                          setIsFilterOpen(false);
                        }}
                      >
                        ✕ Reset Filter
                      </button>
                    </div>

                    {/* Right Calendar Panel */}
                    <div className="popover-right-panel">
                      <div className="calendar-nav-row">
                        <button
                          className="nav-arrow-btn"
                          aria-label="Previous month"
                          onClick={() => {
                            if (pendingMonth === 0) { setPendingMonth(11); setPendingYear(pendingYear - 1); }
                            else setPendingMonth(pendingMonth - 1);
                          }}
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <span className="calendar-month-title">
                          <strong>{monthLongNames[pendingMonth]}</strong>&nbsp;{pendingYear}
                        </span>
                        <button
                          className="nav-arrow-btn"
                          aria-label="Next month"
                          onClick={() => {
                            if (pendingMonth === 11) { setPendingMonth(0); setPendingYear(pendingYear + 1); }
                            else setPendingMonth(pendingMonth + 1);
                          }}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                      <div className="calendar-weekdays">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                      </div>
                      <div className="calendar-grid-cells">
                        {getCalendarCells(pendingMonth, pendingYear).map((cell, i) => {
                          const cellClass = getCellClass(cell.dateObj);
                          return (
                            <button
                              key={i}
                              className={`calendar-cell ${!cell.isCurrentMonth ? 'padding-day' : ''} ${cellClass}`}
                              onClick={() => handleCellClick(cell.dateObj)}
                            >
                              {cell.day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>

            <p className="card-subtitle">
              {activeDateRange.title}
            </p>

            {/* Bar Chart — Tons */}
            <div className="chart-container bar-chart-container">
              <svg className="bar-chart-svg" viewBox="0 0 1000 200">
                <line x1="30" y1="30" x2="970" y2="30" stroke="#f1f3f9" strokeWidth="1" />
                <line x1="30" y1="80" x2="970" y2="80" stroke="#f1f3f9" strokeWidth="1" />
                <line x1="30" y1="130" x2="970" y2="130" stroke="#f1f3f9" strokeWidth="1" />
                <line x1="30" y1="170" x2="970" y2="170" stroke="#e4e8f1" strokeWidth="1.5" />

                {revenueData.map((d, index) => {
                  const totalCount = Math.max(revenueData.length, 1);
                  const chartWidth = 920;
                  const step = chartWidth / totalCount;
                  const xBase = 35 + index * step;
                  const barWidth = Math.max(3, Math.min(22, step * 0.35));
                  const barSpacing = Math.max(0.5, step * 0.08);

                  const h1 = maxBarVal > 0 ? (d.val1 / maxBarVal) * 130 : 0;
                  const h2 = maxBarVal > 0 ? (d.val2 / maxBarVal) * 130 : 0;
                  const y1 = 170 - h1;
                  const y2 = 170 - h2;

                  return (
                    <g key={index} className="bar-group">
                      <rect x={xBase} y={y1} width={barWidth} height={h1} rx="2" fill="#5c60f5"
                        onMouseEnter={() => setActiveTooltip({ type: 'revenue', index, x: xBase + barWidth / 2, y: y1 - 35 })}
                        onMouseLeave={() => setActiveTooltip(null)} />
                      <rect x={xBase + barWidth + barSpacing} y={y2} width={barWidth} height={h2} rx="2" fill="#e4e6fc"
                        onMouseEnter={() => setActiveTooltip({ type: 'revenue', index, x: xBase + barWidth + barSpacing + barWidth / 2, y: y2 - 35 })}
                        onMouseLeave={() => setActiveTooltip(null)} />
                      {(totalCount <= 14 || index % 2 === 0) && (
                        <text x={xBase + barWidth + barSpacing / 2} y="190" className="chart-label" textAnchor="middle" style={{ fontSize: '9px' }}>
                          {d.dayName ? `${d.dayName} ${d.label}` : d.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {activeTooltip && activeTooltip.type === 'revenue' && (
                <div className="chart-tooltip" style={{ left: `${(activeTooltip.x / 1000) * 100}%`, top: `${(activeTooltip.y / 200) * 100}%` }}>
                  <div className="tooltip-title">{revenueData[activeTooltip.index].date || revenueData[activeTooltip.index].label}</div>
                  <div className="tooltip-row"><span className="dot current"></span><span>This period: {revenueData[activeTooltip.index].val1} Tons</span></div>
                  <div className="tooltip-row"><span className="dot previous"></span><span>Last period: {revenueData[activeTooltip.index].val2} Tons</span></div>
                </div>
              )}
            </div>

            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot color-blue"></span><span>This period (Tons)</span></div>
              <div className="legend-item"><span className="legend-dot color-light-purple"></span><span>Last period (Tons)</span></div>
            </div>
          </div>

          {/* ── CARD 2: Forms Created ──────────────────────────────────────── */}
          <div className="dashboard-card order-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Forms Created</h3>
                <h2 className="card-value">{totalFormsThisYear} Forms</h2>
                {formGrowth !== null ? (
                  <div className={formsIsUp ? 'trendUp' : 'trendDown'}>
                    {formsIsUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{formGrowth}% vs prev year</span>
                  </div>
                ) : (
                  <div className="trendNeutral"><span>Gate pass forms issued</span></div>
                )}
              </div>

              {/* Year Filter */}
              <div className="year-filter-wrapper">
                <button className={`btn-year-filter ${isOrderYearOpen ? 'active' : ''}`} onClick={() => setIsOrderYearOpen(!isOrderYearOpen)}>
                  <span>{orderYear}</span>
                  <ChevronDown size={13} className={`year-chevron ${isOrderYearOpen ? 'rotated' : ''}`} />
                </button>
                {isOrderYearOpen && (
                  <div className="year-dropdown">
                    {yearOptions.map(y => (
                      <button key={y} className={`year-option ${orderYear === y ? 'selected' : ''}`}
                        onClick={() => { setOrderYear(y); setIsOrderYearOpen(false); }}>
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="card-subtitle">{`Forms created Jan–Dec, ${orderYear}`}</p>

            {/* Line Chart — Forms Created */}
            <div className="chart-container line-chart-container">
              <svg className="line-chart-svg" viewBox="0 0 1050 150">
                {/* Y-axis ticks */}
                {formTicks.map((tick, i) => {
                  const ty = getTickY(i / 4);
                  return (
                    <g key={i}>
                      <line x1="55" y1={ty} x2="1020" y2={ty} stroke="#f1f3f9" strokeWidth="1" />
                      <text x="50" y={ty + 4} textAnchor="end" style={{ fontSize: '9px', fill: '#aab2cc' }}>{tick}</text>
                    </g>
                  );
                })}
                <line x1="55" y1="115" x2="1020" y2="115" stroke="#e4e8f1" strokeWidth="1.5" />

                {/* Previous year line */}
                <path
                  d={monthlyOrderData.map((d, i) => { const x = 60 + i * (950 / 11); return `${i === 0 ? 'M' : 'L'} ${x} ${getFormY(d.previous)}`; }).join(' ')}
                  fill="none" stroke="#cdd1fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Current year line */}
                <path
                  d={monthlyOrderData.map((d, i) => { const x = 60 + i * (950 / 11); return `${i === 0 ? 'M' : 'L'} ${x} ${getFormY(d.current)}`; }).join(' ')}
                  fill="none" stroke="#5c60f5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots + labels */}
                {monthlyOrderData.map((d, i) => {
                  const x = 60 + i * (950 / 11);
                  const cy = getFormY(d.current);
                  return (
                    <g key={i} className="line-dot-group">
                      <circle cx={x} cy={cy} r="4" fill="#5c60f5" stroke="#fff" strokeWidth="2" className="line-dot"
                        onMouseEnter={() => setActiveTooltip({ type: 'orders', index: i, x, y: cy - 30 })}
                        onMouseLeave={() => setActiveTooltip(null)} />
                      <text x={x} y="142" className="chart-label" textAnchor="middle">{d.label}</text>
                    </g>
                  );
                })}
              </svg>

              {activeTooltip && activeTooltip.type === 'orders' && (
                <div className="chart-tooltip mini" style={{ left: `${(activeTooltip.x / 1050) * 100}%`, top: `${(activeTooltip.y / 150) * 100}%` }}>
                  <div className="tooltip-title">{monthlyOrderData[activeTooltip.index].label}</div>
                  <div className="tooltip-row"><span className="dot current"></span><span>{orderYear}: {monthlyOrderData[activeTooltip.index].current} Forms</span></div>
                  <div className="tooltip-row"><span className="dot previous"></span><span>{orderYear - 1}: {monthlyOrderData[activeTooltip.index].previous} Forms</span></div>
                </div>
              )}
            </div>

            <div className="chart-legend min-space">
              <div className="legend-item"><span className="legend-dot color-blue"></span><span>{orderYear} (Forms)</span></div>
              <div className="legend-item"><span className="legend-dot color-light-purple"></span><span>{orderYear - 1} (Forms)</span></div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
