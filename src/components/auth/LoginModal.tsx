import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, LogIn, Mail, Loader2, ArrowRight } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginOpen, closeLogin, login, openOnboarding } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await login(trimmedEmail);
      // login() automatically closes modal and displays welcome toast on success
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
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

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Email Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4" noValidate>
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
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-all shadow-subtle ${
                      emailError
                        ? 'border-rose-400 ring-2 ring-rose-400/20 focus:border-rose-500'
                        : 'border-warm-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
                    }`}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                {emailError && (
                  <p className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1.5 animate-fade-in">
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !emailInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold shadow-subtle transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
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
            <div className="pt-4 border-t border-warm-200 text-center">
              <p className="text-xs text-charcoal-600">
                Don't have an Expenso account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    closeLogin();
                    openOnboarding();
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
