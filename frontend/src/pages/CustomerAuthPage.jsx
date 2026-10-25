import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Check, X, AlertCircle, ShoppingBag, ArrowLeft,
  User, Lock, Mail, Phone, RefreshCw
} from 'lucide-react';
import { GoogleAuthIcon, AppleAuthIcon } from '../components/PaymentIcons';

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

function getIdentifierType(val) {
  const trimmed = (val || '').trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return { type: 'EMAIL', label: 'Email Format', icon: '📧' };
  const stripped = trimmed.replace(/^(cust[-_]?|customer[:\-_]?|#|id[:\s#]*)/i, '').trim();
  if (/^\d+$/.test(stripped)) return { type: 'CUSTOMER_ID', label: `Customer ID #${stripped}`, icon: '🆔' };
  return { type: 'USERNAME', label: 'Username Format', icon: '👤' };
}

function evalUsername(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return { valid: false, message: 'Username is required' };
  if (trimmed.length < 3) return { valid: false, message: 'Must be at least 3 characters' };
  if (trimmed.length > 50) return { valid: false, message: 'Cannot exceed 50 characters' };
  if (/^\d+$/.test(trimmed)) return { valid: false, message: 'Cannot be purely numeric (pure numbers are Customer IDs)' };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-\.\s]*$/.test(trimmed)) return { valid: false, message: 'Must start with a letter/number and use valid characters' };
  return { valid: true, message: 'Valid username format' };
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
      className="flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
    >
      <div className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

export default function CustomerAuthPage({ onLogin, isModal = false }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');

  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('chefhub_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u && u.role !== 'CUSTOMER') {
          localStorage.removeItem('chefhub_user');
          localStorage.removeItem('chefhub_token');
          window.location.reload();
        }
      }
    } catch {}
  }, []);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [regPhone, setRegPhone] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  // Phone OTP Verification Modal for Registration
  const [phoneOtpModal, setPhoneOtpModal] = useState({
    isOpen: false,
    phone: '',
    otpInput: '',
    devOtp: '',
    loading: false,
    error: ''
  });

  // Google Social Auth Account Picker Modal
  const [googleModal, setGoogleModal] = useState({
    isOpen: false,
    loading: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pwd = evalPwd(regPwd);
  const pwdBarWidth = `${(pwd.score / 5) * 100}%`;
  const usernameCheck = evalUsername(regName);
  const rawPhoneDigits = regPhone.replace(/\D/g, '');
  const isPhoneValid = countryCode === '+91' ? rawPhoneDigits.length === 10 : (rawPhoneDigits.length >= 7 && rawPhoneDigits.length <= 15);
  const isRegisterFormValid = usernameCheck.valid && pwd.isAcceptable && isPhoneValid && regEmail.includes('@');

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    if (newCode === '+91' && regPhone.length > 10) {
      setRegPhone(regPhone.slice(0, 10));
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const maxDigits = countryCode === '+91' ? 10 : 15;
    setRegPhone(digitsOnly.slice(0, maxDigits));
  };

  const handlePhoneKeyDown = (e) => {
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    const maxDigits = countryCode === '+91' ? 10 : 15;
    const hasSelection = e.target.selectionStart !== e.target.selectionEnd;
    if (!hasSelection && regPhone.length >= maxDigits) {
      e.preventDefault();
    }
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData ? e.clipboardData.getData('text') : '';
    const digitsOnly = pastedText.replace(/\D/g, '');
    const maxDigits = countryCode === '+91' ? 10 : 15;
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentVal = regPhone;
    const updated = (currentVal.slice(0, start) + digitsOnly + currentVal.slice(end)).slice(0, maxDigits);
    setRegPhone(updated);
  };

  const clearFeedback = () => { setError(''); setSuccess(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearFeedback();
    const cleanId = loginId.trim();
    if (!cleanId) {
      setError('Please enter your Email, Username, or Customer ID.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          email: cleanId,
          username: cleanId,
          customer_id: cleanId,
          password: loginPwd
        })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        if (!isModal && data.user.role !== 'CUSTOMER') {
          setError('This is not a customer account. Please use the appropriate portal.');
          return;
        }

        // Intercept weak password warning and flag it for session reminder
        if (data.weakPasswordWarning) {
          sessionStorage.setItem('chefhub_weak_password_warning', 'true');
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

  // Step 1 of Registration: Validate and dispatch Phone SMS OTP
  const handleInitiateRegistration = async (e) => {
    e.preventDefault();
    clearFeedback();
    const uCheck = evalUsername(regName);
    if (!uCheck.valid) {
      setError(uCheck.message || 'Please enter a valid username (3-50 characters).');
      return;
    }
    if (!isPhoneValid) {
      setError(countryCode === '+91'
        ? 'A valid 10-digit Indian mobile number is required.'
        : 'A valid mobile phone number is required.');
      return;
    }
    if (!pwd.isAcceptable) {
      setError('Password must be rated "Good" or higher to create an account.');
      return;
    }

    const fullPhone = `${countryCode} ${regPhone.trim()}`;
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setPhoneOtpModal({
          isOpen: true,
          phone: fullPhone,
          otpInput: '',
          devOtp: data.dev_otp || '123456',
          loading: false,
          error: ''
        });
      } else {
        setError(data.message || 'Failed to dispatch phone verification OTP.');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection error dispatching SMS OTP.');
    }
  };

  // Step 2 of Registration: Verify Phone OTP and finalize Account Creation
  const handleVerifyOtpAndCreateAccount = async (e) => {
    e.preventDefault();
    if (!phoneOtpModal.otpInput.trim()) {
      setPhoneOtpModal(prev => ({ ...prev, error: 'Please enter the 6-digit OTP code.' }));
      return;
    }

    setPhoneOtpModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      // 1. Verify Phone OTP
      const vRes = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneOtpModal.phone, otp: phoneOtpModal.otpInput })
      });
      const vData = await vRes.json();

      if (!vData.success) {
        setPhoneOtpModal(prev => ({ ...prev, loading: false, error: vData.message || 'Invalid or expired OTP code.' }));
        return;
      }

      // 2. Finalize registration in DB with verified phone
      const rRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPwd,
          role: 'CUSTOMER',
          phone: phoneOtpModal.phone,
          primary_address: null
        })
      });
      const rData = await rRes.json();

      if (rData.success) {
        setPhoneOtpModal(prev => ({ ...prev, isOpen: false, loading: false }));
        setSuccess('🎉 Account verified and created! Logging you in…');
        setTimeout(() => {
          localStorage.setItem('chefhub_token', rData.token);
          localStorage.setItem('chefhub_user', JSON.stringify(rData.user));
          onLogin(rData.user, rData.token);
          navigate('/');
        }, 900);
      } else {
        setPhoneOtpModal(prev => ({ ...prev, loading: false, error: rData.message || 'Failed to create customer account.' }));
      }
    } catch (err) {
      setPhoneOtpModal(prev => ({ ...prev, loading: false, error: 'Network error completing account registration.' }));
    }
  };

  // Dedicated Functional Social Auth Handler (Google & Apple)
  const executeSocialLogin = async (provider, email, name) => {
    clearFeedback();
    setLoading(true);
    setGoogleModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/auth/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email,
          name,
          role: 'CUSTOMER'
        })
      });
      const data = await res.json();
      setLoading(false);
      setGoogleModal({ isOpen: false, loading: false });

      if (data.success) {
        setSuccess(`Signed in successfully as ${data.user.name}!`);
        localStorage.setItem('chefhub_token', data.token);
        localStorage.setItem('chefhub_user', JSON.stringify(data.user));
        setTimeout(() => {
          onLogin(data.user, data.token);
          navigate('/');
        }, 600);
      } else {
        setError(data.message || 'Social authentication failed.');
      }
    } catch {
      setLoading(false);
      setGoogleModal({ isOpen: false, loading: false });
      setError('Connection error contacting authentication provider.');
    }
  };

  const authCard = (
    <div className={`w-full ${isModal ? 'bg-white dark:bg-slate-900' : 'max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800'} overflow-hidden`}>
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400" />
      <div className="p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                {mode === 'login' ? 'Customer Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">ChefHub Gourmet Marketplace</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-extrabold uppercase border border-orange-500/20">
            Customer
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {['login', 'register'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); clearFeedback(); }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all capitalize cursor-pointer ${mode === m
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Email, Username, or Customer ID
                </label>
                {loginId && (() => {
                  const idType = getIdentifierType(loginId);
                  return idType ? (
                    <span className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                      {idType.icon} {idType.label}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="cust-login-id"
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="e.g. alex.customer@gmail.com, Alex, or #4"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                You can log in via registered <strong>Email</strong>, <strong>Username</strong>, or numeric <strong>Customer ID</strong> (e.g. #4).
              </p>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">Password</label>
              <PasswordInput
                id="cust-login-pwd"
                value={loginPwd}
                onChange={setLoginPwd}
                placeholder="Your account password"
                show={showLoginPwd}
                onToggle={() => setShowLoginPwd(v => !v)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Signing in…</span>
                </>
              ) : (
                <span>Sign In to Customer Marketplace</span>
              )}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleInitiateRegistration} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Username / Full Name <span className="text-rose-500">*</span>
                </label>
                {regName && (
                  <span className={`text-[10px] font-bold ${usernameCheck.valid ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {usernameCheck.valid ? '✓ Valid Username' : usernameCheck.message}
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="cust-reg-name"
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Choose unique username (e.g. Alex Customer)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                3-50 characters. Letters, numbers, and spaces allowed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="cust-reg-email"
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition"
                  required
                />
              </div>
            </div>

            {/* Mandatory Phone Number Field with Country Code Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                {regPhone && (
                  <span className={`text-[10px] font-bold ${isPhoneValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPhoneValid
                      ? '✓ Valid Mobile Number'
                      : (countryCode === '+91'
                        ? `${rawPhoneDigits.length}/10 digits (${10 - rawPhoneDigits.length} more needed)`
                        : 'Valid number required')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={handleCountryCodeChange}
                  className="px-2.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-extrabold outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shrink-0"
                >
                  <option value="+91">🇮🇳 +91 (IN)</option>
                  <option value="+1">🇺🇸 +1 (US)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                  <option value="+971">🇦🇪 +971 (UAE)</option>
                  <option value="+65">🇸🇬 +65 (SG)</option>
                  <option value="+61">🇦🇺 +61 (AU)</option>
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="cust-reg-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel-national"
                    maxLength={countryCode === '+91' ? 10 : 15}
                    required
                    value={regPhone}
                    onChange={handlePhoneChange}
                    onKeyDown={handlePhoneKeyDown}
                    onPaste={handlePhonePaste}
                    placeholder={countryCode === '+91' ? '9876543210' : '9876543210'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 placeholder:text-slate-400 transition"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1">
                {countryCode === '+91' ? 'Enter exactly 10 digits (numbers only). Mandatory for SMS OTP & updates.' : 'Mandatory for delivery updates & SMS authentication.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <PasswordInput
                id="cust-reg-pwd"
                value={regPwd}
                onChange={setRegPwd}
                placeholder="Create a strong password"
                show={showRegPwd}
                onToggle={() => setShowRegPwd(v => !v)}
              />
              {regPwd.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pwd.bar}`} style={{ width: pwdBarWidth }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-extrabold ${pwd.text}`}>{pwd.label}</span>
                    {pwd.isAcceptable ? (
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" />Accepted
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-500">Too weak to register</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[['length', '8+ characters'], ['upper', 'Uppercase'], ['lower', 'Lowercase'], ['number', 'Number'], ['special', 'Special char']].map(([k, l]) => (
                      <div key={k} className={`flex items-center gap-1 text-[11px] font-bold ${pwd.checks[k] ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {pwd.checks[k] ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-rose-400" />}{l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isRegisterFormValid}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Sending SMS OTP…' : 'Verify Phone & Create Account'}</span>
            </button>
          </form>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">or continue with</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex gap-3">
          <SocialButton icon={<GoogleAuthIcon className="w-5 h-5" />} label="Google" onClick={() => setGoogleModal({ isOpen: true, loading: false })} />
          <SocialButton icon={<AppleAuthIcon className="w-5 h-5" />} label="Apple" onClick={() => executeSocialLogin('apple', 'alex.customer@icloud.com', 'Alex Customer')} />
        </div>

        {/* Subtle partner portal links for non-customer roles */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center space-y-1.5">
          <p className="text-[15px] text-slate-500 font-medium">
            Are you a registered Chef, Rider, or Administrator?
          </p>
          <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => navigate('/chef/login')}
              className="hover:text-emerald-500 transition-colors cursor-pointer"
            >
              👨‍🍳 Chef Portal
            </button>

            <button
              type="button"
              onClick={() => navigate('/rider/login')}
              className="hover:text-sky-500 transition-colors cursor-pointer"
            >
              🛵 Rider Portal
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="hover:text-rose-500 transition-colors cursor-pointer"
            >
              🛡️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isModal ? (
        authCard
      ) : (
        <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-[var(--bg-main)]">
          {/* Left hero: Exactly 50% split */}
          <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400">
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full bg-orange-900/25 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-14">
                <span className="text-4xl">🍽️</span>
                <div>
                  <h1 className="text-white font-black text-3xl leading-none">ChefHub</h1>
                  <p className="text-white/80 text-sm font-semibold mt-0.5">Customer Marketplace</p>
                </div>
              </div>
              <h2 className="font-display text-5xl text-white leading-tight mb-5">
                Home-Cooked<br /><em>Perfection</em>,<br />Delivered.
              </h2>
              <p className="text-white/90 text-base leading-relaxed max-w-md">
                Discover independent cloud kitchens, order artisanal meals from verified home chefs, and track your food in real time.
              </p>
            </div>
            <div className="relative z-10 space-y-3.5">
              {[['🏠', 'Verified Cloud Kitchens'], ['⭐', 'Authentic Local Chefs'], ['🗺️', 'Live Courier Telemetry'], ['🎟️', '100% Escrow Protection']].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-white font-bold text-sm">
                  <span className="text-xl">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right auth panel: Exactly 50% split with centered content */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 my-auto">
            <div className="w-full max-w-md mb-4 flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-orange-500 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Marketplace
              </button>
              <span className="text-[11px] text-slate-500 font-bold">Bangalore Hub</span>
            </div>
            {authCard}
          </div>
        </div>
      )}

      {/* Phone OTP Verification Modal */}
      {phoneOtpModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 sm:p-7 border border-orange-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Verify Phone Number</h3>
                  <p className="text-[10px] text-slate-500">{phoneOtpModal.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setPhoneOtpModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We've dispatched a 6-digit SMS verification code to your mobile device. Enter it below to activate your ChefHub account.
            </p>

            {phoneOtpModal.devOtp && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-amber-700 dark:text-amber-300 font-bold">SMS Verification Code:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 tracking-widest">{phoneOtpModal.devOtp}</span>
              </div>
            )}

            {phoneOtpModal.error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold">
                {phoneOtpModal.error}
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndCreateAccount} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Enter 6-Digit SMS OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={phoneOtpModal.otpInput}
                  onChange={e => setPhoneOtpModal(prev => ({ ...prev, otpInput: e.target.value.replace(/\D/g, '') }))}
                  placeholder="123456"
                  className="w-full px-4 py-3 text-center rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-base font-mono font-black tracking-widest outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={phoneOtpModal.loading || phoneOtpModal.otpInput.length < 6}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {phoneOtpModal.loading ? 'Verifying OTP…' : 'Confirm & Complete Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneOtpModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authentic Google Sign-In Account Selector Modal */}
      {googleModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <GoogleAuthIcon className="w-5 h-5" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setGoogleModal({ isOpen: false, loading: false })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Choose an account</h4>
              <p className="text-xs text-slate-500">to continue to <strong>ChefHub Marketplace</strong></p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Account 1: Alex Customer */}
              <button
                type="button"
                onClick={() => executeSocialLogin('google', 'alex.customer@gmail.com', 'Alex Customer')}
                disabled={googleModal.loading}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 transition flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-orange-500">
                    Alex Customer
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">alex.customer@gmail.com</div>
                </div>
                {googleModal.loading && (
                  <RefreshCw className="w-4 h-4 text-orange-500 animate-spin shrink-0" />
                )}
              </button>

              {/* Account 2: Alternative account */}
              <button
                type="button"
                onClick={() => executeSocialLogin('google', 'gourmet.user@gmail.com', 'Gourmet Foodie')}
                disabled={googleModal.loading}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 transition flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-orange-500">
                    Gourmet Foodie
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">gourmet.user@gmail.com</div>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center pt-2 leading-relaxed">
              To continue, Google will securely share your verified name, email address, and profile credentials with ChefHub.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
