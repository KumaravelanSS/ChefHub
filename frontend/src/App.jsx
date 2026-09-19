import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPortalsPage from './pages/LandingPortalsPage';
import CustomerSite from './pages/CustomerSite';
import ChefSite from './pages/ChefSite';
import RiderSite from './pages/RiderSite';
import AdminSite from './pages/AdminSite';

function MainApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('chefhub_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chefhub_theme') || 'dark';
  });

  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('chefhub_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLoginSuccess = (user, token) => {
    localStorage.setItem('chefhub_token', token);
    localStorage.setItem('chefhub_user', JSON.stringify(user));
    setCurrentUser(user);

    if (user.role === 'CUSTOMER') navigate('/');
    else if (user.role === 'VENDOR') navigate('/chef/dashboard');
    else if (user.role === 'RIDER') navigate('/rider/dashboard');
    else if (user.role === 'ADMIN') navigate('/admin/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('chefhub_token');
    localStorage.removeItem('chefhub_user');
    setCurrentUser(null);
    navigate('/portals');
  };

  const handleQuickLoginFromLaunchpad = async (identifier, password, role, targetPath) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, username: identifier, password })
      });
      const data = await res.json();
      if (data.success) {
        handleLoginSuccess(data.user, data.token);
      } else {
        alert(`Login Failed: ${data.message}`);
      }
    } catch (err) {
      alert('Failed to connect to backend server.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-300">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 pb-16">
        <Routes>
          {/* Portals Launchpad */}
          <Route
            path="/portals"
            element={<LandingPortalsPage onQuickLogin={handleQuickLoginFromLaunchpad} />}
          />

          {/* Customer Site */}
          <Route
            path="/"
            element={<CustomerSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />}
          />
          <Route
            path="/customer/login"
            element={<CustomerSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />}
          />

          {/* Chef / Kitchen Site */}
          <Route
            path="/chef/login"
            element={<ChefSite user={currentUser} onLogin={handleLoginSuccess} />}
          />
          <Route
            path="/chef/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="VENDOR" redirectPath="/chef/login">
                <ChefSite user={currentUser} onLogin={handleLoginSuccess} />
              </ProtectedRoute>
            }
          />

          {/* Rider Fleet Site */}
          <Route
            path="/rider/login"
            element={<RiderSite user={currentUser} onLogin={handleLoginSuccess} />}
          />
          <Route
            path="/rider/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="RIDER" redirectPath="/rider/login">
                <RiderSite user={currentUser} onLogin={handleLoginSuccess} />
              </ProtectedRoute>
            }
          />

          {/* Admin Control Master Site */}
          <Route
            path="/admin/login"
            element={<AdminSite user={currentUser} onLogin={handleLoginSuccess} />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="ADMIN" redirectPath="/admin/login">
                <AdminSite user={currentUser} onLogin={handleLoginSuccess} />
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/portals" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 ChefHub DBMS Project. Production-Level Multi-Portal Ecosystem.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>7 MySQL Relational Tables</span>
            <span>•</span>
            <span>5 MongoDB Collections</span>
            <span>•</span>
            <span>12 Schemas Total</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
