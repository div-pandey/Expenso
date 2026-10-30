import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, LogIn, Users, Check } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginOpen, closeLogin, login, allDemoUsers, currentUser, openOnboarding } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  if (!isLoginOpen) return null;

  const handleDemoUserClick = async (userId: string) => {
    if (loadingUserId) return;
    setLoadingUserId(userId);
    try {
      await login(userId);
      // login() already closes modal via context
    } finally {
      setLoadingUserId(null);
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
    const matchedUser = allDemoUsers.find(
      (u) => u.email.toLowerCase() === trimmedEmail
    );
    if (!matchedUser) {
      setEmailError(
        'No account found with that email. Try one of the demo accounts above.'
      );
      return;
    }
    setLoadingUserId(matchedUser.id);
    try {
      await login(matchedUser.id);
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm"
        onClick={closeLogin}
        aria-label="Close login modal"
      />

      {/* Modal Card */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        <div className="relative w-full sm:max-w-sm pointer-events-auto bg-warm-50 border-t sm:border border-warm-200 rounded-t-3xl sm:rounded-2xl shadow-elevated max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-warm-200 shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-700 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-4 h-4 text-white" />
              </div>
              <h2
                id="login-modal-title"
                className="text-lg font-semibold text-charcoal-900"
              >
                Sign In to Expenso
              </h2>
            </div>
            <button
              onClick={closeLogin}
              className="p-1.5 rounded-lg text-charcoal-500 hover:bg-warm-200 hover:text-charcoal-900 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Demo Users Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Users className="w-4 h-4 text-brand-700" />
                <p className="text-xs font-semibold text-charcoal-600 uppercase tracking-wide">
                  Demo Accounts
                </p>
              </div>

              <div className="space-y-2">
                {allDemoUsers.map((user) => {
                  const isActive = user.id === currentUser.id;
                  const isLoading = loadingUserId === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleDemoUserClick(user.id)}
                      disabled={loadingUserId !== null}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left ${
                        isActive
                          ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700/30'
                          : 'border-warm-200 bg-white hover:border-brand-400 hover:bg-warm-100 active:scale-[0.99]'
                      } ${loadingUserId !== null && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${user.avatarColor}`}
                      >
                        {user.initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal-900 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-charcoal-500 truncate">{user.email}</p>
                      </div>

                      {/* Active indicator or spinner */}
                      <div className="flex-shrink-0">
                        {isLoading ? (
                          <div className="w-5 h-5 rounded-full border-2 border-brand-700 border-t-transparent animate-spin" />
                        ) : isActive ? (
                          <div className="w-5 h-5 rounded-full bg-brand-700 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-warm-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-warm-200" />
              <span className="text-xs text-charcoal-400 font-medium whitespace-nowrap">
                or enter your email
              </span>
              <div className="flex-1 h-px bg-warm-200" />
            </div>

            {/* Email Sign In */}
            <form onSubmit={handleEmailSignIn} className="space-y-2.5" noValidate>
              <div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="you@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-colors ${
                    emailError
                      ? 'border-red-400 ring-1 ring-red-400/30 focus:border-red-500'
                      : 'border-warm-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30'
                  }`}
                  disabled={loadingUserId !== null}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-600">{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loadingUserId !== null || !emailInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </form>

            {/* Switch to Create Account */}
            <div className="pt-2 border-t border-warm-200 text-center">
              <p className="text-xs text-charcoal-600">
                New to Expenso?{' '}
                <button
                  type="button"
                  onClick={() => {
                    closeLogin();
                    openOnboarding();
                  }}
                  className="font-bold text-brand-700 hover:text-brand-800 hover:underline cursor-pointer"
                >
                  Create free account →
                </button>
              </p>
            </div>

            {/* Disclaimer note */}
            <p className="text-center text-xs text-charcoal-400 leading-relaxed pb-1">
              In the live app, this would use email link or OTP login.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginModal;
