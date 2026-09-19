import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, DollarSign, Activity, Lock, Database, AlertCircle, Ban, CheckCircle2, KeyRound, UserPlus, Trash2, Eye, EyeOff, Edit3, X, Utensils, Package, Tag, AlertTriangle } from 'lucide-react';

export default function AdminSite({ user, onLogin }) {
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('users');
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminDishes, setAdminDishes] = useState([]);
  const [showPasswordsMap, setShowPasswordsMap] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);
  const [adminPayouts, setAdminPayouts] = useState([]);

  // Create User Form
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', phone: '' });
  const [userMsg, setUserMsg] = useState('');

  // Edit User Form Modal State
  const [editingUser, setEditingUser] = useState(null);

  // Edit Dish & Out of Stock Reason Modal State
  const [editingAdminDish, setEditingAdminDish] = useState(null);
  const [adminDishForm, setAdminDishForm] = useState({
    dish_id: '',
    name: '',
    vendor_name: '',
    daily_stock: 0,
    is_available: true,
    out_of_stock_reason: ''
  });

  // Admin Change Credentials Form
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminUpdateMsg, setAdminUpdateMsg] = useState('');

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    const token = localStorage.getItem('chefhub_token');
    const headers = { Authorization: `Bearer ${token}` };

    if (activeTab === 'metrics') {
      const res = await fetch('/api/admin/metrics', { headers });
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
    } else if (activeTab === 'users') {
      const res = await fetch('/api/admin/users', { headers });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } else if (activeTab === 'dishes') {
      const res = await fetch('/api/admin/dishes', { headers });
      const data = await res.json();
      if (data.success) setAdminDishes(data.dishes);
    } else if (activeTab === 'payouts') {
      const res = await fetch('/api/admin/payouts', { headers });
      const data = await res.json();
      if (data.success) setAdminPayouts(data.payouts);
    } else if (activeTab === 'reviews') {
      const res = await fetch('/api/admin/reviews', { headers });
      const data = await res.json();
      if (data.success) setAdminReviews(data.reviews);
    } else if (activeTab === 'audits') {
      const res = await fetch('/api/admin/audit-logs', { headers });
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user, data.token);
      } else {
        setLoginError(data.message);
      }
    } catch (err) {
      setLoginError('Connection error. Is backend server running?');
    }
  };

  // Create User CRUD
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg('');
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.success) {
        setUserMsg('✅ ' + data.message);
        setNewUser({ name: '', email: '', password: '', role: 'CUSTOMER', phone: '' });
        fetchData();
      } else {
        setUserMsg('❌ ' + data.message);
      }
    } catch (err) {
      setUserMsg('❌ Failed to connect to server.');
    }
  };

  // Edit User CRUD Submit
  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/admin/users/${editingUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          password: editingUser.password,
          role: editingUser.role,
          phone: editingUser.phone,
          status: editingUser.status
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update user.');
    }
  };

  // Delete User CRUD
  const handleDeleteUser = async (user_id) => {
    if (!confirm(`Are you sure you want to permanently delete User #${user_id}?`)) return;
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/admin/users/${user_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const toggleUserStatus = async (user_id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/admin/users/${user_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  // Admin Edit Dish Stock & Out-of-Stock Reason Handlers
  const openEditAdminDishModal = (dish) => {
    setEditingAdminDish(dish);
    setAdminDishForm({
      dish_id: dish.dish_id,
      name: dish.name || '',
      vendor_name: dish.vendor_name || 'Chef',
      daily_stock: dish.daily_stock !== undefined ? dish.daily_stock : 0,
      is_available: dish.is_available !== 0 && dish.is_available !== false,
      out_of_stock_reason: dish.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)'
    });
  };

  const handleSaveAdminDish = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/admin/dishes/${adminDishForm.dish_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          daily_stock: Number(adminDishForm.daily_stock),
          is_available: adminDishForm.is_available,
          out_of_stock_reason: adminDishForm.out_of_stock_reason
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingAdminDish(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Failed to update dish stock & out of stock reason.');
    }
  };

  const handleUpdateAdminCredentials = async (e) => {
    e.preventDefault();
    setAdminUpdateMsg('');
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/auth/admin/update-credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          new_username: newAdminUsername,
          new_password: newAdminPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUpdateMsg('✅ ' + data.message);
        setNewAdminUsername('');
        setNewAdminPassword('');
      } else {
        setAdminUpdateMsg('❌ ' + data.message);
      }
    } catch (err) {
      setAdminUpdateMsg('❌ Failed to connect to server.');
    }
  };

    // Dedicated Login View
    if (!user || user.role !== 'ADMIN') {
      return (
        <div className="max-w-md mx-auto py-12 px-4">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Master Console Site</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Master access over all 12 schemas & user CRUD</p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Admin Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-rose-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Admin Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-rose-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all"
              >
                Sign In to Master Admin Site
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Logged-in Master Admin Console View
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase">
                Single Master Admin
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Platform Master Console</h1>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-bold shadow-inner">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'users' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              Global Users Table CRUD ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('dishes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'dishes' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Dishes Stock & Out of Stock Reasons GUI ({adminDishes.length})
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'payouts' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Escrow Payout Ledger ({adminPayouts.length})
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'reviews' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Ratings & Reviews ({adminReviews.length})
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'metrics' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Analytics Metrics
            </button>

            <button
              onClick={() => setActiveTab('audits')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'audits' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              MongoDB Audits
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Change Admin Credentials
            </button>
          </div>
        </div>

        {/* Tab: Global Users Table CRUD */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global User Accounts Table (MySQL `users`)</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Full Admin CRUD & User Account Ban/Delete Controls</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">User ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Password</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                    {users.map((u) => {
                      const isPassVisible = showPasswordsMap[u.user_id];
                      const displayPassword = u.plain_password || (u.role === 'ADMIN' ? 'admin' : u.role === 'VENDOR' ? 'vendor123' : u.role === 'RIDER' ? 'rider123' : 'customer123');
                      return (
                        <tr key={u.user_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40">
                          <td className="p-3 font-mono text-slate-500">#{u.user_id}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">{u.email}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                                {isPassVisible ? displayPassword : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPasswordsMap(prev => ({ ...prev, [u.user_id]: !prev[u.user_id] }))}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                title={isPassVisible ? "Hide password" : "Show password"}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{u.phone || 'N/A'}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                                u.role === 'VENDOR' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                  u.role === 'RIDER' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' :
                                    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            {u.status === 'BANNED' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                                BANNED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {u.role !== 'ADMIN' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingUser({ ...u, password: u.plain_password || '' })}
                                  className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
                                  title="Edit user account details"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => toggleUserStatus(u.user_id, u.status)}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${u.status === 'ACTIVE'
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    }`}
                                >
                                  {u.status === 'ACTIVE' ? 'Ban' : 'Unban'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.user_id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px] transition-all flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add User Form Modal */}
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>+ Create User Account (Admin CRUD)</span>
              </h3>

              {userMsg && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold">
                  {userMsg}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Assign Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="VENDOR">Vendor (Chef)</option>
                      <option value="RIDER">Rider (Driver)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+1555-0999"
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold transition-all shadow-lg shadow-rose-500/20"
                >
                  + Create User Account
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Dish Stock & Out of Stock Reasons GUI */}
        {activeTab === 'dishes' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  <span>Dish Inventory & Out of Stock Reason Maintenance</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Master control over daily stock portion counts, availability, and customer-facing out-of-stock reasons.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                {adminDishes.length} Total Dishes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 rounded-l-xl">Dish ID</th>
                    <th className="p-3">Dish Name</th>
                    <th className="p-3">Chef / Vendor</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Portions Left</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Current Out-of-Stock Reason</th>
                    <th className="p-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                  {adminDishes.map((d) => {
                    const isOut = d.is_available === 0 || d.daily_stock <= 0;
                    return (
                      <tr key={d.dish_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono text-slate-500">#{d.dish_id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <img src={d.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                          <span>{d.name}</span>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">{d.vendor_name || 'Chef'}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${Number(d.base_price).toFixed(2)}</td>
                        <td className="p-3 font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded-lg border ${d.daily_stock > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
                            {d.daily_stock} left
                          </span>
                        </td>
                        <td className="p-3">
                          {isOut ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                              OUT OF STOCK
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                              IN STOCK
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs">
                          {isOut ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-[11px] font-medium border border-rose-500/20 truncate max-w-[260px]" title={d.out_of_stock_reason}>
                              ⚠️ {d.out_of_stock_reason || 'Daily portions fully exhausted (0 remaining)'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-sans">N/A (Item Available)</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditAdminDishModal(d)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[11px] transition-all flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Stock & Reason
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: System Analytics Metrics */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-8">

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Gross Gross Revenue</span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">${Number(metrics.orders_summary?.gross_revenue || 0).toFixed(2)}</h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">100% Escrow Secured</span>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Platform Commission (5%)</span>
                <h3 className="text-2xl font-extrabold text-rose-500 dark:text-rose-400">${Number(metrics.financials?.total_platform_commission || 0).toFixed(2)}</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Net Platform Income</span>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Total System Orders</span>
                <h3 className="text-2xl font-extrabold text-amber-500 dark:text-amber-400">{metrics.orders_summary?.total_orders || 0}</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Across All Vendors</span>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Customer Sentiment Score</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.sentiment_summary?.positive || 0} Positive</h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">MongoDB Review Log</span>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">Cross-Schema Recent Orders Audit</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Total Amount</th>
                      <th className="p-3">Escrow Status</th>
                      <th className="p-3 rounded-r-xl">Order Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                    {metrics.recent_orders?.map((o) => (
                      <tr key={o.order_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-slate-500">#{o.order_id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{o.customer_name}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{o.vendor_name}</td>
                        <td className="p-3 font-extrabold text-orange-600 dark:text-orange-400">${Number(o.total_amount).toFixed(2)}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{o.escrow_status}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab: Escrow Payout Ledger */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">🔒 Escrow Revenue & Payout Ledger</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated Split: 85% Vendor Net • 10% Rider Delivery • 5% Platform Admin Commission</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                  Real-time Escrow Sync
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 rounded-l-xl">Payout ID</th>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Vendor (85%)</th>
                      <th className="p-3">Rider (10%)</th>
                      <th className="p-3">Platform Comm. (5%)</th>
                      <th className="p-3">Gross Total</th>
                      <th className="p-3 rounded-r-xl">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 dark:divide-slate-800/60">
                    {adminPayouts.map((p) => (
                      <tr key={p.payout_id} className="hover:bg-slate-100 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-slate-500">#{p.payout_id}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">#{p.order_id}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{p.customer_name || 'Alex Customer'}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ${Number(p.vendor_amount).toFixed(2)}
                          <span className="block text-[10px] text-slate-400 font-normal">{p.vendor_name}</span>
                        </td>
                        <td className="p-3 font-bold text-sky-600 dark:text-sky-400">
                          ${Number(p.rider_amount).toFixed(2)}
                          <span className="block text-[10px] text-slate-400 font-normal">{p.rider_name || 'Rider Assigned'}</span>
                        </td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          ${Number(p.platform_commission).toFixed(2)}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                          ${Number(p.total_amount || (Number(p.vendor_amount) + Number(p.rider_amount) + Number(p.platform_commission))).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.payout_status === 'PROCESSED' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                            {p.payout_status || 'SCHEDULED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Customer Ratings & Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">⭐ Customer Ratings & Feedback Audit</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">MongoDB Review Analytics & NLP Sentiment Classification</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                  {adminReviews.length} Verified Reviews
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminReviews.map((r, i) => (
                  <div key={r.review_id || i} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{r.customer_name || 'Customer'}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Order #{r.order_id} • {r.vendor_name || 'Chef'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.sentiment_label === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {r.sentiment_label || 'POSITIVE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-amber-500">
                      <span>Chef: {'⭐'.repeat(r.vendor_rating || 5)}</span>
                      <span>Rider: {'⭐'.repeat(r.rider_rating || 5)}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-200/50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700/50">
                      "{r.comment || 'Great experience!'}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: MongoDB System Audit Logs */}
        {activeTab === 'audits' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-800 pb-3">MongoDB System Audit Logs</h2>
            <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.log_id} className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{log.action_type}</span>
                    <span className="text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <pre className="text-slate-800 dark:text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.details_json, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Change Master Admin Credentials Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 space-y-6">
            <div className="border-b border-slate-300 dark:border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Change Master Admin Credentials</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Update the single Master Admin username and password hash in MySQL</p>
            </div>

            {adminUpdateMsg && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold">
                {adminUpdateMsg}
              </div>
            )}

            <form onSubmit={handleUpdateAdminCredentials} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">New Admin Username</label>
                <input
                  type="text"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="e.g. master_admin"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">New Admin Password</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold transition-all shadow-lg shadow-rose-500/20"
              >
                Update Master Admin Credentials
              </button>
            </form>
          </div>
        )}

        {/* Modal: Edit User Account (Admin CRUD Edit) */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-sky-500" />
                  <span>Edit User Account #{editingUser.user_id}</span>
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Password</label>
                  <input
                    type="text"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Enter new password to change"
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Role</label>
                    <select
                      value={editingUser.role || 'CUSTOMER'}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="VENDOR">Vendor (Chef)</option>
                      <option value="RIDER">Rider (Driver)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Status</label>
                    <select
                      value={editingUser.status || 'ACTIVE'}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                      className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="BANNED">BANNED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold transition-all shadow-lg"
                  >
                    Save User Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Dish Stock & Out-of-Stock Reason GUI */}
        {editingAdminDish && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-6 border border-slate-300 dark:border-slate-800 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-500" />
                  <span>Edit Stock & Out-of-Stock Reason</span>
                </h3>
                <button onClick={() => setEditingAdminDish(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <img src={editingAdminDish.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{adminDishForm.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Chef: {adminDishForm.vendor_name} • Dish #{adminDishForm.dish_id}</p>
                </div>
              </div>

              <form onSubmit={handleSaveAdminDish} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Daily Stock Portions</label>
                    <input
                      type="number"
                      min="0"
                      value={adminDishForm.daily_stock}
                      onChange={(e) => setAdminDishForm({ ...adminDishForm, daily_stock: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Manual Toggle Status</label>
                    <button
                      type="button"
                      onClick={() => setAdminDishForm({ ...adminDishForm, is_available: !adminDishForm.is_available })}
                      className={`w-full py-2.5 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 ${
                        adminDishForm.is_available
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {adminDishForm.is_available ? '✅ IN STOCK' : '🚫 OUT OF STOCK'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Out-of-Stock Reason (Shown on Customer Card)
                  </label>

                  {/* Preset Pills GUI */}
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[
                      'Daily portions fully exhausted (0 remaining)',
                      'Raw ingredient shortage (Required ingredients depleted in stock)',
                      'Kitchen prep closed for today',
                      'Seasonal ingredient unavailable',
                      'Chef maintenance & sanitation day'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdminDishForm({ ...adminDishForm, out_of_stock_reason: preset })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                          adminDishForm.out_of_stock_reason === preset
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-amber-500/50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={adminDishForm.out_of_stock_reason}
                    onChange={(e) => setAdminDishForm({ ...adminDishForm, out_of_stock_reason: e.target.value })}
                    placeholder="Enter custom reason why dish is unavailable..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdminDish(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold transition-all shadow-lg shadow-amber-500/20"
                  >
                    Save Stock & Reason GUI
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

