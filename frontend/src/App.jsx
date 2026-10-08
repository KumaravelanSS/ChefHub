import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import CustomerSite from './pages/CustomerSite';
import CustomerAuthPage from './pages/CustomerAuthPage';
import ChefSite from './pages/ChefSite';
import ChefAuthPage from './pages/ChefAuthPage';
import RiderSite from './pages/RiderSite';
import RiderAuthPage from './pages/RiderAuthPage';
import AdminSite from './pages/AdminSite';
import ErrorBoundary from './components/ErrorBoundary';

function MainApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('chefhub_user');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
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
    const currentPath = window.location.pathname;
    localStorage.removeItem('chefhub_token');
    localStorage.removeItem('chefhub_user');
    setCurrentUser(null);
    if (currentPath.startsWith('/chef')) {
      navigate('/chef/login');
    } else if (currentPath.startsWith('/rider')) {
      navigate('/rider/login');
    } else if (currentPath.startsWith('/admin')) {
      navigate('/admin/login');
    } else {
      navigate('/');
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
          {/* Redirect /portals directly to Customer Site */}
          <Route
            path="/portals"
            element={<Navigate to="/" replace />}
          />

          {/* Customer Marketplace */}
          <Route
            path="/"
            element={<CustomerSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />}
          />

          {/* Customer Auth Page - dedicated isolated login/register */}
          <Route
            path="/customer/login"
            element={<CustomerAuthPage onLogin={handleLoginSuccess} />}
          />

          {/* Chef Auth Page - dedicated isolated page */}
          <Route
            path="/chef/login"
            element={<ChefAuthPage onLogin={handleLoginSuccess} />}
          />
          <Route
            path="/chef/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="VENDOR" redirectPath="/chef/login">
                <ChefSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* Rider Auth Page - dedicated isolated page */}
          <Route
            path="/rider/login"
            element={<RiderAuthPage onLogin={handleLoginSuccess} />}
          />
          <Route
            path="/rider/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="RIDER" redirectPath="/rider/login">
                <RiderSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* Admin Control Master Site */}
          <Route
            path="/admin/login"
            element={<AdminSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute user={currentUser} requiredRole="ADMIN" redirectPath="/admin/login">
                <AdminSite user={currentUser} onLogin={handleLoginSuccess} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-slate-100 dark:bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 ChefHub. Handcrafted Gourmet Food & Kitchen Ecosystem.</p>
          <div className="flex items-center gap-4 text-slate-400 font-semibold">
            <span>Verified Independent Chefs</span>
            <span>•</span>
            <span>Direct Escrow Protection</span>
            <span>•</span>
            <span>Real-Time Express Logistics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
