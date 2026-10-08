import React, { useState, useEffect } from 'react';
import { Bike, MapPin, CheckCircle2, DollarSign, Navigation, Power, AlertCircle, Eye, EyeOff, Phone } from 'lucide-react';
import RiderAuthPage from './RiderAuthPage';
import LiveDeliveryMap from '../components/LiveDeliveryMap';

export default function RiderSite({ user, onLogin }) {
  const [loginEmail, setLoginEmail] = useState('david.rider@chefhub.com');
  const [loginPassword, setLoginPassword] = useState('rider123');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState({ total_earned: '0.00', payouts: [] });
  const [riderReviews, setRiderReviews] = useState([]);
  const [shiftStatus, setShiftStatus] = useState('ONLINE');
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [activeMapJobId, setActiveMapJobId] = useState(null);

  useEffect(() => {
    if (user && user.role === 'RIDER') {
      fetchJobs();
      fetchEarnings();
      fetchReviews();
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

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('chefhub_token');
      const res = await fetch('/api/rider/reviews', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRiderReviews(data.reviews);
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
    return <RiderAuthPage onLogin={onLogin} />;
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl border text-xs font-black transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm ${
              shiftStatus === 'ONLINE'
                ? 'bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-500/40 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-white/10 hover:border-slate-400'
            }`}
          >
            <Power className={`w-4 h-4 ${shiftStatus === 'ONLINE' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
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
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-12 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-sm">No available delivery jobs at this time.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.order_id} className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/75 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-white/10 space-y-4 shadow-xl shadow-slate-200/30 dark:shadow-none hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-base">Order #{job.order_id}</span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Pickup from: <strong className="text-slate-900 dark:text-white font-bold">{job.vendor_name}</strong></p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold">
                      Payout: ₹{(Number(job.total_amount) * 0.10).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-300 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Customer: <strong className="text-slate-900 dark:text-slate-200 font-bold">{job.customer_name}</strong></span>
                    <span className="text-slate-600 dark:text-slate-400">Total Order: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{Number(job.total_amount).toFixed(2)}</strong></span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 dark:border-slate-800 space-y-2.5">
                    {/* Live Route Simulation Map Toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveMapJobId(activeMapJobId === job.order_id ? null : job.order_id)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-300 dark:border-slate-700 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        <span>{activeMapJobId === job.order_id ? 'Hide Live Navigation Map' : '🗺️ Open Live Delivery Simulation Map'}</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Driver Safety Mode
                      </span>
                    </button>

                    {/* Active Live Delivery Map Section */}
                    {activeMapJobId === job.order_id && (
                      <div className="pt-2 animate-fade-in">
                        <LiveDeliveryMap
                          orderStatus={job.status}
                          chefLocation={{ lat: 12.9784, lng: 77.6408, locality: job.vendor_name || 'Kitchen' }}
                          customerLocation={{ lat: 12.9352, lng: 77.6245, locality: job.delivery_address || 'Customer Location' }}
                          riderName={user.name}
                          customerName={job.customer_name || 'Alex Customer'}
                          customerPhone={job.customer_phone || '+91 98765 43210'}
                          vehicleType="Ather 450X EV Scooter"
                          viewerRole="RIDER"
                          isDarkMode={true}
                        />
                      </div>
                    )}

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
              <span>Live GPS Navigation Coordinates</span>
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
              <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">₹{earnings.total_earned}</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {earnings.payouts?.map((p) => (
                <div key={p.payout_id} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Order #{p.order_id}</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{p.payout_status}</p>
                  </div>
                  <span className="font-extrabold text-sky-600 dark:text-sky-400">₹{Number(p.rider_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rider Customer Ratings & Feedback */}
          <div className="glass-card rounded-2xl p-5 border border-slate-300 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">⭐ Delivery Partner Ratings</h3>
              <span className="text-xs font-bold text-amber-500">{riderReviews.length} Reviews</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              {riderReviews.map((r, i) => (
                <div key={r.review_id || i} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white">{r.customer_name || 'Customer'}</span>
                    <span className="text-amber-500 font-bold">{'⭐'.repeat(r.rider_rating || 5)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-200/50 dark:bg-slate-800/50 p-2 rounded-lg">
                    "{r.comment || 'Prompt delivery!'}"
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
