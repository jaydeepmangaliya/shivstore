import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, FileText, LogOut, Truck } from 'lucide-react';
import GatePassForm from './GatePassForm';
import './Forms.css';
import './Dashboard.css';

export const Forms: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const userName = localStorage.getItem('user_name') || 'Jaydeep';
  const userRole = localStorage.getItem('user_role') || 'Store Manager';

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard-container">
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">S</div>
          <span className="brand-name">SHIV STONE</span>
          <button className="sidebar-close-btn" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close sidebar">&times;</button>
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
              <li className="menu-item active">
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

      {/* Main Content — Gate Pass form directly */}
      <main className="main-content">
        <header className="top-header">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open sidebar">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="page-title-area">
            <h1 className="page-title">Gate Pass Entry</h1>
            <span className="page-date">Fill all required fields · Save before exporting PDF</span>
          </div>
        </header>

        <GatePassForm />
      </main>
    </div>
  );
};
