import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, LogIn, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const LoginModal: React.FC = () => {
  const { isLoginOpen, closeLogin, login, openOnboarding, registerUser } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginOpen) return null;

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setEmailError('');
    try {
      const email = provider === 'google' ? 'divyansh@gmail.com' : 'divyansh@github.com';
      const name = provider === 'google' ? 'Divyansh' : 'Divyansh Dev';
      // Register or login
      await registerUser(name, email);
      closeLogin();
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'OAuth sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (!passwordInput) {
      setEmailError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(trimmedEmail, passwordInput);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No account found with this email.';
      setEmailError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in"
        onClick={closeLogin}
        aria-label="Close login modal"
      />

      {/* Modal Card */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none pt-safe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div className="relative w-full sm:max-w-md pointer-events-auto bg-warm-50 border-t sm:border border-warm-200 rounded-t-3xl sm:rounded-2xl shadow-elevated max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-warm-200 shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center flex-shrink-0 shadow-subtle">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2
                  id="login-modal-title"
                  className="text-lg font-bold text-charcoal-900 leading-tight"
                >
                  Sign In to Expenso
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Access your shared commute blends
                </p>
              </div>
            </div>
            <button
              onClick={closeLogin}
              className="p-2 rounded-xl text-charcoal-400 hover:bg-warm-100 hover:text-charcoal-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Quick OAuth Login Options */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl text-xs font-bold text-charcoal-800 shadow-subtle transition-all cursor-pointer disabled:opacity-50"
              >
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('github')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#181717] hover:bg-[#2b2b2b] text-white rounded-xl text-xs font-bold shadow-subtle transition-all cursor-pointer disabled:opacity-50"
              >
                <GitHubIcon className="w-4 h-4 shrink-0" />
                <span>GitHub</span>
              </button>
            </div>

            <div className="flex items-center gap-2 my-2">
              <div className="h-px bg-warm-200 flex-1" />
              <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">
                or with email
              </span>
              <div className="h-px bg-warm-200 flex-1" />
            </div>

            {/* Email & Password Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-3.5" noValidate>
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="you@example.com"
                    autoFocus
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-all shadow-subtle ${
                      emailError && !emailInput.trim()
                        ? 'border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-500'
                        : 'border-warm-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
                    }`}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm bg-white text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-all shadow-subtle ${
                      emailError && emailInput.trim()
                        ? 'border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-500'
                        : 'border-warm-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
                    }`}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {emailError && (
                <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5 animate-fade-in">
                  <span>{emailError}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !emailInput.trim() || !passwordInput}
                className="btn-action-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold shadow-subtle transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Switch to Create Account */}
            <div className="pt-3 border-t border-warm-200 text-center">
              <p className="text-xs text-charcoal-600">
                Don't have an Expenso account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    closeLogin();
                    openOnboarding({ startStep: 1 });
                  }}
                  className="font-bold text-brand-700 hover:text-brand-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Create free account</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
