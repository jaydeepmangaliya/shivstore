import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LayoutDashboard,
  User,
  FileText,
  ArrowLeft,
  LogOut,
  Eye,
  Trash2,
  Package,
  Truck,
  TrendingUp,
  Calendar,
  Download,
  Receipt,
  Printer,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { fetchGatePasses, deleteGatePass, deleteGatePassesByParty } from '../services/api';
import GatePassForm from './GatePassForm';
import type { GatePassRecord } from './GatePassForm';
import SingleRangeDatePicker from './SingleRangeDatePicker';
import './PartyOverview.css';
import './Dashboard.css';
import './Users.css';

// ── helpers ────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDMY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

function formatDisplayDate(dateStr: string): string {
  const d = parseDMY(dateStr);
  if (!d) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export const PartyOverview: React.FC = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();

  const [records, setRecords] = useState<GatePassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<GatePassRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Table Date Filter & Pagination
  const [tableStartDate, setTableStartDate] = useState('');
  const [tableEndDate, setTableEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Party Statement / Bill Modal State
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [statementViewMode, setStatementViewMode] = useState<'challan' | 'summary'>('challan');
  const [billPreset, setBillPreset] = useState<'Current Month' | 'Last 3 Days' | 'Last 7 Days' | 'All Time' | 'Custom'>('Current Month');
  const [billStartDate, setBillStartDate] = useState('');
  const [billEndDate, setBillEndDate] = useState('');
  const [showBillCalendar, setShowBillCalendar] = useState(true);
  const [isExportingBill, setIsExportingBill] = useState(false);
  const billPrintRef = React.useRef<HTMLDivElement>(null);

  // Bulk Delete State
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd]     = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';
  const decodedName = decodeURIComponent(partyName || '');

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  const loadRecords = () => {
    setIsLoading(true);
    fetchGatePasses(decodedName)
      .then(dtos => {
        const list: GatePassRecord[] = dtos
          .filter(d => d.partyName?.toLowerCase() === decodedName.toLowerCase())
          .map(d => ({
            id: d.id,
            no: d.passNo || 0,
            date: d.date || '',
            partyName: d.partyName,
            vehicleNumber: d.vehicleNumber,
            materials: d.materials,
            time: d.time,
            timePeriod: d.timePeriod as 'AM' | 'PM',
            loadWeight: d.loadWeight,
            emptyWeight: d.emptyWeight,
            netWeight: d.netWeight || (d.loadWeight - d.emptyWeight),
            netTons: d.netTons,
            villageName: d.villageName || '',
            gatePassSignature: d.gatePassSignature,
            timestamp: d.createdAt,
          }));
        setRecords(list);
      })
      .catch(err => console.error('Error loading party records:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    setCurrentPage(1);
    loadRecords();
  }, [decodedName]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalPasses = records.length;
  const totalNetTons = records.reduce((sum, r) => sum + (r.netTons ?? r.netWeight / 1000), 0);
  const uniqueVehicles = new Set(records.map(r => r.vehicleNumber.toUpperCase())).size;
  const sortedDates = records
    .map(r => parseDMY(r.date))
    .filter(Boolean)
    .sort((a, b) => (a!.getTime() - b!.getTime())) as Date[];
  const firstDate = sortedDates.length ? formatDisplayDate(records.find(r => {
    const d = parseDMY(r.date);
    return d?.getTime() === sortedDates[0]?.getTime();
  })?.date || '') : '—';
  const lastDate = sortedDates.length ? formatDisplayDate(records.find(r => {
    const d = parseDMY(r.date);
    return d?.getTime() === sortedDates[sortedDates.length - 1]?.getTime();
  })?.date || '') : '—';

  // ── Monthly chart (last 12 months) ────────────────────────────────────
  const now = new Date();
  const monthlyData: { label: string; tons: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    const tons = records
      .filter(r => {
        const rd = parseDMY(r.date);
        return rd && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      })
      .reduce((sum, r) => sum + (r.netTons ?? r.netWeight / 1000), 0);
    monthlyData.push({ label, tons });
  }
  const maxTons = Math.max(...monthlyData.map(m => m.tons), 0.01);

  const handleDelete = async (id?: string | number) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this gate pass?')) {
      try {
        await deleteGatePass(id);
        loadRecords();
      } catch {
        alert('Failed to delete gate pass.');
      }
    }
  };

  // Bulk Delete Handler
  const handleExecuteBulkDelete = async () => {
    const toBackendDate = (s: string) => {
      if (!s || !s.includes('-')) return '';
      const [y, m, d] = s.split('-');
      return `${d}/${m}/${y}`;
    };

    const formattedStart = toBackendDate(bulkStart);
    const formattedEnd = toBackendDate(bulkEnd);
    const rangeText = (formattedStart || formattedEnd)
      ? `between ${formattedStart || 'start'} and ${formattedEnd || 'today'}`
      : 'for ALL time';

    if (!window.confirm(`Are you sure you want to delete gate passes for "${decodedName}" ${rangeText}? This action cannot be undone.`)) {
      return;
    }

    setBulkLoading(true);
    try {
      const deleted = await deleteGatePassesByParty(decodedName, formattedStart, formattedEnd);
      alert(`✓ ${deleted} gate pass${deleted !== 1 ? 'es' : ''} deleted successfully for ${decodedName}.`);
      setBulkOpen(false);
      setBulkStart('');
      setBulkEnd('');
      loadRecords();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(`Failed to bulk delete: ${err.message || 'Server error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Filtered table records by Date Range (Between tableStartDate and tableEndDate)
  const filteredTableRecords = records.filter(r => {
    const rd = parseDMY(r.date);
    if (!rd) return true;

    if (tableStartDate) {
      const [sy, sm, sd] = tableStartDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd, 0, 0, 0);
      if (rd < start) return false;
    }

    if (tableEndDate) {
      const [ey, em, ed] = tableEndDate.split('-').map(Number);
      const end = new Date(ey, em - 1, ed, 23, 59, 59);
      if (rd > end) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredTableRecords.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredTableRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Bill/Statement records by preset / date range
  const getBillFilteredRecords = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (billPreset === 'Current Month') {
      return records.filter(r => {
        const d = parseDMY(r.date);
        return d && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });
    }

    if (billPreset === 'Last 3 Days') {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);
      return records.filter(r => {
        const d = parseDMY(r.date);
        return d && d >= threeDaysAgo && d <= today;
      });
    }

    if (billPreset === 'Last 7 Days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return records.filter(r => {
        const d = parseDMY(r.date);
        return d && d >= sevenDaysAgo && d <= today;
      });
    }

    if (billPreset === 'Custom' && (billStartDate || billEndDate)) {
      let start: Date | null = null;
      let end: Date | null = null;
      if (billStartDate) {
        const [sy, sm, sd] = billStartDate.split('-').map(Number);
        start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      }
      if (billEndDate) {
        const [ey, em, ed] = billEndDate.split('-').map(Number);
        end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      }
      return records.filter(r => {
        const d = parseDMY(r.date);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return records; // All Time or fallback
  };

  const billRecords = getBillFilteredRecords();
  const billTotalWeightKg = billRecords.reduce((sum, r) => sum + r.netWeight, 0);
  const billTotalTons = billRecords.reduce((sum, r) => sum + (r.netTons ?? r.netWeight / 1000), 0);

  // Grouped material breakdown summary for clean single-page billing statement
  const materialSummaries = React.useMemo(() => {
    const map = new Map<string, { count: number; weightKg: number; tons: number }>();
    billRecords.forEach(r => {
      const mat = r.materials || 'Standard Material';
      const existing = map.get(mat) || { count: 0, weightKg: 0, tons: 0 };
      const tons = r.netTons ?? r.netWeight / 1000;
      map.set(mat, {
        count: existing.count + 1,
        weightKg: existing.weightKg + r.netWeight,
        tons: existing.tons + tons
      });
    });
    return Array.from(map.entries()).map(([material, stats]) => ({
      material,
      ...stats
    }));
  }, [billRecords]);

  // Distinct materials extracted from filtered records (or defaults if none)
  const statementMaterials = React.useMemo(() => {
    const set = new Set<string>();
    billRecords.forEach(r => {
      if (r.materials && r.materials.trim()) {
        set.add(r.materials.trim().toUpperCase());
      }
    });
    const list = Array.from(set);
    if (list.length === 0) {
      return ['10 MM', '20 MM', 'POWDER'];
    }
    const order = ['10 MM', '20 MM', 'POWDER', 'DUST', '6 MM', '40 MM', 'GSB', 'WMM', 'RUBBLE'];
    list.sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [billRecords]);

  // Column totals per material
  const materialColumnTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    statementMaterials.forEach(m => {
      totals[m] = 0;
    });
    billRecords.forEach(r => {
      const mat = (r.materials || '').trim().toUpperCase();
      if (totals[mat] !== undefined) {
        totals[mat] += r.netWeight;
      }
    });
    return totals;
  }, [billRecords, statementMaterials]);

  // Direct print handler
  const handlePrintStatement = () => {
    window.print();
  };

  // Optimized PDF export: captures crisp high-res A4 document matching the physical challan ledger
  const handleExportBillPDF = async () => {
    if (!billPrintRef.current) return;
    setIsExportingBill(true);
    const element = billPrintRef.current;
    try {
      element.classList.add('rendering-pdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        logging: false,
      });

      element.classList.remove('rendering-pdf');

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      pdf.save(`Statement_${decodedName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating statement PDF:', err);
    } finally {
      element.classList.remove('rendering-pdf');
      setIsExportingBill(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-icon">S</div>
          <span className="brand-name">SHIVSTORE</span>
        </div>

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
              <li className="menu-item" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/users')}>
                <User size={20} />
                <span>Users</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/vehicles')}>
                <Truck size={20} />
                <span>Vehicles</span>
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

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="main-content">
        {/* Back button + Header + Generate Bill Action */}
        <div className="po-header">
          <div className="po-header-left">
            <button className="po-back-btn" onClick={() => navigate('/users')}>
              <ArrowLeft size={16} />
              <span>Back to Users</span>
            </button>
            <div className="po-title-block">
              <h1 className="po-title">{decodedName}</h1>
              <p className="po-subtitle">Party Overview — All gate passes &amp; lifetime stats</p>
            </div>
          </div>
          <div className="po-header-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="po-generate-bill-btn" onClick={() => setIsBillModalOpen(true)}>
              <Receipt size={16} />
              <span>Generate Statement / Bill</span>
            </button>
            <button
              className="po-generate-bill-btn"
              style={{ background: '#fff1f0', color: '#d84315', border: '1px solid #ffd0cc' }}
              onClick={() => setBulkOpen(true)}
            >
              <Trash2 size={16} />
              <span>Bulk Delete</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="po-loading">
            <div className="po-spinner" />
            <p>Loading data for <strong>{decodedName}</strong>…</p>
          </div>
        ) : (
          <>
            {/* ── Stats Cards ─────────────────────────────────────── */}
            <div className="po-stats-grid">
              <div className="po-stat-card">
                <div className="po-stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                  <FileText size={22} />
                </div>
                <div className="po-stat-info">
                  <span className="po-stat-value">{totalPasses}</span>
                  <span className="po-stat-label">Total Gate Passes</span>
                </div>
              </div>

              <div className="po-stat-card">
                <div className="po-stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                  <TrendingUp size={22} />
                </div>
                <div className="po-stat-info">
                  <span className="po-stat-value">{totalNetTons.toFixed(2)}</span>
                  <span className="po-stat-label">Total Net Tons</span>
                </div>
              </div>

              <div className="po-stat-card">
                <div className="po-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Truck size={22} />
                </div>
                <div className="po-stat-info">
                  <span className="po-stat-value">{uniqueVehicles}</span>
                  <span className="po-stat-label">Unique Vehicles</span>
                </div>
              </div>

              <div className="po-stat-card">
                <div className="po-stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <Calendar size={22} />
                </div>
                <div className="po-stat-info">
                  <span className="po-stat-value po-stat-value--sm">{firstDate}</span>
                  <span className="po-stat-label">First Pass</span>
                  <span className="po-stat-value po-stat-value--sm" style={{ marginTop: 2 }}>{lastDate}</span>
                  <span className="po-stat-label">Latest Pass</span>
                </div>
              </div>
            </div>

            {/* ── Monthly Tons Chart ───────────────────────────────── */}
            <div className="po-chart-card">
              <div className="po-chart-header">
                <div>
                  <h3 className="po-chart-title">Monthly Net Tons</h3>
                  <p className="po-chart-sub">Last 12 months activity</p>
                </div>
                <div className="po-chart-legend">
                  <span className="po-legend-dot" style={{ background: '#5c60f5' }} />
                  <span>Net Tons</span>
                </div>
              </div>

              {totalPasses === 0 ? (
                <div className="po-empty-chart">No data available</div>
              ) : (
                <div className="po-chart-wrap">
                  <svg className="po-chart-svg" viewBox="0 0 960 180" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="960" y2="30" stroke="#f1f3f9" strokeWidth="1" />
                    <line x1="0" y1="80" x2="960" y2="80" stroke="#f1f3f9" strokeWidth="1" />
                    <line x1="0" y1="130" x2="960" y2="130" stroke="#f1f3f9" strokeWidth="1" />
                    <line x1="0" y1="165" x2="960" y2="165" stroke="#e4e8f1" strokeWidth="1.5" />

                    {/* Area fill */}
                    {monthlyData.length > 1 && (() => {
                      const step = 960 / (monthlyData.length - 1);
                      const pts = monthlyData.map((m, i) => {
                        const x = i * step;
                        const y = 165 - (m.tons / maxTons) * 130;
                        return `${x},${y}`;
                      }).join(' ');
                      const lastX = 960;
                      return (
                        <>
                          <polyline
                            points={`0,165 ${pts} ${lastX},165`}
                            fill="rgba(92,96,245,0.08)"
                            stroke="none"
                          />
                          <polyline
                            points={pts}
                            fill="none"
                            stroke="#5c60f5"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          {monthlyData.map((m, i) => {
                            const x = i * step;
                            const y = 165 - (m.tons / maxTons) * 130;
                            return m.tons > 0 ? (
                              <circle key={i} cx={x} cy={y} r="4" fill="#5c60f5" />
                            ) : null;
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* X-axis labels */}
                  <div className="po-chart-labels">
                    {monthlyData.map((m, i) => (
                      <span key={i} className="po-chart-label">{m.label.split(' ')[0]}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── All Gate Passes Table ────────────────────────────── */}
            <div className="po-table-card">
              <div className="po-table-header">
                <div>
                  <h3 className="po-chart-title">All Gate Passes</h3>
                  <p className="po-chart-sub">{filteredTableRecords.length} records displayed for {decodedName}</p>
                </div>

                {/* Table Actions Row: Date Range Filter + Statement Button */}
                <div className="po-table-actions-row">
                  <div className="date-filter-wrapper po-table-filter">
                    <SingleRangeDatePicker
                      startDate={tableStartDate}
                      endDate={tableEndDate}
                      onApply={(start, end) => {
                        setTableStartDate(start);
                        setTableEndDate(end);
                        setCurrentPage(1);
                      }}
                      onReset={() => {
                        setTableStartDate('');
                        setTableEndDate('');
                        setCurrentPage(1);
                      }}
                      buttonLabel="Filter by Date"
                    />
                  </div>

                  <button
                    type="button"
                    className="po-table-statement-btn"
                    onClick={() => {
                      if (tableStartDate || tableEndDate) {
                        setBillPreset('Custom');
                        setBillStartDate(tableStartDate);
                        setBillEndDate(tableEndDate);
                      } else {
                        setBillPreset('All Time');
                        setBillStartDate('');
                        setBillEndDate('');
                      }
                      setIsBillModalOpen(true);
                    }}
                    title="Generate official Statement matching physical ledger challan sheet"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Statement</span>
                  </button>
                </div>
              </div>

              {filteredTableRecords.length === 0 ? (
                <div className="po-empty-table">
                  <Package size={40} style={{ color: '#c7cde0', marginBottom: 12 }} />
                  <p>No gate passes found {(tableStartDate || tableEndDate) ? 'for selected date range' : `for ${decodedName}`}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="users-table po-table">
                    <thead>
                      <tr>
                        <th>Pass No.</th>
                        <th>Date &amp; Time</th>
                        <th>Vehicle</th>
                        <th>Material</th>
                        <th>Village</th>
                        <th>Load (kg)</th>
                        <th>Empty (kg)</th>
                        <th>Net Weight</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map(r => (
                        <tr key={r.id || r.no} className="table-row">
                          <td className="cell-pass-no">#{r.no}</td>
                          <td className="cell-date">
                            <div className="cell-date-content">
                              <span>{r.date}</span>
                              {r.time && <span className="time-badge">{r.time} {r.timePeriod}</span>}
                            </div>
                          </td>
                          <td className="cell-vehicle">{r.vehicleNumber.toUpperCase()}</td>
                          <td><span className="po-material-badge">{r.materials}</span></td>
                          <td style={{ color: '#5c6275', fontSize: 13 }}>{(r as any).villageName || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{Number(r.loadWeight).toLocaleString()}</td>
                          <td style={{ color: '#8b92a6' }}>{Number(r.emptyWeight).toLocaleString()}</td>
                          <td className="cell-weight">
                            <div className="cell-weight-content">
                              <strong>{r.netWeight.toLocaleString()} kg</strong>
                              <span className="tons-badge">({(r.netWeight / 1000).toFixed(2)} T)</span>
                            </div>
                          </td>
                          <td className="cell-action">
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button
                                className="btn-view-pass"
                                onClick={() => { setSelectedRecord(r); setIsEditModalOpen(true); }}
                                title="View & Edit"
                              >
                                <Eye size={15} /><span>View</span>
                              </button>
                              {r.id && (
                                <button
                                  className="btn-view-pass"
                                  style={{ backgroundColor: '#ffebee', color: '#d32f2f', borderColor: '#ffcdd2' }}
                                  onClick={() => handleDelete(r.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={15} /><span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Pagination Controls ── */}
              {filteredTableRecords.length > 0 && (
                <div className="table-pagination-footer">
                  <span className="pagination-info">
                    Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredTableRecords.length)}</strong> of <strong>{filteredTableRecords.length}</strong> entries
                  </span>
                  <div className="pagination-controls">
                    <button
                      className="pg-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`pg-num-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="pg-btn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Edit Modal (reuse GatePassForm) ─────────────────────────── */}
      {isEditModalOpen && selectedRecord && (
        <div className="users-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="users-modal-container" onClick={e => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2 className="users-modal-title">View &amp; Edit Gate Pass #{selectedRecord.no}</h2>
                <p className="users-modal-subtitle">Update fields, save changes, or export to PDF</p>
              </div>
              <button className="users-modal-close" onClick={() => setIsEditModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="users-modal-body">
              <GatePassForm
                hideInnerHeader={true}
                initialRecord={selectedRecord}
                onSaved={updated => {
                  loadRecords();
                  setSelectedRecord(updated);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Party Bill / Statement Modal ───────────────────────────────── */}
      {isBillModalOpen && (
        <div className="users-modal-overlay" onClick={() => setIsBillModalOpen(false)}>
          <div className="po-bill-modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="po-bill-modal-header">
              <div className="po-bill-modal-title-group">
                <FileSpreadsheet size={22} style={{ color: '#5c60f5' }} />
                <div>
                  <h2 className="po-bill-modal-title">Party Statement / Challan Summary</h2>
                  <p className="po-bill-modal-sub">Official statement for {decodedName}</p>
                </div>
              </div>
              <button className="users-modal-close" onClick={() => setIsBillModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* View Mode Toggle Tabs */}
            <div className="po-statement-tabs-bar">
              <button
                type="button"
                className={`po-statement-tab-btn ${statementViewMode === 'challan' ? 'active' : ''}`}
                onClick={() => setStatementViewMode('challan')}
              >
                <FileSpreadsheet size={15} />
                <span>Challan Ledger Statement (Official Format)</span>
              </button>
              <button
                type="button"
                className={`po-statement-tab-btn ${statementViewMode === 'summary' ? 'active' : ''}`}
                onClick={() => setStatementViewMode('summary')}
              >
                <Receipt size={15} />
                <span>Dispatch Summary View</span>
              </button>
            </div>

            {/* Date Preset Filter Bar */}
            <div className="po-bill-filter-bar">
              <span className="po-bill-filter-label">Filter Period:</span>
              <div className="po-bill-presets">
                {(['Current Month', 'Last 3 Days', 'Last 7 Days', 'All Time', 'Custom'] as const).map(p => (
                  <button
                    key={p}
                    className={`po-bill-preset-btn ${billPreset === p ? 'active' : ''}`}
                    onClick={() => {
                      setBillPreset(p);
                      if (p === 'Custom') setShowBillCalendar(true);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {billPreset === 'Custom' && (
                showBillCalendar ? (
                  <div className="po-bill-custom-dates" style={{ width: '100%', marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <SingleRangeDatePicker
                      startDate={billStartDate}
                      endDate={billEndDate}
                      inline={true}
                      onApply={(start, end) => {
                        setBillStartDate(start);
                        setBillEndDate(end);
                        setShowBillCalendar(false);
                      }}
                      onReset={() => {
                        setBillStartDate('');
                        setBillEndDate('');
                        setShowBillCalendar(false);
                      }}
                      buttonLabel="Select Date Range"
                    />
                  </div>
                ) : (
                  <div style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#f5f6ff', padding: '10px 16px', borderRadius: '12px', border: '1px solid #cdd1fd' }}>
                    <span style={{ fontSize: '13px', color: '#1a1e35' }}>
                      Custom Period: <strong>{billStartDate ? formatDisplayDate(billStartDate) : 'Beginning'}</strong> to <strong>{billEndDate ? formatDisplayDate(billEndDate) : 'Today'}</strong>
                    </span>
                    <button
                      type="button"
                      style={{ background: '#5c60f5', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => setShowBillCalendar(true)}
                    >
                      ✏️ Change Custom Dates
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Printable Statement / Bill Preview Card */}
            <div className="po-bill-preview-wrapper">
              {statementViewMode === 'challan' ? (
                /* ── Physical Challan Sheet Format (Exact Match to Image 1) ── */
                <div className="po-challan-sheet" ref={billPrintRef}>
                  {/* Top Framed Header Box */}
                  <div className="po-challan-header-box">
                    <h2 className="po-challan-company-title">SHIV STONE CRUSHER MOTA GUNDA</h2>
                    <div className="po-challan-contact-row">
                      <span>MOBILE NUMBER :- 9712944133</span>
                      <span>MOBILE NUMBER :- 9979844133</span>
                    </div>
                    <div className="po-challan-purchaser-row">
                      <span className="po-challan-purchaser-label">PURCHASER :- </span>
                      <span className="po-challan-purchaser-val">{decodedName.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Main Challan Table Grid */}
                  <div className="po-challan-table-wrap">
                    <table className="po-challan-table">
                      <thead>
                        <tr>
                          <th className="th-sir" style={{ width: '48px' }}>SIR NO</th>
                          <th className="th-date" style={{ width: '92px' }}>DATE</th>
                          <th className="th-veh" style={{ width: '110px' }}>VEHICLE NO</th>
                          <th className="th-royalty" style={{ width: '80px' }}>ROYALTY NO</th>
                          {statementMaterials.map((mat, i) => (
                            <th key={i} className="th-material">{mat}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {billRecords.length === 0 ? (
                          <tr>
                            <td colSpan={4 + statementMaterials.length} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                              No gate pass records found for the selected date range.
                            </td>
                          </tr>
                        ) : (
                          billRecords.map((r, idx) => {
                            const passDate = r.date ? r.date.replace(/\//g, '-') : '';
                            const recMat = (r.materials || '').trim().toUpperCase();
                            return (
                              <tr key={r.id || r.no || idx} className="po-challan-data-row">
                                <td className="cell-center">{idx + 1}</td>
                                <td className="cell-center">{passDate}</td>
                                <td className="cell-center cell-veh-num">{r.vehicleNumber}</td>
                                <td className="cell-center">{r.no ? `#${r.no}` : '-'}</td>
                                {statementMaterials.map((mat, mIdx) => {
                                  const isMatch = recMat === mat;
                                  return (
                                    <td key={mIdx} className="cell-weight">
                                      {isMatch ? r.netWeight.toLocaleString('en-IN') : ''}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}

                        {/* Fill empty rows to maintain uniform ledger format */}
                        {billRecords.length > 0 && Array.from({ length: Math.max(0, 16 - billRecords.length) }).map((_, i) => (
                          <tr key={`empty-${i}`} className="po-challan-empty-row">
                            <td className="cell-center">{billRecords.length + i + 1}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            {statementMaterials.map((_, mIdx) => (
                              <td key={mIdx}></td>
                            ))}
                          </tr>
                        ))}

                        {/* Bottom Total Row */}
                        <tr className="po-challan-total-row">
                          <td colSpan={4} className="cell-total-label">TOTAL TON :-</td>
                          {statementMaterials.map((mat, mIdx) => (
                            <td key={mIdx} className="cell-total-val">
                              {materialColumnTotals[mat] > 0 ? materialColumnTotals[mat].toLocaleString('en-IN') : ''}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Stamp / Signature Area */}
                  <div className="po-challan-footer-stamp">
                    <div className="po-stamp-box">
                      <div className="po-stamp-company">SHIV STONE CRUSHER CO.</div>
                      <div className="po-stamp-gujarati">ભાવેશ ડી પટેલ</div>
                      <div className="po-stamp-role">PROPRIETOR</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Summary View ── */
                <div className="po-bill-card" ref={billPrintRef}>
                  {/* Enterprise Header */}
                  <div className="po-bill-top-header">
                    <div className="po-bill-brand">
                      <span className="po-bill-badge">GATE PASS BILLING STATEMENT</span>
                      <h1 className="po-bill-company">Shiv Stone Crusher</h1>
                      <p className="po-bill-address">Jampar Road, At. Gunda, Ta. Bhanvad, Dist. - Dev Bhumi Dwarka</p>
                      <p className="po-bill-contact">Mo. 99798 44133 | Mo. 94274 44133</p>
                    </div>
                  </div>

                  <div className="po-bill-divider" />

                  {/* Statement Metadata Grid */}
                  <div className="po-bill-meta-grid">
                    <div className="po-bill-meta-item">
                      <span className="po-bill-meta-label">PARTY NAME</span>
                      <span className="po-bill-meta-val">{decodedName}</span>
                    </div>
                    <div className="po-bill-meta-item">
                      <span className="po-bill-meta-label">VILLAGE / LOCATION</span>
                      <span className="po-bill-meta-val">{(records[0] as any)?.villageName || '—'}</span>
                    </div>
                    <div className="po-bill-meta-item">
                      <span className="po-bill-meta-label">STATEMENT PERIOD</span>
                      <span className="po-bill-meta-val" style={{ color: '#5c60f5' }}>
                        {billPreset === 'Custom'
                          ? (billStartDate || billEndDate
                              ? `${billStartDate ? formatDisplayDate(billStartDate) : 'Beginning'} to ${billEndDate ? formatDisplayDate(billEndDate) : 'Today'}`
                              : 'Custom Range')
                          : billPreset
                        }
                      </span>
                    </div>
                    <div className="po-bill-meta-item">
                      <span className="po-bill-meta-label">GENERATED ON</span>
                      <span className="po-bill-meta-val">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>

                  {/* Section 1: Material Dispatch Summary Table */}
                  <div className="po-bill-section-block">
                    <h4 className="po-bill-section-title">MATERIAL DISPATCH SUMMARY</h4>
                    <div className="po-bill-table-responsive">
                      <table className="po-bill-table">
                        <thead>
                          <tr>
                            <th>Material Type</th>
                            <th style={{ textAlign: 'center' }}>Total Dispatches</th>
                            <th style={{ textAlign: 'right' }}>Cumulative Weight (kg)</th>
                            <th style={{ textAlign: 'right' }}>Total Net Tons</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialSummaries.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#8b92a6' }}>
                                No material dispatches found for selected period.
                              </td>
                            </tr>
                          ) : (
                            materialSummaries.map((ms, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 700, color: '#1a1e35' }}>{ms.material}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{ms.count} Trips</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{ms.weightKg.toLocaleString()} kg</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                  {ms.tons.toFixed(2)} Tons
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Statement Summary & Totals */}
                  <div className="po-bill-summary-bar">
                    <div className="po-bill-sum-item">
                      <span className="po-bill-sum-label">TOTAL DISPATCHES</span>
                      <span className="po-bill-sum-val">{billRecords.length} Passes</span>
                    </div>
                    <div className="po-bill-sum-item">
                      <span className="po-bill-sum-label">CUMULATIVE WEIGHT</span>
                      <span className="po-bill-sum-val">{billTotalWeightKg.toLocaleString()} kg</span>
                    </div>
                    <div className="po-bill-sum-item po-bill-sum-item--highlight">
                      <span className="po-bill-sum-label">TOTAL NET TONS</span>
                      <span className="po-bill-sum-val">{billTotalTons.toFixed(2)} Tons</span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="po-bill-signatures">
                    <div className="po-bill-sig-col">
                      <div className="po-bill-sig-line" />
                      <span className="po-bill-sig-text">Shiv Stone (Auth Signature)</span>
                    </div>
                    <div className="po-bill-sig-col">
                      <div className="po-bill-sig-line" />
                      <span className="po-bill-sig-text">Party / Receiver Signature</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="po-bill-modal-actions">
              <button
                className="po-bill-btn-export"
                onClick={handleExportBillPDF}
                disabled={isExportingBill || billRecords.length === 0}
              >
                <Download size={16} />
                <span>{isExportingBill ? 'Exporting PDF…' : 'Export Statement PDF'}</span>
              </button>
              <button
                className="po-bill-btn-print"
                onClick={handlePrintStatement}
                disabled={billRecords.length === 0}
                type="button"
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
              <button className="po-bill-btn-close" onClick={() => setIsBillModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Modal ─────────────────────────────────────────── */}
      {bulkOpen && (
        <div className="users-modal-overlay" onClick={() => setBulkOpen(false)}>
          <div className="users-modal-box" style={{ maxWidth: '620px', height: 'auto', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="users-modal-header" style={{ borderBottom: '1px solid #fee2e2', background: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={20} color="#dc2626" />
                <div>
                  <h2 style={{ color: '#dc2626', margin: 0, fontSize: '17px' }}>Bulk Delete Gate Passes</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                    Party: <strong>{decodedName}</strong>
                  </p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setBulkOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="users-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', background: '#ffffff' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: 1.5 }}>
                Select a date range below to delete gate passes for <strong>{decodedName}</strong>. Leave reset for <strong>ALL</strong> history.
              </p>

              {/* SingleRangeDatePicker Inline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                <SingleRangeDatePicker
                  startDate={bulkStart}
                  endDate={bulkEnd}
                  inline={true}
                  onApply={(start, end) => {
                    setBulkStart(start);
                    setBulkEnd(end);
                  }}
                  onReset={() => {
                    setBulkStart('');
                    setBulkEnd('');
                  }}
                  buttonLabel="Select Date Range"
                />
              </div>

              {/* Range badge */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                {bulkStart || bulkEnd
                  ? <>Target: Passes from <strong>{bulkStart || 'Beginning'}</strong> to <strong>{bulkEnd || 'Today'}</strong></>
                  : <>Target: <strong>All Gate Passes (All Time)</strong></>
                }
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '10px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  onClick={() => setBulkOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  style={{ background: '#dc2626', border: 'none', color: '#ffffff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={handleExecuteBulkDelete}
                >
                  <Trash2 size={15} />
                  <span>{bulkLoading ? 'Deleting...' : 'Delete Passes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyOverview;
