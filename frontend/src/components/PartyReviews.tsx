import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users as UsersIcon,
  FileText,
  Truck,
  Search,
  LogOut,
  Calendar,
  ArrowUpDown,
  X,
  TrendingUp,
  PackageCheck,
  Building2
} from 'lucide-react';
import { fetchGatePasses } from '../services/api';
import type { GatePassDTO } from '../services/api';
import SingleRangeDatePicker from './SingleRangeDatePicker';
import Pagination from './Pagination';
import logoImg from '../assets/LOGO.png';
import './PartyReviews.css';
import './Dashboard.css';
import './Users.css';
import './PartyOverview.css';

export interface PartySummary {
  partyName: string;
  totalPasses: number;
  totalNetTons: number;
  uniqueVehicles: number;
  lastDispatchDate: string;
  firstDispatchDate: string;
  villageName?: string;
}

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
  if (!d) return dateStr || '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export const PartyReviews: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'tons' | 'passes' | 'name'>('tons');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  // Debounce search query updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load and aggregate party data from DB
  const loadPartyData = () => {
    setIsLoading(true);
    fetchGatePasses('')
      .then(dtos => {
        // Group passes by party name
        const partyMap = new Map<string, {
          originalName: string;
          passes: GatePassDTO[];
        }>();

        dtos.forEach(d => {
          if (!d.partyName || !d.partyName.trim()) return;
          const key = d.partyName.trim().toUpperCase();
          if (!partyMap.has(key)) {
            partyMap.set(key, {
              originalName: d.partyName.trim(),
              passes: []
            });
          }
          partyMap.get(key)!.passes.push(d);
        });

        // Date range filter
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;
        if (startDate) {
          const [sy, sm, sd] = startDate.split('-').map(Number);
          startLimit = new Date(sy, sm - 1, sd, 0, 0, 0);
        }
        if (endDate) {
          const [ey, em, ed] = endDate.split('-').map(Number);
          endLimit = new Date(ey, em - 1, ed, 23, 59, 59);
        }

        const summaryList: PartySummary[] = [];

        partyMap.forEach((val) => {
          let passes = val.passes;

          // Filter passes by date range if selected
          if (startLimit || endLimit) {
            passes = passes.filter(p => {
              const pd = parseDMY(p.date || '');
              if (!pd) return true;
              if (startLimit && pd < startLimit) return false;
              if (endLimit && pd > endLimit) return false;
              return true;
            });
          }

          if (passes.length === 0) return;

          const totalPasses = passes.length;
          const totalNetTons = passes.reduce((sum, p) => sum + (p.netTons ?? (p.netWeight ? p.netWeight / 1000 : 0)), 0);
          const uniqueVehicles = new Set(passes.map(p => p.vehicleNumber?.toUpperCase()).filter(Boolean)).size;

          const sortedPasses = [...passes].sort((a, b) => {
            const da = parseDMY(a.date || '')?.getTime() || 0;
            const db = parseDMY(b.date || '')?.getTime() || 0;
            return db - da; // newest first
          });

          const lastDispatchDate = formatDisplayDate(sortedPasses[0]?.date || '');
          const firstDispatchDate = formatDisplayDate(sortedPasses[sortedPasses.length - 1]?.date || '');
          const villageName = passes.find(p => p.villageName && p.villageName.trim())?.villageName || '—';

          summaryList.push({
            partyName: val.originalName,
            totalPasses,
            totalNetTons,
            uniqueVehicles,
            lastDispatchDate,
            firstDispatchDate,
            villageName
          });
        });

        setParties(summaryList);
      })
      .catch(err => {
        console.error('Failed to load party reviews:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setCurrentPage(1);
    loadPartyData();
  }, [startDate, endDate]);

  // Search filter
  const filteredParties = parties.filter(p => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.trim().toLowerCase();
    const matchName = p.partyName.toLowerCase().includes(q);
    const matchVillage = p.villageName ? p.villageName.toLowerCase().includes(q) : false;
    return matchName || matchVillage;
  });

  // Sorting
  const sortedParties = [...filteredParties].sort((a, b) => {
    if (sortBy === 'passes') return b.totalPasses - a.totalPasses;
    if (sortBy === 'name') return a.partyName.localeCompare(b.partyName);
    return b.totalNetTons - a.totalNetTons; // default by tons
  });

  // Metric totals
  const totalPartyCount = sortedParties.length;
  const totalPassesSum = sortedParties.reduce((sum, p) => sum + p.totalPasses, 0);
  const totalTonsSum = sortedParties.reduce((sum, p) => sum + p.totalNetTons, 0);

  // Pagination calculations
  const totalPages = Math.ceil(sortedParties.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedParties = sortedParties.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="dashboard-container">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar Navigation ────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logoImg} alt="Shiv Stone Crusher Logo" className="app-logo-img" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          <span className="brand-name">SHIV STONE</span>
          <button className="sidebar-close-btn" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close sidebar">
            &times;
          </button>
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
              <li className="menu-item active">
                <UsersIcon size={20} />
                <span>Party Reviews</span>
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

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="top-header pr-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="page-title-area">
            <h1 className="page-title">Party Reviews &amp; Directory</h1>
            <span className="page-date">Directory of all registered parties, dispatch volumes, and total gate passes</span>
          </div>
        </header>

        {/* ── Top Metric Cards ─────────────────────────────────────────────── */}
        <div className="vo-stats-grid">
          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-blue">
              <Building2 size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Unique Parties</span>
              <h3 className="vo-stat-val">{totalPartyCount}</h3>
              <span className="vo-stat-sub">Active client parties</span>
            </div>
          </div>

          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-purple">
              <PackageCheck size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Total Gate Passes Issued</span>
              <h3 className="vo-stat-val">{totalPassesSum.toLocaleString()}</h3>
              <span className="vo-stat-sub">Total issued forms</span>
            </div>
          </div>

          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-green">
              <TrendingUp size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Total Tonnage Dispatched</span>
              <h3 className="vo-stat-val">{totalTonsSum.toFixed(2)} Tons</h3>
              <span className="vo-stat-sub">Cumulative net weight</span>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls Bar ───────────────────────────────── */}
        <div className="vo-controls-card">
          <div className="vo-search-box">
            <Search size={18} className="vo-search-icon" />
            <input
              type="text"
              placeholder="Search by Party Name or Village..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="vo-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="vo-date-box">
            <SingleRangeDatePicker
              startDate={startDate}
              endDate={endDate}
              onApply={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                setCurrentPage(1);
              }}
              onReset={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              buttonLabel="Filter by Date"
            />
          </div>

          {/* Sort Selector */}
          <div className="vo-sort-box">
            <ArrowUpDown size={15} className="vo-sort-icon" />
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="tons">Sort by Total Tons (High to Low)</option>
              <option value="passes">Sort by Gate Passes Count</option>
              <option value="name">Sort by Party Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* ── Party Reviews Table ───────────────────────────────────────── */}
        <div className="table-card vo-table-card">
          {isLoading ? (
            <div className="empty-table-state">
              <div className="empty-icon">⏳</div>
              <h3>Loading Party Directory...</h3>
              <p>Computing party dispatch statistics from database</p>
            </div>
          ) : sortedParties.length === 0 ? (
            <div className="empty-table-state">
              <div className="empty-icon">🏢</div>
              <h3>No Parties Found</h3>
              <p>{searchQuery || startDate || endDate ? 'No party dispatches match the selected filters.' : 'No gate pass parties registered yet.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="users-table vo-table">
                <thead>
                  <tr>
                    <th>Rank / Party Name</th>
                    <th>Village</th>
                    <th style={{ textAlign: 'center' }}>Total Passes</th>
                    <th style={{ textAlign: 'right' }}>Total Net Weight</th>
                    <th>Latest Activity</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedParties.map((p, idx) => {
                    const globalRank = startIndex + idx + 1;
                    return (
                      <tr key={p.partyName} className="table-row">
                        <td className="vo-cell-vehicle">
                          <div className="vo-vehicle-badge">
                            <span className="vo-rank-num">#{globalRank}</span>
                            <div className="vo-veh-details">
                              <button
                                className="party-name-link"
                                onClick={() => navigate(`/party/${encodeURIComponent(p.partyName)}`)}
                                title={`View overview for ${p.partyName}`}
                              >
                                <strong className="vo-veh-no" style={{ fontSize: '14.5px' }}>{p.partyName}</strong>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>
                          {p.villageName || '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          <span className="vo-trips-badge">{p.totalPasses} Passes</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                          {p.totalNetTons.toFixed(2)} Tons
                        </td>
                        <td className="cell-date">
                          <div className="cell-date-content">
                            <Calendar size={13} style={{ color: '#64748b' }} />
                            <span>{p.lastDispatchDate}</span>
                          </div>
                        </td>
                        <td className="cell-action" style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view-pass btn-overview-pass"
                            onClick={() => navigate(`/party/${encodeURIComponent(p.partyName)}`)}
                            title={`Open overview page for ${p.partyName}`}
                          >
                            <User size={15} />
                            <span>Overview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Footer ────────────────────────────────────────── */}
          {!isLoading && sortedParties.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalEntries={sortedParties.length}
              startIndex={startIndex}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={page => setCurrentPage(page)}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default PartyReviews;
