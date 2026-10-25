import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UtensilsCrossed, ShieldAlert, Bike, ChefHat, ShoppingBag, LayoutGrid, LogOut, UserCheck, Sun, Moon, Menu, X, ArrowRightLeft } from 'lucide-react';

export default function Navbar({ currentUser, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (path) => location.pathname === path;
  const isCustomerPage = location.pathname === '/' || location.pathname === '/customer/login';

  const handleLogoutClick = () => {
    onLogout();
  };

  // Auto-logout when switching to other portals
  const handleSwitchPortal = (targetRole, targetLoginPath, targetDashboardPath) => {
    setGuestPortalsOpen(false);
    setMobileMenuOpen(false);

    if (currentUser) {
      if (currentUser.role === targetRole) {
        navigate(targetDashboardPath);
        return;
      }
      // Logged in as different role: auto log out and redirect to target portal
      onLogout(targetLoginPath);
      return;
    }

    navigate(targetLoginPath);
  };

  // Helper to format role title
  const getRoleBadge = (role) => {
    switch (role) {
      case 'CUSTOMER':
        return { label: 'Customer Marketplace', icon: ShoppingBag, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'VENDOR':
        return { label: 'Chef Kitchen Console', icon: ChefHat, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'RIDER':
        return { label: 'Rider Delivery Hub', icon: Bike, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'ADMIN':
        return { label: 'Master Admin Control', icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      default:
        return { label: 'ChefHub Platform', icon: ShoppingBag, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = roleInfo?.icon;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const [guestPortalsOpen, setGuestPortalsOpen] = useState(false);
  const guestPortalsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (guestPortalsRef.current && !guestPortalsRef.current.contains(e.target)) {
        setGuestPortalsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-6 py-2.5 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

        {/* Top Left: Logo & Brand + Dynamic Role Badge */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">Chef<span className="text-orange-500">Hub</span></span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">Artisanal Cloud Kitchens & Marketplace</p>
            </div>
          </Link>

          {/* Dynamic Active Role Badge (Only shown when not on customer marketplace) */}
          {currentUser && roleInfo && !isCustomerPage && (
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-sm ml-2 ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.label}</span>
            </div>
          )}

          {/* Dynamic Customer Mode Indicator when Chef, Rider, or Admin is on Customer Site */}
          {currentUser && currentUser.role !== 'CUSTOMER' && isCustomerPage && (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500/20 via-amber-500/25 to-orange-500/20 border border-orange-500/40 text-orange-600 dark:text-orange-400 text-[11px] sm:text-xs font-black shadow-sm">
                <span>🛒</span>
                <span>Customer Mode</span>
              </div>
              <button
                onClick={() => {
                  if (currentUser.role === 'VENDOR') navigate('/chef/dashboard');
                  else if (currentUser.role === 'RIDER') navigate('/rider/dashboard');
                  else if (currentUser.role === 'ADMIN') navigate('/admin/dashboard');
                }}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white text-[11px] font-black shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={`Return to your ${currentUser.role} dashboard`}
              >
                <span>➔ Return to {currentUser.role === 'VENDOR' ? 'Chef Kitchen' : currentUser.role === 'RIDER' ? 'Rider Hub' : 'Admin Console'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white/90 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-white/10 text-amber-500 hover:text-amber-600 dark:text-amber-400 font-bold text-xs transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Quick Return to Customer Marketplace when outside customer site (Chef, Rider, Admin site) */}
          {!isCustomerPage && (
            <button
              onClick={() => handleSwitchPortal('CUSTOMER', '/', '/')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-orange-500/25 ring-1 ring-orange-300/40 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Return to Customer Marketplace"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 shrink-0" />
              <span className="whitespace-nowrap">Customer Marketplace</span>
              <span className="hidden sm:inline-block text-[9px] bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded-full font-black uppercase">Store</span>
            </button>
          )}

          {/* Consolidated Profile Dropdown Menu */}
          {currentUser ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(v => !v)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm transition-all cursor-pointer group"
                title="Account Settings & Roles"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider leading-none">
                    {currentUser.role}
                  </span>
                </div>
                <span className={`text-[11px] text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Profile Dropdown Content - Compact as per user request */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in">
                  {/* Clean Profile Header */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Profile</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">{currentUser.name}</p>
                    {currentUser.email && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                    )}
                  </div>

                  {/* Profile Settings & Security & Credentials */}
                  <div className="py-0.5">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('chefhub:open-security'));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-orange-500/10 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🔑</span>
                      <span>Security & Credentials</span>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogoutClick();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/customer/login"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-orange-500/25 ring-1 ring-orange-300/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}

          {/* Role Portals Dropdown (Available for all roles & visitors) */}
          <div className="relative" ref={guestPortalsRef}>
            <button
              onClick={() => setGuestPortalsOpen(v => !v)}
              aria-expanded={guestPortalsOpen}
              aria-haspopup="true"
              className="flex transform items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/70 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/60 sm:px-3 sm:py-2 cursor-pointer"
              title="Access Role Portals"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">Portals</span>
              <span className={`text-[9px] text-slate-400 transition-transform ${guestPortalsOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {guestPortalsOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in">
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Access Role Portals
                </span>

                {/* Customer Marketplace Option */}
                <button
                  onClick={() => handleSwitchPortal('CUSTOMER', '/', '/')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isCustomerPage
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-500/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                    <span>Customer Marketplace</span>
                  </span>
                  {isCustomerPage ? (
                    <span className="text-[9px] font-bold text-amber-500">Active</span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-500">Go To</span>
                  )}
                </button>

                <button
                  onClick={() => handleSwitchPortal('VENDOR', '/chef/login', '/chef/dashboard')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    location.pathname.startsWith('/chef')
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ChefHat className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Chef Kitchen Site</span>
                  </span>
                  {location.pathname.startsWith('/chef') && (
                    <span className="text-[9px] font-bold text-emerald-500">Active</span>
                  )}
                </button>

                <button
                  onClick={() => handleSwitchPortal('RIDER', '/rider/login', '/rider/dashboard')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    location.pathname.startsWith('/rider')
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bike className="w-3.5 h-3.5 text-sky-500" />
                    <span>Rider Hub Site</span>
                  </span>
                  {location.pathname.startsWith('/rider') && (
                    <span className="text-[9px] font-bold text-sky-500">Active</span>
                  )}
                </button>

                <button
                  onClick={() => handleSwitchPortal('ADMIN', '/admin/login', '/admin/dashboard')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Admin Control Site</span>
                  </span>
                  {location.pathname.startsWith('/admin') && (
                    <span className="text-[9px] font-bold text-rose-500">Active</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button (< 768px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-orange-500" /> : <Menu className="w-4 h-4" />}
          </button>

        </div>

      </div>

      {/* Mobile Navigation Drawer (< 768px) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {/* Quick Return to Customer Marketplace for mobile when outside customer site */}
          {!isCustomerPage && (
            <button
              onClick={() => handleSwitchPortal('CUSTOMER', '/', '/')}
              className="w-full py-3 px-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-md flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-950" />
                <span>Return to Customer Marketplace</span>
              </span>
              <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full uppercase font-black">Open ➔</span>
            </button>
          )}

          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 font-bold flex items-center justify-center text-xs">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h5>
                    <span className="text-[10px] text-orange-500 font-bold uppercase">{currentUser.role} Account</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogoutClick();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs border border-rose-500/20 cursor-pointer"
                >
                  Logout
                </button>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('chefhub:open-security'));
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs flex items-center gap-2 cursor-pointer"
              >
                <span>🔑</span>
                <span>Security & Credentials</span>
              </button>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block px-2">Access Role Portals</span>
                <button
                  onClick={() => handleSwitchPortal('CUSTOMER', '/', '/')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-left cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span>Customer Marketplace</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('VENDOR', '/chef/login', '/chef/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <ChefHat className="w-4 h-4 text-emerald-500" />
                  <span>Chef Kitchen Console</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('RIDER', '/rider/login', '/rider/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <Bike className="w-4 h-4 text-sky-500" />
                  <span>Rider Delivery Hub</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('ADMIN', '/admin/login', '/admin/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Admin Site Console</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/customer/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs shadow-md"
              >
                <UserCheck className="w-4 h-4" />
                <span>Customer Login / Sign Up</span>
              </Link>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block px-2">Access Role Portals</span>
                <button
                  onClick={() => handleSwitchPortal('CUSTOMER', '/', '/')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-left cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  <span>Customer Marketplace</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('VENDOR', '/chef/login', '/chef/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <ChefHat className="w-4 h-4 text-emerald-500" />
                  <span>Chef Kitchen Site</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('RIDER', '/rider/login', '/rider/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <Bike className="w-4 h-4 text-sky-500" />
                  <span>Rider Hub Site</span>
                </button>
                <button
                  onClick={() => handleSwitchPortal('ADMIN', '/admin/login', '/admin/dashboard')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Admin Control Site</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
