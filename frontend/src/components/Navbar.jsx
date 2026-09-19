import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UtensilsCrossed, ShieldAlert, Bike, ChefHat, ShoppingBag, LayoutGrid, LogOut, UserCheck, Sun, Moon, Menu, X, ArrowRightLeft } from 'lucide-react';

export default function Navbar({ currentUser, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

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
        return { label: 'ChefHub Platform', icon: LayoutGrid, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = roleInfo?.icon;

  return (
    <header className="sticky top-0 z-50 glass-card border-b px-3 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        
        {/* Top Left: Logo & Brand + Dynamic Role Badge */}
        <div className="flex items-center gap-3">
          <Link to={currentUser ? '/' : '/portals'} className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">Chef<span className="text-orange-500">Hub</span></span>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block">Independent Chef & Ghost Kitchen Platform</p>
            </div>
          </Link>

          {/* Dynamic Active Role Badge (Shown when logged in) */}
          {currentUser && roleInfo && (
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-sm ml-2 ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.label}</span>
            </div>
          )}
        </div>

        {/* Center Navigation Bar: ONLY shown when NOT logged in */}
        {!currentUser ? (
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-200/90 dark:bg-slate-900/90 rounded-xl border border-slate-300 dark:border-slate-800/80 shadow-inner">
            <Link
              to="/portals"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isActive('/portals') 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Launchpad
            </Link>

            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                isActive('/') || isActive('/customer/login') 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Customer Site
            </Link>

            <Link
              to="/chef/login"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                location.pathname.startsWith('/chef') 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Chef Site
            </Link>

            <Link
              to="/rider/login"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                location.pathname.startsWith('/rider') 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Rider Site
            </Link>

            <Link
              to="/admin/login"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                location.pathname.startsWith('/admin') 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black' 
                  : 'text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              Admin Site
            </Link>
          </div>
        ) : (
          /* Switch Portal Quick Link for logged-in users */
          <Link
            to="/portals"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold border border-slate-300 dark:border-slate-800 transition-all"
            title="Switch Portal / View Launchpad"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
            <span>Switch Portal</span>
          </Link>
        )}

        {/* Top Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-amber-500 hover:text-amber-600 dark:text-amber-400 font-bold text-xs transition-all flex items-center justify-center shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* User Session Info */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              {/* Desktop User Info */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[130px]">{currentUser.name}</span>
                <span className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">{currentUser.role}</span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-500 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-800 hover:border-rose-600 transition-all shadow-sm flex items-center gap-1"
                title="Log out of session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/portals"
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-md shadow-orange-500/20 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}

          {/* Mobile Menu Button (< 768px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-orange-500" /> : <Menu className="w-4 h-4" />}
          </button>

        </div>

      </div>

      {/* Mobile Navigation Drawer (< 768px) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800/80 space-y-3">
          {currentUser && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                  {currentUser.name[0]}
                </div>
                <div>
                  <h5 className="text-xs font-extrabold text-white">{currentUser.name}</h5>
                  <span className="text-[10px] text-orange-400 font-bold uppercase">{currentUser.role} Account</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20"
              >
                Logout
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              to="/portals"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800"
            >
              <LayoutGrid className="w-4 h-4 text-orange-400" />
              Portals Launchpad
            </Link>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              Customer Site
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
