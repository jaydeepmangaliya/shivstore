import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Search,
  Eye,
  X,
  PlusCircle,
  LogOut,
  Trash2,
  Truck
} from 'lucide-react';
import { fetchGatePasses, deleteGatePass } from '../services/api';
import GatePassForm from './GatePassForm';
import type { GatePassRecord } from './GatePassForm';
import SingleRangeDatePicker from './SingleRangeDatePicker';
import './Users.css';
import './Dashboard.css';

function parseDMY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [records, setRecords] = useState<GatePassRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [selectedRecord, setSelectedRecord] = useState<GatePassRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  // Load saved gate passes from live DB API
  const loadRecords = (q: string = searchQuery) => {
    setIsLoading(true);
    fetchGatePasses(q)
      .then(dtos => {
        const recordsList: GatePassRecord[] = dtos.map(d => ({
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
        setRecords(recordsList);
      })
      .catch(err => {
        console.error('Error loading records from DB:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setCurrentPage(1);
    loadRecords(searchQuery);
  }, [searchQuery]);

  const handleDeleteRecord = async (id?: string | number) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this gate pass from DB?')) {
      try {
        await deleteGatePass(id);
        loadRecords();
      } catch (err) {
        console.error('Failed to delete record:', err);
        alert('Failed to delete gate pass record.');
      }
    }
  };

  const handleOpenEditModal = (record: GatePassRecord) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleRecordUpdated = (updatedRecord: GatePassRecord) => {
    loadRecords(); // Refresh table list
    setSelectedRecord(updatedRecord);
  };

  // Filter records by Date Range (Between startDate and endDate)
  const filteredRecords = records.filter(r => {
    const rd = parseDMY(r.date);
    if (!rd) return true;

    if (startDate) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd, 0, 0, 0);
      if (rd < start) return false;
    }

    if (endDate) {
      const [ey, em, ed] = endDate.split('-').map(Number);
      const end = new Date(ey, em - 1, ed, 23, 59, 59);
      if (rd > end) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
              <li className="menu-item active">
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

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="top-header users-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="page-title-area">
            <h1 className="page-title">Users & Gate Passes</h1>
            <span className="page-date">All issued passes ordered by newest first</span>
          </div>

          <button className="btn-new-pass" onClick={() => navigate('/forms')}>
            <PlusCircle size={16} />
            <span>New Gate Pass</span>
          </button>
        </header>

        {/* ── Search & Filter Controls ───────────────────────────────────── */}
        <div className="users-controls-card">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon-inside" />
            <input
              type="text"
              placeholder="Search by Party Name, Village, Vehicle No. or Pass No..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>
            )}
          </div>

          <div className="date-filter-wrapper">
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

          {searchQuery && (
            <button
              className="btn-reset-filter"
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              title="Clear search"
            >
              ✕ Clear Search
            </button>
          )}
        </div>

        {/* ── Users / Gate Pass Table ────────────────────────────────────── */}
        <div className="table-card">
          {isLoading ? (
            <div className="empty-table-state">
              <div className="empty-icon">⏳</div>
              <h3>Loading Database Records...</h3>
              <p>Fetching live gate pass data from backend</p>
            </div>
          ) : records.length === 0 ? (
            <div className="empty-table-state">
              <div className="empty-icon">🧾</div>
              <h3>No Gate Pass Records Found</h3>
              <p>{searchQuery || startDate || endDate ? 'No matches found for your search/date filter.' : 'No gate pass forms have been created yet.'}</p>
              {!searchQuery && !startDate && !endDate && (
                <button className="btn-create-first" onClick={() => navigate('/forms')}>
                  Create Gate Pass Now
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Pass No.</th>
                    <th>Name (Party)</th>
                    <th>Village</th>
                    <th>Vehicle No.</th>
                    <th>Date &amp; Time</th>
                    <th>Net Weight</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r) => (
                    <tr key={r.id || r.no} className="table-row">
                      <td className="cell-pass-no">#{r.no}</td>
                      <td className="cell-name">
                        <button
                          className="party-name-link"
                          onClick={() => navigate(`/party/${encodeURIComponent(r.partyName)}`)}
                          title={`View overview for ${r.partyName}`}
                        >
                          <strong>{r.partyName}</strong>
                        </button>
                      </td>
                      <td className="cell-phone">{r.villageName || '—'}</td>
                      <td className="cell-vehicle">{r.vehicleNumber.toUpperCase()}</td>
                      <td className="cell-date">
                        <div className="cell-date-content">
                          <span>{r.date}</span>
                          {r.time && <span className="time-badge">{r.time} {r.timePeriod}</span>}
                        </div>
                      </td>
                      <td className="cell-weight">
                        <div className="cell-weight-content">
                          <strong>{r.netWeight.toLocaleString()} kg</strong>
                          <span className="tons-badge">({(r.netWeight / 1000).toFixed(2)} Tons)</span>
                        </div>
                      </td>
                      <td className="cell-action">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn-view-pass btn-overview-pass"
                            onClick={() => navigate(`/party/${encodeURIComponent(r.partyName)}`)}
                            title="Party Overview"
                          >
                            <User size={15} />
                            <span>Overview</span>
                          </button>
                          <button
                            className="btn-view-pass"
                            onClick={() => handleOpenEditModal(r)}
                            title="View &amp; Edit Gate Pass"
                          >
                            <Eye size={15} />
                            <span>View</span>
                          </button>
                          {r.id && (
                            <button
                              className="btn-view-pass"
                              style={{ backgroundColor: '#ffebee', color: '#d32f2f', borderColor: '#ffcdd2' }}
                              onClick={() => handleDeleteRecord(r.id)}
                              title="Delete Gate Pass from DB"
                            >
                              <Trash2 size={15} />
                              <span>Delete</span>
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

          {/* ── Pagination Footer ────────────────────────────────────────── */}
          {records.length > 0 && (
            <div className="table-pagination-footer">
              <span className="pagination-info">
                Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + ITEMS_PER_PAGE, records.length)}</strong> of <strong>{records.length}</strong> entries
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
      </main>

      {/* ── Edit & View Gate Pass Modal ────────────────────────────────────── */}
      {isEditModalOpen && selectedRecord && (
        <div className="users-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="users-modal-box" onClick={e => e.stopPropagation()}>
            <div className="users-modal-header">
              <div>
                <h2>View & Edit Gate Pass #{selectedRecord.no}</h2>
                <p>Update fields, save changes, or export to PDF</p>
              </div>
              <button className="btn-close-modal" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="users-modal-body">
              <GatePassForm
                initialRecord={selectedRecord}
                onSaved={handleRecordUpdated}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
