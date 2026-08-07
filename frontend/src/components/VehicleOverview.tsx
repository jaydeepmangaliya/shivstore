import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Truck,
  Search,
  LogOut,
  Calendar,
  Layers,
  ArrowUpDown,
  Eye,
  X,
  TrendingUp,
  PackageCheck
} from 'lucide-react';
import { fetchVehicleSummaries } from '../services/api';
import type { VehicleSummaryDTO, GatePassDTO } from '../services/api';
import SingleRangeDatePicker from './SingleRangeDatePicker';
import GatePassForm from './GatePassForm';
import type { GatePassRecord } from './GatePassForm';
import './VehicleOverview.css';
import './Dashboard.css';
import './PartyOverview.css';

export const VehicleOverview: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('ALL');
  const [sortBy, setSortBy] = useState<'tons' | 'trips' | 'vehicle'>('tons');

  // Debounce search query to prevent calling API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Detail Modal state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummaryDTO | null>(null);
  const [selectedGatePassRecord, setSelectedGatePassRecord] = useState<GatePassRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  const loadData = () => {
    setIsLoading(true);
    fetchVehicleSummaries(startDate, endDate, debouncedSearch)
      .then(data => {
        setVehicles(data);
      })
      .catch(err => {
        console.error('Failed to fetch vehicle summaries:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, debouncedSearch]);

  // Extract all unique material names across all vehicles
  const allMaterialNames = Array.from(
    new Set(
      vehicles.flatMap(v => Object.keys(v.materialBreakdownTons || {}))
    )
  ).sort();

  // Filter vehicles by material if selected
  const filteredVehicles = vehicles.filter(v => {
    if (selectedMaterial === 'ALL') return true;
    const matTons = v.materialBreakdownTons ? v.materialBreakdownTons[selectedMaterial] : 0;
    return matTons && matTons > 0;
  });

  // Sort vehicles
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortBy === 'trips') return b.totalTrips - a.totalTrips;
    if (sortBy === 'vehicle') return a.vehicleNumber.localeCompare(b.vehicleNumber);
    return b.totalTons - a.totalTons; // default tons
  });

  // Overall totals
  const totalVehicles = sortedVehicles.length;
  const totalTripsSum = sortedVehicles.reduce((sum, v) => sum + v.totalTrips, 0);
  const totalTonsSum = sortedVehicles.reduce((sum, v) => sum + v.totalTons, 0);

  const convertDtoToRecord = (dto: GatePassDTO): GatePassRecord => ({
    id: dto.id,
    no: dto.passNo || 0,
    date: dto.date || '',
    partyName: dto.partyName,
    vehicleNumber: dto.vehicleNumber,
    materials: dto.materials,
    time: dto.time,
    timePeriod: dto.timePeriod as 'AM' | 'PM',
    loadWeight: dto.loadWeight,
    emptyWeight: dto.emptyWeight,
    netWeight: dto.netWeight || (dto.loadWeight - dto.emptyWeight),
    netTons: dto.netTons,
    villageName: dto.villageName || '',
    gatePassSignature: dto.gatePassSignature,
    timestamp: dto.createdAt,
  });

  return (
    <div className="dashboard-container">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar Navigation ────────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">S</div>
          <span className="brand-name">SHIVSTORE</span>
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

      {/* ── Main Vehicle Analytics Content ────────────────────────────────── */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header vo-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="page-title-area">
            <h1 className="page-title">Vehicle Transport Analytics</h1>
            <span className="page-date">Track tonnage, trip counts, and material dispatches per vehicle</span>
          </div>
        </header>

        {/* Top Metric Cards */}
        <div className="vo-stats-grid">
          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-blue">
              <Truck size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Active Vehicles</span>
              <h3 className="vo-stat-val">{totalVehicles}</h3>
              <span className="vo-stat-sub">Registered dispatches</span>
            </div>
          </div>

          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-purple">
              <PackageCheck size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Total Trips Dispatched</span>
              <h3 className="vo-stat-val">{totalTripsSum.toLocaleString()}</h3>
              <span className="vo-stat-sub">Completed transport trips</span>
            </div>
          </div>

          <div className="vo-stat-card">
            <div className="vo-stat-icon vo-icon-green">
              <TrendingUp size={24} />
            </div>
            <div className="vo-stat-info">
              <span className="vo-stat-label">Total Weight Transported</span>
              <h3 className="vo-stat-val">{totalTonsSum.toFixed(2)} Tons</h3>
              <span className="vo-stat-sub">Cumulative net weight</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="vo-controls-card">
          <div className="vo-search-box">
            <Search size={18} className="vo-search-icon" />
            <input
              type="text"
              placeholder="Search by Vehicle Registration No..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="vo-clear-btn"
                onClick={() => setSearchQuery('')}
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
              }}
              onReset={() => {
                setStartDate('');
                setEndDate('');
              }}
              buttonLabel="Filter by Date"
            />
          </div>

          {/* Sort Selector */}
          <div className="vo-sort-box">
            <ArrowUpDown size={15} className="vo-sort-icon" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="tons">Sort by Total Tons (High to Low)</option>
              <option value="trips">Sort by Total Trips</option>
              <option value="vehicle">Sort by Vehicle Number</option>
            </select>
          </div>
        </div>

        {/* Material Filter Chips */}
        {allMaterialNames.length > 0 && (
          <div className="vo-material-chips-bar">
            <span className="vo-chip-label"><Layers size={14} /> Material Filter:</span>
            <button
              className={`vo-material-chip ${selectedMaterial === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedMaterial('ALL')}
            >
              All Materials
            </button>
            {allMaterialNames.map(m => (
              <button
                key={m}
                className={`vo-material-chip ${selectedMaterial === m ? 'active' : ''}`}
                onClick={() => setSelectedMaterial(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Vehicles Table / Leaderboard */}
        <div className="table-card vo-table-card">
          {isLoading ? (
            <div className="empty-table-state">
              <div className="empty-icon">⏳</div>
              <h3>Loading Vehicle Analytics...</h3>
              <p>Computing vehicle transport statistics from database</p>
            </div>
          ) : sortedVehicles.length === 0 ? (
            <div className="empty-table-state">
              <div className="empty-icon">🚚</div>
              <h3>No Vehicles Found</h3>
              <p>{searchQuery || startDate || endDate ? 'No vehicle dispatches match the selected filters.' : 'No gate pass dispatches registered yet.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="users-table vo-table">
                <thead>
                  <tr>
                    <th>Rank / Vehicle No.</th>
                    <th style={{ textAlign: 'center' }}>Total Trips</th>
                    <th style={{ textAlign: 'right' }}>Cumulative Weight (kg)</th>
                    <th style={{ textAlign: 'right' }}>Total Net Tons</th>
                    <th>Material Breakdown</th>
                    <th>Last Active Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVehicles.map((v, idx) => {
                    return (
                      <tr key={v.vehicleNumber} className="table-row">
                        <td className="vo-cell-vehicle">
                          <div className="vo-vehicle-badge">
                            <span className="vo-rank-num">#{idx + 1}</span>
                            <div className="vo-veh-details">
                              <strong className="vo-veh-no">{v.vehicleNumber}</strong>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          <span className="vo-trips-badge">{v.totalTrips} Trips</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                          {v.totalWeightKg.toLocaleString()} kg
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                          {v.totalTons.toFixed(2)} Tons
                        </td>
                        <td>
                          <div className="vo-materials-list">
                            {Object.entries(v.materialBreakdownTons || {}).map(([mat, tons]) => (
                              <span key={mat} className="vo-mat-tag">
                                <strong>{mat}</strong>: {tons.toFixed(1)}T
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="cell-date">
                          <div className="cell-date-content">
                            <Calendar size={13} style={{ color: '#64748b' }} />
                            <span>{v.lastDispatchDate}</span>
                          </div>
                        </td>
                        <td className="cell-action" style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view-pass"
                            onClick={() => setSelectedVehicle(v)}
                            title="View vehicle dispatches"
                          >
                            <Eye size={15} />
                            <span>View Dispatches</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Vehicle Dispatches Detail Modal ─────────────────────────────── */}
      {selectedVehicle && (
        <div className="users-modal-overlay" onClick={() => setSelectedVehicle(null)}>
          <div className="vo-modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="vo-modal-header">
              <div className="vo-modal-title-group">
                <Truck size={24} style={{ color: '#5c60f5' }} />
                <div>
                  <h2 className="vo-modal-title">Vehicle {selectedVehicle.vehicleNumber} Dispatches</h2>
                  <p className="vo-modal-sub">
                    Total {selectedVehicle.totalTrips} trips • {selectedVehicle.totalTons.toFixed(2)} Net Tons transported
                  </p>
                </div>
              </div>
              <button className="users-modal-close" onClick={() => setSelectedVehicle(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="vo-modal-body">
              {/* Material Summary Pill Bar */}
              <div className="vo-modal-mat-summary">
                <span className="vo-summary-label">Material Transport Breakdown:</span>
                <div className="vo-summary-pills">
                  {Object.entries(selectedVehicle.materialBreakdownTons || {}).map(([mat, tons]) => (
                    <div key={mat} className="vo-summary-pill">
                      <span>{mat}</span>
                      <strong>{tons.toFixed(2)} Tons</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Dispatches List */}
              <div className="vo-dispatches-list-title">Recent Gate Pass Dispatches</div>
              <div className="table-responsive">
                <table className="users-table vo-modal-table">
                  <thead>
                    <tr>
                      <th>Pass No.</th>
                      <th>Date &amp; Time</th>
                      <th>Party Name</th>
                      <th>Material</th>
                      <th>Net Weight</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVehicle.recentDispatches || []).map((pass) => (
                      <tr key={pass.id || pass.passNo}>
                        <td className="cell-pass-no">#{pass.passNo}</td>
                        <td className="cell-date">
                          <span>{pass.date} {pass.time} {pass.timePeriod}</span>
                        </td>
                        <td className="cell-name">
                          <button
                            className="party-name-link"
                            onClick={() => {
                              setSelectedVehicle(null);
                              navigate(`/party/${encodeURIComponent(pass.partyName)}`);
                            }}
                          >
                            <strong>{pass.partyName}</strong>
                          </button>
                        </td>
                        <td>
                          <span className="vo-mat-tag"><strong>{pass.materials}</strong></span>
                        </td>
                        <td className="cell-weight">
                          <strong>{pass.netWeight?.toLocaleString()} kg</strong>
                          <span className="tons-badge">({pass.netTons?.toFixed(2)} Tons)</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view-pass"
                            onClick={() => {
                              setSelectedGatePassRecord(convertDtoToRecord(pass));
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit & View Single Gate Pass Modal */}
      {isEditModalOpen && selectedGatePassRecord && (
        <div className="users-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="users-modal-box" onClick={e => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2>View Gate Pass #{selectedGatePassRecord.no}</h2>
                <p>Vehicle {selectedGatePassRecord.vehicleNumber}</p>
              </div>
              <button className="users-modal-close" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="users-modal-body">
              <GatePassForm
                initialRecord={selectedGatePassRecord}
                onSaved={() => {
                  loadData();
                  setIsEditModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleOverview;
