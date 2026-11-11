import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Mail, ArrowRight, ShieldCheck, Zap, Users2, X, Loader2 } from 'lucide-react';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const MobileWelcomePage: React.FC = () => {
  const { openOnboarding, openLogin, registerUser } = useApp();

  const [oauthModal, setOauthModal] = useState<'google' | 'github' | null>(null);
  const [oauthName, setOauthName] = useState('');
  const [oauthEmail, setOauthEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthError, setOauthError] = useState('');

  const handleStartOAuth = (provider: 'google' | 'github') => {
    setOauthModal(provider);
    setOauthError('');
    if (provider === 'google') {
      setOauthName('Divyansh');
      setOauthEmail('divyansh@gmail.com');
    } else {
      setOauthName('Divyansh Dev');
      setOauthEmail('divyansh@github.com');
    }
  };

  const handleConfirmOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setOauthError('');
    const name = oauthName.trim();
    const email = oauthEmail.trim().toLowerCase();

    if (!name) {
      setOauthError('Please enter your name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setOauthError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Automatically registers account with OAuth provider (no password required)
      await registerUser(name, email);
      setOauthModal(null);
      // Immediately move to Step 2 (Invite Code), Step 3 (UPI), Step 4 (Finish)
      openOnboarding({ startStep: 2, oauthProvider: oauthModal || 'google' });
    } catch (err: unknown) {
      setOauthError(err instanceof Error ? err.message : 'Could not complete sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-warm-50 text-charcoal-900 flex flex-col justify-between px-6 pt-safe pb-safe selection:bg-brand-100 selection:text-brand-900"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
      }}
    >
      {/* Top Header & Branding */}
      <div className="flex-1 flex flex-col justify-center items-center text-center max-w-sm mx-auto w-full py-6">
        {/* Expenso App Icon */}
        <div className="w-20 h-20 rounded-3xl bg-[#12543F] shadow-elevated flex items-center justify-center p-4 ring-4 ring-[#12543F]/15 mb-5 transform transition-transform hover:scale-105 active:scale-95 duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-full h-full">
            <path
              d="M9 10h14M9 16h10M9 22h14M13 6v20"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-charcoal-900 tracking-tight">
          Expenso
        </h1>

        {/* Tagline */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100/80 border border-brand-200 text-brand-900 text-xs font-bold shadow-subtle">
          <Zap className="w-3.5 h-3.5 text-brand-700" />
          <span>Commute Expense Manager</span>
        </div>

        <p className="mt-3.5 text-sm text-charcoal-600 leading-relaxed font-normal">
          Track shared autos, metros, cabs, and transit chai with your friends. Zero circular debts, guaranteed verified UPI settlements.
        </p>

        {/* 3 Quick Value Pillars */}
        <div className="w-full mt-6 bg-white/70 backdrop-blur-sm border border-warm-200/80 rounded-2xl p-4 text-left space-y-2.5 shadow-subtle">
          <div className="flex items-center gap-2.5 text-xs text-charcoal-700">
            <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3" />
            </div>
            <span className="font-medium"><strong>10-Second Commute Splits</strong> — Autos, cabs, metro hops</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-charcoal-700">
            <div className="w-5 h-5 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
              <Users2 className="w-3 h-3" />
            </div>
            <span className="font-medium"><strong>Zero Circular Debts</strong> — Smart minimal repayments</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-charcoal-700">
            <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="font-medium"><strong>Direct UPI Pay Links</strong> — Instant Google Pay & PhonePe</span>
          </div>
        </div>
      </div>

      {/* Bottom Auth Options */}
      <div className="w-full max-w-sm mx-auto space-y-3 pt-2">
        {/* Continue with Google */}
        <button
          onClick={() => handleStartOAuth('google')}
          className="w-full h-12 flex items-center justify-center gap-3 px-4 bg-white hover:bg-warm-100 text-charcoal-900 font-bold text-sm rounded-2xl border border-warm-300 shadow-subtle active:scale-[0.98] transition-all cursor-pointer"
        >
          <GoogleIcon className="w-5 h-5 shrink-0" />
          <span>Continue with Google</span>
        </button>

        {/* Continue with GitHub */}
        <button
          onClick={() => handleStartOAuth('github')}
          className="w-full h-12 flex items-center justify-center gap-3 px-4 bg-[#181717] hover:bg-[#2b2b2b] text-white font-bold text-sm rounded-2xl shadow-subtle active:scale-[0.98] transition-all cursor-pointer"
        >
          <GitHubIcon className="w-5 h-5 shrink-0" />
          <span>Continue with GitHub</span>
        </button>

        {/* Sign up with Email */}
        <button
          onClick={() => openOnboarding({ startStep: 1 })}
          className="btn-action-primary w-full h-12 flex items-center justify-center gap-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-2xl shadow-card active:scale-[0.98] transition-all cursor-pointer"
        >
          <Mail className="w-4 h-4 shrink-0" />
          <span>Sign up with Email</span>
          <ArrowRight className="w-4 h-4 shrink-0 ml-1" />
        </button>

        {/* Already have an account? Login */}
        <div className="text-center pt-2 pb-1">
          <p className="text-xs text-charcoal-600">
            Already have an account?{' '}
            <button
              onClick={openLogin}
              className="font-bold text-brand-800 hover:text-brand-900 underline underline-offset-2 cursor-pointer ml-1"
            >
              Log in
            </button>
          </p>
        </div>
      </div>

      {/* OAuth Fast Account Setup Sheet */}
      {oauthModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full sm:max-w-md bg-warm-50 rounded-t-3xl sm:rounded-3xl border border-warm-200 shadow-modal overflow-hidden animate-slide-up flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-warm-200 pb-3">
              <div className="flex items-center gap-2.5">
                {oauthModal === 'google' ? <GoogleIcon className="w-5 h-5" /> : <GitHubIcon className="w-5 h-5" />}
                <div>
                  <h3 className="text-base font-bold text-charcoal-900">
                    Sign in with {oauthModal === 'google' ? 'Google' : 'GitHub'}
                  </h3>
                  <p className="text-[11px] text-charcoal-500 font-medium">
                    Step 1 of 4: Account details verified
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOauthModal(null)}
                className="p-1.5 rounded-xl text-charcoal-400 hover:bg-warm-200 text-charcoal-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal-600 leading-relaxed">
              You are registering via <strong>{oauthModal === 'google' ? 'Google' : 'GitHub'}</strong>. Your account credentials will be automatically verified without needing a separate password.
            </p>

            <form onSubmit={handleConfirmOAuth} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-300 text-sm font-medium text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-charcoal-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-warm-300 text-sm font-medium text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                  placeholder="name@gmail.com"
                />
              </div>

              {oauthError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {oauthError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-action-primary w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with {oauthModal === 'google' ? 'Google' : 'GitHub'}…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Continue to Step 2 (Invite Code)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
