import React, { useState } from 'react';
import { X, Eye, EyeOff, ShieldCheck, ShieldAlert, Check, AlertCircle, Sparkles, User, Mail, Phone, Lock, MapPin, ChefHat, Bike, ShoppingBag, RefreshCw } from 'lucide-react';
import { GoogleAuthIcon, AppleAuthIcon } from './PaymentIcons';

export default function AuthModal({
  isOpen = true,
  onClose = () => {},
  initialRole = 'CUSTOMER',
  onSuccess = () => {},
  isFloating = false // If true, renders as modal dialog; if false, renders as dedicated page card
}) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [role, setRole] = useState(initialRole); // 'CUSTOMER' | 'VENDOR' | 'RIDER'

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('Flat 402, Prestige Oasis, Koramangala 5th Block, Bengaluru');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password Complexity Evaluation
  const evaluatePassword = (pwd) => {
    const checks = {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
    };

    let score = 0;
    if (checks.minLength) score++;
    if (checks.hasUpper) score++;
    if (checks.hasLower) score++;
    if (checks.hasNumber) score++;
    if (checks.hasSpecial) score++;

    let label = 'Weak';
    let color = 'bg-rose-500';
    let textColor = 'text-rose-500';

    if (score <= 1) {
      label = 'Bad / Insecure';
      color = 'bg-rose-500';
      textColor = 'text-rose-500';
    } else if (score <= 3) {
      label = 'Average / Fair';
      color = 'bg-amber-500';
      textColor = 'text-amber-500';
    } else if (score === 4) {
      label = 'Good';
      color = 'bg-emerald-500';
      textColor = 'text-emerald-500';
    } else if (score === 5) {
      label = 'Strong / Maximum Protection';
      color = 'bg-teal-400';
      textColor = 'text-teal-400';
    }

    return {
      checks,
      score,
      label,
      color,
      textColor,
      isAcceptable: score >= 4 && checks.minLength
    };
  };

  const pwdEvaluation = evaluatePassword(regPassword);

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginIdentifier.trim(),
          username: loginIdentifier.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        onSuccess(data.user, data.token);
        onClose();
      } else {
        setErrorMessage(data.message || 'Login credentials invalid.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Failed to connect to ChefHub backend server.');
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!pwdEvaluation.isAcceptable) {
      setErrorMessage('Password must be rated at least "Good" (8+ characters, uppercase, lowercase, numbers, symbols) before creating an account.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role,
          phone: regPhone.trim() || null,
          primary_address: regAddress.trim() || '124 Gourmet Boulevard, Bengaluru'
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMessage('Account created successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(data.user, data.token);
          onClose();
        }, 800);
      } else {
        setErrorMessage(data.message || 'Registration failed.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Backend error during registration.');
    }
  };

  // Real Social Authentication Handler
  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setErrorMessage('');
    try {
      let email = 'alex.customer@gmail.com';
      let name = 'Alex Customer';
      if (role === 'VENDOR') {
        email = 'chef.mario@chefhub.com';
        name = 'Chef Mario';
      } else if (role === 'RIDER') {
        email = 'david.rider@chefhub.com';
        name = 'David Rider';
      }
      if (provider === 'apple') {
        email = `${role.toLowerCase()}.id@privaterelay.appleid.com`;
        name = `${name} (Apple ID)`;
      }

      const res = await fetch('/api/auth/social-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          email,
          name,
          role: role || 'CUSTOMER'
        })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        onSuccess(data.user, data.token);
        onClose();
      } else {
        setErrorMessage(data.message || 'Social authentication failed.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Failed to connect to authentication gateway.');
    }
  };

  const content = (
    <div className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
      {/* Visual Header matching Reference Image 2: Soft Mint/Cyan Gradient with Abstract Flow */}
      <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-teal-400/25 via-emerald-400/20 to-sky-400/15 dark:from-teal-950/60 dark:via-emerald-950/40 dark:to-slate-900 border-b border-teal-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center font-black shadow-sm">
              {role === 'CUSTOMER' ? <ShoppingBag className="w-5 h-5" /> : role === 'VENDOR' ? <ChefHat className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {role === 'CUSTOMER' ? 'Customer Portal' : role === 'VENDOR' ? 'Cloud Kitchen & Chef Portal' : 'Express Courier Fleet'}
              </p>
            </div>
          </div>

          {isFloating && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/70 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Portal Role Selector Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setRole('CUSTOMER')}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              role === 'CUSTOMER'
                ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('VENDOR')}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              role === 'VENDOR'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Chef</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('RIDER')}
            className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              role === 'RIDER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Rider</span>
          </button>
        </div>
      </div>

      {/* Body Card */}
      <div className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE 1: LOGIN */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mobile Number, Email or Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. alex.customer@gmail.com or Alex"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Please contact support@chefhub.com or utilize the designated portal password recovery options.')}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-sm tracking-wide shadow-xl shadow-teal-500/25 transition-all transform active:scale-95 uppercase disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Authenticating…' : `Login as ${role}`}</span>
            </button>

            {/* Toggle to Sign Up */}
            <div className="text-center pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setErrorMessage(''); }}
                className="text-xs font-black text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Sign up Now
              </button>
            </div>

            {/* Divider OR */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* Production Social Logins */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <GoogleAuthIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <AppleAuthIcon className="w-4 h-4 shrink-0 text-slate-900 dark:text-white" />
                <span className="truncate">Apple</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: REGISTER WITH REAL-TIME STRICT PASSWORD SECURITY METER */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name / Kitchen Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. John Doe or Spice Kitchen"
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phone Number (10 digits)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={(e) => {
                    if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="9876543210"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-500" />
                <span>Primary Delivery Address (Saved to Profile)</span>
              </label>
              <input
                type="text"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                placeholder="e.g. Flat 402, Prestige Oasis, Koramangala 5th Block, Bengaluru"
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                required
              />
            </div>

            {/* Password with Real-Time Strength Meter */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Create Strong Password <span className="text-rose-500">*</span>
                </label>
                {regPassword && (
                  <span className={`text-[11px] font-black ${pwdEvaluation.textColor}`}>
                    {pwdEvaluation.label}
                  </span>
                )}
              </div>

              <div className="relative mt-1">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 chars, Aa1@..."
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:border-teal-500 outline-none transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 4-Bar Visual Strength Meter */}
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      pwdEvaluation.score >= step
                        ? pwdEvaluation.color
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              {/* Dynamic Rule Checklist */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                <div className={`flex items-center gap-1.5 ${pwdEvaluation.checks.minLength ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                  {pwdEvaluation.checks.minLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[8px]">•</div>}
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdEvaluation.checks.hasUpper && pwdEvaluation.checks.hasLower ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                  {pwdEvaluation.checks.hasUpper && pwdEvaluation.checks.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[8px]">•</div>}
                  <span>Uppercase & lowercase letters (A-Z, a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdEvaluation.checks.hasNumber ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                  {pwdEvaluation.checks.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[8px]">•</div>}
                  <span>At least one number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${pwdEvaluation.checks.hasSpecial ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                  {pwdEvaluation.checks.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[8px]">•</div>}
                  <span>At least one special symbol (!@#$%^&*...)</span>
                </div>
              </div>
            </div>

            {/* Strict Block: Disabled until password strength is at least Good (score >= 4) */}
            <button
              type="submit"
              disabled={!pwdEvaluation.isAcceptable || loading}
              className={`w-full py-3 rounded-xl text-white font-black text-xs tracking-wide shadow-xl transition-all uppercase ${
                pwdEvaluation.isAcceptable && !loading
                  ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-700 shadow-teal-500/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed opacity-75'
              }`}
            >
              {loading
                ? 'Creating Account...'
                : pwdEvaluation.isAcceptable
                ? `Create ${role} Account`
                : '🔒 Password Must Reach "Good" Rating'}
            </button>

            <div className="text-center pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMessage(''); }}
                className="text-xs font-black text-teal-600 dark:text-teal-400 hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (isFloating) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
        {content}
      </div>
    );
  }

  return content;
}
