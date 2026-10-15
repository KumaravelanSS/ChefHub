import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UtensilsCrossed, ShieldAlert, Bike, ChefHat, ShoppingBag, LayoutGrid, LogOut, UserCheck, Sun, Moon, Menu, X, ArrowRightLeft } from 'lucide-react';

export default function Navbar({ currentUser, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, title: '', message: '' });

  const isActive = (path) => location.pathname === path;
  const isCustomerPage = location.pathname === '/' || location.pathname === '/customer/login';

  const navTabs = [
    {
      id: '/',
      label: 'Customer Site',
      icon: ShoppingBag,
      path: '/',
      activeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/25 ring-amber-300/40',
      activeText: 'text-slate-950 dark:text-slate-950 font-black'
    },
    {
      id: '/chef/login',
      label: 'Chef Site',
      icon: ChefHat,
      path: '/chef/login',
      activeColor: 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-emerald-500/25 ring-emerald-300/40',
      activeText: 'text-emerald-950 dark:text-emerald-950 font-black'
    },
    {
      id: '/rider/login',
      label: 'Rider Site',
      icon: Bike,
      path: '/rider/login',
      activeColor: 'bg-gradient-to-r from-sky-400 to-blue-500 shadow-sky-500/25 ring-sky-300/40',
      activeText: 'text-sky-950 dark:text-sky-950 font-black'
    },
    {
      id: '/admin/login',
      label: 'Admin Site',
      icon: ShieldAlert,
      path: '/admin/login',
      activeColor: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/25 ring-rose-300/40',
      activeText: 'text-white font-black'
    }
  ];

  const getActiveTabId = () => {
    const p = location.pathname;
    if (p.startsWith('/chef')) return '/chef/login';
    if (p.startsWith('/rider')) return '/rider/login';
    if (p.startsWith('/admin')) return '/admin/login';
    if (p === '/' || p.startsWith('/customer')) return '/';
    return null;
  };

  const getTabPath = (tabId) => {
    if (tabId === '/chef/login') {
      return (currentUser?.role === 'VENDOR') ? '/chef/dashboard' : '/chef/login';
    }
    if (tabId === '/rider/login') {
      return (currentUser?.role === 'RIDER') ? '/rider/dashboard' : '/rider/login';
    }
    if (tabId === '/admin/login') {
      return (currentUser?.role === 'ADMIN') ? '/admin/dashboard' : '/admin/login';
    }
    return '/';
  };

  const activeTabId = getActiveTabId();
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const navRefs = useRef({});

  useEffect(() => {
    if (activeTabId && navRefs.current[activeTabId]) {
      const el = navRefs.current[activeTabId];
      setNavIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1
      });
    } else {
      setNavIndicator(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeTabId, location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (activeTabId && navRefs.current[activeTabId]) {
        const el = navRefs.current[activeTabId];
        setNavIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
          opacity: 1
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTabId]);

  const handleSwitchPortalClick = (e) => {
    e.preventDefault();
    setConfirmModal({
      open: true,
      action: 'SWITCH',
      title: 'Switch Portal?',
      message: 'Are you sure you want to switch portals and return to the Customer Marketplace?'
    });
  };

  const handleLogoutClick = () => {
    setConfirmModal({
      open: true,
      action: 'LOGOUT',
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your current session?'
    });
  };

  const confirmAction = () => {
    const action = confirmModal.action;
    setConfirmModal({ open: false, action: null, title: '', message: '' });
    if (action === 'SWITCH') {
      navigate('/');
    } else if (action === 'LOGOUT') {
      onLogout();
    }
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
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
        </div>

        {/* Center Navigation: HIDDEN for Customer Marketplace & Customer Login to eliminate clutter */}
        {!isCustomerPage ? (
          <div className="relative hidden md:flex items-center gap-1 p-1 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-white/60 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/25">
            {activeTabId && (() => {
              const currentActive = navTabs.find(t => t.id === activeTabId);
              return (
                <div
                  className={`absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none z-0 shadow-md ring-1 backdrop-blur-md ${currentActive?.activeColor || 'bg-orange-500 ring-orange-300/40'}`}
                  style={{
                    transform: `translateX(${navIndicator.left}px)`,
                    width: `${navIndicator.width}px`,
                    opacity: navIndicator.opacity
                  }}
                />
              );
            })()}

            {navTabs.filter(t => t.id !== '/').map((tab) => {
              const Icon = tab.icon;
              const isActiveTab = activeTabId === tab.id;
              const targetPath = getTabPath(tab.id);
              return (
                <Link
                  key={tab.id}
                  to={targetPath}
                  ref={(el) => (navRefs.current[tab.id] = el)}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors duration-200 select-none ${
                    isActiveTab
                      ? tab.activeText
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActiveTab ? tab.activeText : 'opacity-80'}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}

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

              {/* Profile Dropdown Content */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2.5 space-y-2 animate-in fade-in">
                  {/* Account Summary */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 dark:text-white truncate">{currentUser.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{currentUser.email}</p>
                    {currentUser.user_id && (
                      <p className="text-[10px] font-mono font-bold text-slate-500">Customer ID #{currentUser.user_id}</p>
                    )}
                  </div>

                  {/* Profile Settings & Security & Credentials */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('chefhub:open-security'));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-orange-500/10 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🔑</span>
                      <span>Security & Credentials</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                      <span>Marketplace Home</span>
                    </button>
                  </div>

                  {/* Switch Portal / User Role Section */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Switch Role / Portal
                    </span>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate(currentUser?.role === 'VENDOR' ? '/chef/dashboard' : '/chef/login');
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ChefHat className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Chef Kitchen Console</span>
                      </span>
                      {location.pathname.startsWith('/chef') && <span className="text-[10px] font-bold text-emerald-500">Active</span>}
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate(currentUser?.role === 'RIDER' ? '/rider/dashboard' : '/rider/login');
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-500 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Bike className="w-3.5 h-3.5 text-sky-500" />
                        <span>Rider Delivery Hub</span>
                      </span>
                      {location.pathname.startsWith('/rider') && <span className="text-[10px] font-bold text-emerald-500">Active</span>}
                    </button>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate(currentUser?.role === 'ADMIN' ? '/admin/dashboard' : '/admin/login');
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>Admin Site Console</span>
                      </span>
                      {location.pathname.startsWith('/admin') && <span className="text-[10px] font-bold text-emerald-500">Active</span>}
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
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
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-orange-500/25 ring-1 ring-orange-300/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}

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
                className="w-full py-2.5 px-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs flex items-center gap-2"
              >
                <span>🔑</span>
                <span>Security & Credentials</span>
              </button>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block px-2">Switch Portal / Account</span>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>Customer Marketplace</span>
                </Link>
                <Link
                  to={currentUser.role === 'VENDOR' ? '/chef/dashboard' : '/chef/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <ChefHat className="w-4 h-4 text-emerald-500" />
                  <span>Chef Kitchen Console</span>
                </Link>
                <Link
                  to={currentUser.role === 'RIDER' ? '/rider/dashboard' : '/rider/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <Bike className="w-4 h-4 text-sky-500" />
                  <span>Rider Delivery Hub</span>
                </Link>
                <Link
                  to={currentUser.role === 'ADMIN' ? '/admin/dashboard' : '/admin/login'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Admin Site Console</span>
                </Link>
              </div>
            </div>
          ) : (
            <Link
              to="/customer/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-xs shadow-md"
            >
              <UserCheck className="w-4 h-4" />
              <span>Login / Sign Up</span>
            </Link>
          )}
        </div>
      )}

      {/* Switch Portal / Logout Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-300 dark:border-slate-800 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 font-bold flex items-center justify-center mx-auto text-xl border border-orange-500/20">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{confirmModal.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, action: null, title: '', message: '' })}
                className="py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs transition-all shadow-md shadow-orange-500/20"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
