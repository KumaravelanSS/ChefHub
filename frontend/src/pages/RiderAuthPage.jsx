import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X, AlertCircle, Bike, ArrowLeft, User, Lock, Mail, Phone, Truck } from 'lucide-react';

function evalPwd(pwd) {
  const checks = { length: pwd.length >= 8, upper: /[A-Z]/.test(pwd), lower: /[a-z]/.test(pwd), number: /[0-9]/.test(pwd), special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pwd) };
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
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" required />
      <button type="button" onClick={onToggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SocialButton({ icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all shadow-sm">
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

export default function RiderAuthPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');

  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVehicle, setRegVehicle] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pwd = evalPwd(regPwd);
  const clearFeedback = () => { setError(''); setSuccess(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginId.trim(), username: loginId.trim(), password: loginPwd }) });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        if (data.user.role !== 'RIDER') { setError('This is not a rider account. Please use the correct portal.'); return; }
        localStorage.setItem('chefhub_token', data.token);
        localStorage.setItem('chefhub_user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
        navigate('/rider/dashboard');
      } else {
        setError(data.message || 'Invalid credentials.');
      }
    } catch { setLoading(false); setError('Cannot reach ChefHub servers.'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearFeedback();
    if (!pwd.isAcceptable) { setError('Password must be at least "Good" to register.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), password: regPwd, role: 'RIDER', phone: regPhone.trim() || null, vehicle_type: regVehicle.trim() || null, primary_address: null }) });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setSuccess('Fleet account created! Loading your console…');
        setTimeout(() => { localStorage.setItem('chefhub_token', data.token); localStorage.setItem('chefhub_user', JSON.stringify(data.user)); onLogin(data.user, data.token); navigate('/rider/dashboard'); }, 900);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch { setLoading(false); setError('Backend error during registration.'); }
  };

  const handleSocial = (provider) => {
    setSuccess(`${provider} OAuth would redirect in production. Loading demo credentials…`);
    setTimeout(() => { setLoginId('david.rider@chefhub.com'); setLoginPwd('rider123'); setMode('login'); setSuccess(''); }, 1800);
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)]">
      {/* Left hero - blue sky rider theme */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-700">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[480px] h-[480px] rounded-full bg-blue-900/25 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <span className="text-4xl">🛵</span>
            <div>
              <h1 className="text-white font-black text-3xl leading-none">ChefHub</h1>
              <p className="text-white/70 text-sm font-semibold mt-0.5">Rider Fleet Console</p>
            </div>
          </div>
          <h2 className="font-display text-5xl text-white leading-tight mb-5">
            On the Road,<br /><em>Earning</em> Every<br />Kilometre.
          </h2>
          <p className="text-white/80 text-base leading-relaxed max-w-sm">
            Pick up delivery jobs, update your shift status, and track your instant earnings with ChefHub's fleet console.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[['📍','Live GPS Job Queue'],['💼','Shift On / Off Toggle'],['💸','Instant Payout Ledger (10%)'],['🔒','Privacy-First Design']].map(([icon,text]) => (
            <div key={text} className="flex items-center gap-3 text-white/90"><span className="text-xl">{icon}</span><span className="font-bold text-sm">{text}</span></div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md mb-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-slate-500 hover:text-sky-500 text-sm font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Customer Marketplace
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600" />
          <div className="p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-500/15 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">{mode === 'login' ? 'Rider Sign In' : 'Join the Fleet'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Express Courier Fleet</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-extrabold uppercase border border-sky-500/20">Rider</span>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {['login','register'].map(m => (
                <button key={m} type="button" onClick={() => { setMode(m); clearFeedback(); }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all ${mode===m ? 'bg-sky-600 text-white shadow-md shadow-sky-500/25' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                  {m === 'login' ? 'Sign In' : 'Join Fleet'}
                </button>
              ))}
            </div>

            {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
            {success && <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold"><Check className="w-4 h-4 shrink-0 mt-0.5" /><span>{success}</span></div>}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Username or Email</label>
                  <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="rider-login-id" type="text" value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="Rider username or email" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <PasswordInput id="rider-login-pwd" value={loginPwd} onChange={setLoginPwd} placeholder="Your password" show={showLoginPwd} onToggle={() => setShowLoginPwd(v=>!v)} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-sky-500/20 transition-all disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Enter Rider Console'}
                </button>
                <button type="button" onClick={() => { setLoginId('david.rider@chefhub.com'); setLoginPwd('rider123'); }}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  ⚡ Autofill Demo Rider Credentials
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="rider-reg-name" type="text" value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Your full name" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Vehicle Type</label>
                  <div className="relative"><Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="rider-reg-vehicle" type="text" value={regVehicle} onChange={e=>setRegVehicle(e.target.value)} placeholder="e.g. Electric Scooter, Bike" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="rider-reg-email" type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="your@email.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                  <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="rider-reg-phone" type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder:text-slate-400 transition" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <PasswordInput id="rider-reg-pwd" value={regPwd} onChange={setRegPwd} placeholder="Create a strong password" show={showRegPwd} onToggle={() => setShowRegPwd(v=>!v)} />
                  {regPwd.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pwd.bar}`} style={{ width: `${(pwd.score/5)*100}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-extrabold ${pwd.text}`}>{pwd.label}</span>
                        {pwd.isAcceptable ? <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" />Accepted</span> : <span className="text-[11px] font-bold text-rose-500">Too weak</span>}
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
                <div className="p-2.5 rounded-xl bg-sky-500/8 border border-sky-500/15 text-sky-600 dark:text-sky-400 text-[11px] font-semibold">
                  🔒 Your contact info is never shared with customers directly for your privacy and safety.
                </div>
                <button type="submit" disabled={loading || !pwd.isAcceptable}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-extrabold text-sm shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Joining fleet…' : 'Join the Rider Fleet'}
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
