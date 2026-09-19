import React, { useState, useEffect } from 'react';
import { Bike, MapPin, CheckCircle2, DollarSign, Navigation, Power, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RiderSite({ user, onLogin }) {
  const [loginEmail, setLoginEmail] = useState('david.rider@chefhub.com');
  const [loginPassword, setLoginPassword] = useState('rider123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState({ total_earned: '0.00', payouts: [] });
  const [shiftStatus, setShiftStatus] = useState('ONLINE');
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 });

  useEffect(() => {
    if (user && user.role === 'RIDER') {
      fetchJobs();
      fetchEarnings();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/rider/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setJobs(data.jobs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/rider/earnings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setEarnings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
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

  const acceptJob = async (order_id) => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/rider/orders/${order_id}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchJobs();
    } catch (err) {
      alert('Failed to accept job.');
    }
  };

  const completeDelivery = async (order_id) => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch(`/api/rider/orders/${order_id}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        fetchEarnings();
      }
    } catch (err) {
      alert('Failed to complete delivery.');
    }
  };

  const updateGpsLocation = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const nextLat = (coords.lat + (Math.random() * 0.002 - 0.001)).toFixed(4);
      const nextLng = (coords.lng + (Math.random() * 0.002 - 0.001)).toFixed(4);
      setCoords({ lat: Number(nextLat), lng: Number(nextLng) });

      await fetch('/api/rider/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ lat: nextLat, lng: nextLng, shift_status: shiftStatus })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Dedicated Login View
  if (!user || user.role !== 'RIDER') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
              <Bike className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Rider Fleet Console Site</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Log in to accept delivery jobs & track payouts</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rider Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-sky-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-sky-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all"
            >
              Sign In to Rider Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged-in Rider Console View
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase">
              Driver Logistics Console
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{user.name}</h1>
        </div>

        {/* Shift Toggle & GPS Simulator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShiftStatus(shiftStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
              shiftStatus === 'ONLINE'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Shift: {shiftStatus}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Delivery Jobs Queue */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Available Delivery Jobs Queue</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{jobs.length} jobs</span>
          </h2>

          {jobs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-12 glass-card rounded-2xl">No available delivery jobs at this time.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.order_id} className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-base">Order #{job.order_id}</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Pickup from: <strong className="text-slate-900 dark:text-white font-bold">{job.vendor_name}</strong></p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold">
                      Payout: ${(Number(job.total_amount) * 0.10).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-300 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Customer: <strong className="text-slate-900 dark:text-slate-200 font-bold">{job.customer_name}</strong></span>
                    <span className="text-slate-600 dark:text-slate-400">Total Order: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">${Number(job.total_amount).toFixed(2)}</strong></span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 dark:border-slate-800">
                    {job.status === 'READY' && (
                      <button
                        onClick={() => acceptJob(job.order_id)}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all"
                      >
                        Accept Job & Pick Up Meal
                      </button>
                    )}

                    {job.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => completeDelivery(job.order_id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Delivered & Disburse Escrow Payout
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Live GPS Coordinates Simulator & Earnings */}
        <div className="space-y-6">
          
          {/* Live GPS Coordinates Widget */}
          <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-3">
              <Navigation className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>MongoDB GPS Coordinates</span>
            </h3>

            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-slate-900 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Latitude:</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">{coords.lat}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Longitude:</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">{coords.lng}</span>
              </div>
            </div>

            <button
              onClick={updateGpsLocation}
              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all border border-slate-300 dark:border-slate-700"
            >
              Simulate Rider GPS Movement
            </button>
          </div>

          {/* Rider Earnings Summary */}
          <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Rider Payouts (10% Share)</h3>
              <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">${earnings.total_earned}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {earnings.payouts?.map((p) => (
                <div key={p.payout_id} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Order #{p.order_id}</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{p.payout_status}</p>
                  </div>
                  <span className="font-extrabold text-sky-600 dark:text-sky-400">${Number(p.rider_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
