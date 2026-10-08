import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Check, X, AlertCircle, ShoppingBag, ArrowLeft,
  User, Lock, Mail, Phone
} from 'lucide-react';

function evalPwd(pwd) {
  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pwd)
  };
  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { label: 'Too Weak', bar: 'bg-rose-500', text: 'text-rose-500' },
    { label: 'Weak', bar: 'bg-rose-400', text: 'text-rose-400' },
    { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-500' },
    { label: 'Good', bar: 'bg-emerald-500', text: 'text-emerald-500' },
    { label: 'Strong', bar: 'bg-teal-500', text: 'text-teal-500' },
    { label: 'Maximum Security', bar: 'bg-teal-400', text: 'text-teal-400' }
  ];
  return { checks, score, ...levels[score], isAcceptable: score >= 4 };
}

function PasswordInput({ value, onChange, placeholder, id, show, onToggle }) {
  return (
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition"
        required
      />
      <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SocialButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all shadow-sm hover:shadow-md"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function CustomerAuthPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');

  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pwd = evalPwd(regPwd);
  const pwdBarWidth = `${(pwd.score / 5) * 100}%`;
  const clearFeedback = () => { setError(''); setSuccess(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginId.trim(), username: loginId.trim(), password: loginPwd })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        if (data.user.role !== 'CUSTOMER') {
          setError('This is not a customer account. Use the correct portal.');
          return;
        }
        localStorage.setItem('chefhub_token', data.token);
        localStorage.setItem('chefhub_user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
        navigate('/');
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setLoading(false);
      setError('Unable to reach ChefHub servers. Check your connection.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearFeedback();
    if (!pwd.isAcceptable) {
      setError('Password must be rated "Good" or higher to create an account.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), password: regPwd, role: 'CUSTOMER', phone: regPhone.trim() || null, primary_address: null })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setSuccess('Account created! Signing you in…');
        setTimeout(() => {
          localStorage.setItem('chefhub_token', data.token);
          localStorage.setItem('chefhub_user', JSON.stringify(data.user));
          onLogin(data.user, data.token);
          navigate('/');
        }, 900);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch {
      setLoading(false);
      setError('Backend error during registration.');
    }
  };

  const handleSocial = (provider) => {
    setSuccess(`${provider} OAuth would redirect in production. Loading demo credentials…`);
    setTimeout(() => { setLoginId('alex.customer@gmail.com'); setLoginPwd('customer123'); setMode('login'); setSuccess(''); }, 1800);
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)]">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full bg-orange-900/25 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <span className="text-4xl">🍽️</span>
            <div>
              <h1 className="text-white font-black text-3xl leading-none">ChefHub</h1>
              <p className="text-white/70 text-sm font-semibold mt-0.5">Customer Marketplace</p>
            </div>
          </div>
          <h2 className="font-display text-5xl text-white leading-tight mb-5">
            Home-Cooked<br /><em>Perfection</em>,<br />Delivered.
          </h2>
          <p className="text-white/80 text-base leading-relaxed max-w-sm">
            Discover local ghost kitchens, order from verified independent chefs, and track your meal in real time.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[['🏠','Ghost Kitchen Delivery'],['⭐','Top-Rated Chefs'],['🗺️','Live GPS Tracking'],['🎟️','Coupon Codes']].map(([icon,text]) => (
            <div key={text} className="flex items-center gap-3 text-white/90"><span className="text-xl">{icon}</span><span className="font-bold text-sm">{text}</span></div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md mb-5">
          <button onClick={() => navigate('/portals')} className="flex items-center gap-1.5 text-slate-500 hover:text-orange-500 text-sm font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Portals
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400" />
          <div className="p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">{mode === 'login' ? 'Welcome Back!' : 'Join ChefHub'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Customer Portal</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-extrabold uppercase border border-orange-500/20">Customer</span>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {['login','register'].map(m => (
                <button key={m} type="button" onClick={() => { setMode(m); clearFeedback(); }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all capitalize ${mode===m ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
            {success && <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold"><Check className="w-4 h-4 shrink-0 mt-0.5" /><span>{success}</span></div>}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Username or Email</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input id="cust-login-id" type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="Username or email address"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <PasswordInput id="cust-login-pwd" value={loginPwd} onChange={setLoginPwd} placeholder="Your password" show={showLoginPwd} onToggle={() => setShowLoginPwd(v => !v)} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In to ChefHub'}
                </button>
                <button type="button" onClick={() => { setLoginId('alex.customer@gmail.com'); setLoginPwd('customer123'); }}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  ⚡ Autofill Demo Credentials
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="cust-reg-name" type="text" value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Your full name" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="cust-reg-email" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="your@email.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Phone (optional)</label>
                  <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="cust-reg-phone" type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition" /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <PasswordInput id="cust-reg-pwd" value={regPwd} onChange={setRegPwd} placeholder="Create a strong password" show={showRegPwd} onToggle={() => setShowRegPwd(v=>!v)} />
                  {regPwd.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pwd.bar}`} style={{ width: pwdBarWidth }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-extrabold ${pwd.text}`}>{pwd.label}</span>
                        {pwd.isAcceptable ? <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" />Accepted</span> : <span className="text-[11px] font-bold text-rose-500">Cannot create account yet</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {[['length','8+ characters'],['upper','Uppercase'],['lower','Lowercase'],['number','Number'],['special','Special char']].map(([k,l]) => (
                          <div key={k} className={`flex items-center gap-1 text-[11px] font-bold ${pwd.checks[k] ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {pwd.checks[k] ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15 text-blue-500 dark:text-blue-400 text-[11px] font-semibold">
                  📍 Delivery address can be added from your Profile page after signing up.
                </div>
                <button type="submit" disabled={loading || !pwd.isAcceptable}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Creating account…' : 'Create Customer Account'}
                </button>
              </form>
            )}

            <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" /><span className="text-xs text-slate-400 font-bold">or continue with</span><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" /></div>
            <div className="flex gap-3">
              <SocialButton icon="🌐" label="Google" onClick={() => handleSocial('Google')} />
              <SocialButton icon="🍎" label="Apple" onClick={() => handleSocial('Apple')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
