import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Check, AlertCircle, RefreshCw, Eye, EyeOff, Hash, KeyRound } from 'lucide-react';

export default function SecurityCredentialsModal({ user, onClose, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState('PASSWORD'); // 'PASSWORD' | 'EMAIL' | 'USERNAME'

  // Tab 1: Password Change State
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Tab 2: Email MFA State
  const [emailStep, setEmailStep] = useState(1);
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [emailNewInput, setEmailNewInput] = useState('');
  const [emailDevOtp, setEmailDevOtp] = useState('');
  const [emailMaskedTarget, setEmailMaskedTarget] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Tab 3: Username State
  const [newUsername, setNewUsername] = useState(user?.name || '');
  const [userVerifyPwd, setUserVerifyPwd] = useState('');
  const [showUserVerifyPwd, setShowUserVerifyPwd] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Token helper
  const getToken = () => localStorage.getItem('chefhub_token');

  // Password Strength Evaluation
  const evalStrength = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pwd)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, isAcceptable: score >= 4 && checks.length };
  };

  const pwdScore = evalStrength(pwdNew);

  // 1. Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdNew !== pwdConfirm) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (!pwdScore.isAcceptable) {
      setPwdError('New password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          current_password: pwdCurrent,
          new_password: pwdNew,
          confirm_new_password: pwdConfirm
        })
      });
      const data = await res.json();
      setPwdLoading(false);
      if (data.success) {
        setPwdSuccess('✓ Password updated successfully! Please use your new password next time you log in.');
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      } else {
        setPwdError(data.message || 'Failed to update password.');
      }
    } catch {
      setPwdLoading(false);
      setPwdError('Network error connecting to security gateway.');
    }
  };

  // 2. Request Email MFA OTP
  const handleRequestEmailOtp = async () => {
    setEmailError('');
    setEmailSuccess('');
    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/profile/request-email-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await res.json();
      setEmailLoading(false);
      if (data.success) {
        setEmailStep(2);
        setEmailMaskedTarget(data.target_masked || 'your registered contact');
        setEmailDevOtp(data.dev_otp || '123456');
        setEmailSuccess(`✓ Verification code sent to ${data.target_masked}`);
      } else {
        setEmailError(data.message || 'Failed to request email verification OTP.');
      }
    } catch {
      setEmailLoading(false);
      setEmailError('Network error dispatching OTP.');
    }
  };

  // 2b. Verify Email OTP & Save
  const handleVerifyEmailAndUpdate = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (!emailNewInput || !emailNewInput.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (!emailOtpInput.trim()) {
      setEmailError('Please enter the verification code.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/profile/verify-email-otp-and-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          otp: emailOtpInput.trim(),
          new_email: emailNewInput.trim().toLowerCase()
        })
      });
      const data = await res.json();
      setEmailLoading(false);
      if (data.success) {
        setEmailSuccess('✓ Email address updated successfully!');
        const updatedUser = { ...user, email: data.new_email };
        if (onUserUpdated) onUserUpdated(updatedUser);
        setTimeout(() => {
          setEmailStep(1);
          setEmailOtpInput('');
          setEmailNewInput('');
        }, 1500);
      } else {
        setEmailError(data.message || 'Failed to update email address.');
      }
    } catch {
      setEmailLoading(false);
      setEmailError('Network error verifying OTP.');
    }
  };

  // 3. Submit Username Change
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    const cleanName = newUsername.trim();
    if (cleanName.length < 3) {
      setUserError('Username must be at least 3 characters.');
      return;
    }
    if (!userVerifyPwd) {
      setUserError('Current password is required to verify your identity.');
      return;
    }

    setUserLoading(true);
    try {
      const res = await fetch('/api/auth/profile/update-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          new_username: cleanName,
          current_password: userVerifyPwd
        })
      });
      const data = await res.json();
      setUserLoading(false);
      if (data.success) {
        setUserSuccess('✓ Username updated successfully!');
        setUserVerifyPwd('');
        const updatedUser = { ...user, name: data.new_username };
        if (onUserUpdated) onUserUpdated(updatedUser);
      } else {
        setUserError(data.message || 'Failed to update username.');
      }
    } catch {
      setUserLoading(false);
      setUserError('Network error updating username.');
    }
  };

  return (
    <div className="fixed inset-0 z-[99] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-lg w-full space-y-4 shadow-2xl relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg shadow-inner">
              <KeyRound className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">Security & Credentials Center</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage account identity, password & verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Snapshot Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shrink-0 shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black truncate text-slate-900 dark:text-white">{user?.name}</p>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 shrink-0">
                  {user?.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Permanent Customer / Account ID */}
          <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-right shrink-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
              {user?.role === 'CUSTOMER' ? 'Customer ID' : user?.role === 'VENDOR' ? 'Chef ID' : user?.role === 'RIDER' ? 'Rider ID' : 'Admin ID'}
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
              #{user?.user_id}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('PASSWORD')}
            className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PASSWORD'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EMAIL')}
            className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'EMAIL'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('USERNAME')}
            className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'USERNAME'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Username</span>
          </button>
        </div>

        {/* TAB 1: PASSWORD */}
        {activeTab === 'PASSWORD' && (
          <form onSubmit={handleChangePassword} className="space-y-3.5 pt-1">
            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}
            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwdCurrent ? 'text' : 'password'}
                  required
                  value={pwdCurrent}
                  onChange={e => setPwdCurrent(e.target.value)}
                  placeholder="Enter current password to verify"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwdCurrent(!showPwdCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPwdCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwdNew ? 'text' : 'password'}
                  required
                  value={pwdNew}
                  onChange={e => setPwdNew(e.target.value)}
                  placeholder="At least 8 chars with upper, lower, numbers & symbols"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwdNew(!showPwdNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPwdNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {pwdNew && (
                <div className="mt-2 space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pwdScore.score >= 4 ? 'bg-emerald-500' : pwdScore.score >= 2 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${(pwdScore.score / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={pwdScore.isAcceptable ? 'text-emerald-500 font-bold' : 'text-slate-500'}>
                      {pwdScore.isAcceptable ? '✓ Strong Password' : 'Requires numbers, uppercase & symbols'}
                    </span>
                    <span className="text-slate-400 font-mono">{pwdScore.score}/5 checks</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={pwdConfirm}
                onChange={e => setPwdConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {pwdLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{pwdLoading ? 'Verifying & Saving Password…' : 'Update Password'}</span>
            </button>
          </form>
        )}

        {/* TAB 2: EMAIL */}
        {activeTab === 'EMAIL' && (
          <div className="space-y-3.5 pt-1">
            {emailError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}
            {emailSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Registered Email</span>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{user?.email || 'N/A'}</p>
            </div>

            {emailStep === 1 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  To protect your account identity, updating your primary email address requires multi-factor identity verification.
                </p>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs">
                  <span className="font-bold block">🛡️ Multi-Factor Verification:</span>
                  <span>A 6-digit confirmation code will be dispatched to your linked contact details.</span>
                </div>
                <button
                  type="button"
                  disabled={emailLoading}
                  onClick={handleRequestEmailOtp}
                  className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>{emailLoading ? 'Dispatching Verification Code…' : 'Send Verification OTP'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyEmailAndUpdate} className="space-y-3">
                {emailDevOtp && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex justify-between items-center font-mono">
                    <span>⚡ Demo OTP Code:</span>
                    <span className="font-black text-sm tracking-widest">{emailDevOtp}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    Enter 6-Digit Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={emailOtpInput}
                    onChange={e => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold tracking-widest outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                    New Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={emailNewInput}
                    onChange={e => setEmailNewInput(e.target.value)}
                    placeholder="new.email@chefhub.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{emailLoading ? 'Verifying & Saving…' : 'Verify & Save Email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailStep(1)}
                    className="px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: USERNAME */}
        {activeTab === 'USERNAME' && (
          <form onSubmit={handleUpdateUsername} className="space-y-3.5 pt-1">
            {userError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}
            {userSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{userSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                Account ID / Customer ID
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                <Hash className="w-4 h-4 text-orange-500" />
                <span>Permanent Database ID #{user?.user_id} (Can be used for login)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                Username / Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Enter new username or full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-1">
                Verify Identity with Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showUserVerifyPwd ? 'text' : 'password'}
                  required
                  value={userVerifyPwd}
                  onChange={e => setUserVerifyPwd(e.target.value)}
                  placeholder="Enter current password to authorize changes"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowUserVerifyPwd(!showUserVerifyPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showUserVerifyPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={userLoading}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {userLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{userLoading ? 'Verifying & Updating…' : 'Save New Username'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
