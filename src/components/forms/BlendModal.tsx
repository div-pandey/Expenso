import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { isValidInviteCodeFormat } from '../../utils/inviteCodes';
import { X, Copy, Check, Users, Loader2, UserCheck, AlertCircle } from 'lucide-react';

export const BlendModal: React.FC = () => {
  const {
    isBlendModalOpen,
    closeBlendModal,
    currentUser,
    userBlends,
    currentBlend,
    switchBlend,
    createBlend,
    joinBlendWithFriendCode,
    validateInviteCode,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'switch' | 'create' | 'join'>('switch');
  const [blendName, setBlendName] = useState('');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline validation state for the friend code fields
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeStatus, setCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [codeValidName, setCodeValidName] = useState(''); // friend's name or blend's name when valid
  const [isBlendTarget, setIsBlendTarget] = useState(false);

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopied(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCodeStatus = () => {
    setCodeStatus('idle');
    setCodeValidName('');
    setIsBlendTarget(false);
    setError('');
  };

  /** Called on blur or after 6 chars typed — validates the code against backend */
  const checkCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) { resetCodeStatus(); return; }
    if (!isValidInviteCodeFormat(clean)) {
      setCodeStatus('invalid');
      setIsBlendTarget(false);
      setError('Code must be exactly 6 alphanumeric characters.');
      return;
    }
    setCodeValidating(true);
    setCodeStatus('idle');
    setError('');
    const result = await validateInviteCode(clean);
    setCodeValidating(false);
    if (result.valid) {
      setCodeStatus('valid');
      setCodeValidName(result.name || '');
      setIsBlendTarget(Boolean(result.isBlend));
      setError('');
    } else {
      setCodeStatus('invalid');
      setIsBlendTarget(false);
      setError(result.error || 'Invalid invitation code.');
    }
  }, [validateInviteCode]);

  const handleFriendCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setFriendCodeInput(upper);
    resetCodeStatus();
    // Auto-validate once 6 chars entered
    if (upper.trim().length === 6) {
      checkCode(upper);
    }
  };

  const handleJoinCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setJoinCodeInput(upper);
    resetCodeStatus();
    if (upper.trim().length === 6) {
      checkCode(upper);
    }
  };

  const handleCreateBlend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blendName.trim()) {
      setError('Please enter a name for your Blend');
      return;
    }
    const friendCode = friendCodeInput.trim();
    // If a friend code is entered, it must be validated first
    if (friendCode) {
      if (codeStatus !== 'valid') {
        // Run validation now if not done yet
        setCodeValidating(true);
        const result = await validateInviteCode(friendCode);
        setCodeValidating(false);
        if (!result.valid) {
          setCodeStatus('invalid');
          setError(result.error || 'Invalid invitation code. Please check the code or leave it blank.');
          return;
        }
        setCodeStatus('valid');
        setCodeValidName(result.name || '');
      }
    }
    setError('');
    setIsSubmitting(true);
    try {
      await createBlend(blendName.trim(), friendCode || undefined);
      setBlendName('');
      setFriendCodeInput('');
      resetCodeStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create Blend');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a 6-character invitation code');
      return;
    }
    if (codeStatus !== 'valid') {
      setCodeValidating(true);
      const result = await validateInviteCode(clean);
      setCodeValidating(false);
      if (!result.valid) {
        setCodeStatus('invalid');
        setError(result.error || 'Invalid invitation code.');
        return;
      }
      setCodeStatus('valid');
      setCodeValidName(result.name || '');
    }
    setError('');
    setIsSubmitting(true);
    try {
      await joinBlendWithFriendCode(clean);
      setJoinCodeInput('');
      resetCodeStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid invitation code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (tab: 'switch' | 'create' | 'join') => {
    setActiveTab(tab);
    setError('');
    resetCodeStatus();
    setFriendCodeInput('');
    setJoinCodeInput('');
    setBlendName('');
    setIsBlendTarget(false);
  };

  if (!isBlendModalOpen) return null;

  /** Shared code input feedback indicator */
  const CodeFeedback = () => {
    if (codeValidating) {
      return (
        <span className="flex items-center gap-1 text-[11px] text-charcoal-500 mt-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Checking code…
        </span>
      );
    }
    if (codeStatus === 'valid') {
      return (
        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
          <UserCheck className="w-3.5 h-3.5" /> Found {isBlendTarget ? 'Blend' : 'Friend'}: <strong>{codeValidName}</strong> — ready to connect!
        </span>
      );
    }
    if (codeStatus === 'invalid' && error) {
      return (
        <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) closeBlendModal();
      }}
    >
      <div
        className="w-full sm:max-w-md bg-warm-50 border-t sm:border border-warm-200 rounded-t-3xl sm:rounded-2xl shadow-modal max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal-900 leading-none">
                Expenso Blends
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Private groups for tracking shared commutes
              </p>
            </div>
          </div>
          <button
            onClick={closeBlendModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1">
          {/* Your Unique Personal Invitation Code Card */}
          <div className="p-5 pb-3">
          <div className="bg-white border border-brand-200 rounded-xl p-3.5 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 block">
                Your Personal Invitation Code
              </span>
              <span className="text-xl font-mono font-black text-brand-900 tracking-widest mt-0.5 block">
                {currentUser.inviteCode}
              </span>
              <span className="text-[11px] text-charcoal-500 block">
                Share this with friends so they can add you to a Blend
              </span>
            </div>
            <button
              onClick={copyMyCode}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold rounded-lg border border-brand-200 transition-colors shadow-subtle shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-1">
          <div className="flex bg-warm-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => switchTab('switch')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'switch' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              My Blends ({userBlends.length})
            </button>
            <button
              onClick={() => switchTab('create')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'create' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              + Create Blend
            </button>
            <button
              onClick={() => switchTab('join')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'join' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              Connect Friend
            </button>
          </div>
        </div>

        {/* Tab 1: Switch between User's Blends */}
        {activeTab === 'switch' && (
          <div className="p-5 space-y-2.5 max-h-64 overflow-y-auto">
            {userBlends.map(blend => {
              const isActive = currentBlend?.id === blend.id;
              return (
                <div
                  key={blend.id}
                  onClick={() => {
                    switchBlend(blend.id);
                    closeBlendModal();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'border-brand-600 bg-brand-50/80 text-brand-950 font-bold ring-1 ring-brand-600'
                      : 'border-warm-200 bg-white hover:bg-warm-100 text-charcoal-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center text-xs font-bold text-charcoal-700">
                      {blend.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold truncate max-w-[180px]">{blend.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-charcoal-400 font-normal">
                          {blend.memberCount || 1} member{blend.memberCount === 1 ? '' : 's'}
                        </span>
                        {blend.blendCode && (
                          <>
                            <span className="text-charcoal-300 text-[10px]">•</span>
                            <span className="font-mono text-[10px] font-bold bg-warm-100 text-charcoal-700 px-1 rounded border border-warm-200">
                              {blend.blendCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(blend.blendCode || '');
                                showToast(`Copied Blend Code: ${blend.blendCode}`);
                              }}
                              className="p-0.5 hover:bg-warm-200 rounded text-charcoal-500 hover:text-charcoal-800 transition-colors"
                              title="Copy Blend Code"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-[10px] bg-brand-700 text-white font-bold px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Create a New Blend */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateBlend} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Blend Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. North Campus Crew, Morning Metro"
                value={blendName}
                onChange={e => setBlendName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <span className="text-[10px] text-charcoal-400 block mt-1">
                A unique 6-character Blend Code will be generated automatically.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Friend's 6-Char Invite Code <span className="text-charcoal-400 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. RAHUL9"
                  maxLength={6}
                  value={friendCodeInput}
                  onChange={e => handleFriendCodeChange(e.target.value)}
                  onBlur={() => friendCodeInput.trim() && checkCode(friendCodeInput)}
                  className={`w-full px-3 py-2 pr-8 text-xs font-mono tracking-widest bg-white text-charcoal-900 border rounded-xl focus:outline-none focus:ring-2 uppercase transition-all ${
                    codeStatus === 'valid'
                      ? 'border-emerald-500 focus:ring-emerald-400'
                      : codeStatus === 'invalid'
                      ? 'border-rose-400 focus:ring-rose-300'
                      : 'border-warm-300 focus:ring-brand-600'
                  }`}
                />
                {/* Status icon inside input */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {codeValidating && <Loader2 className="w-3.5 h-3.5 text-charcoal-400 animate-spin" />}
                  {!codeValidating && codeStatus === 'valid' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  {!codeValidating && codeStatus === 'invalid' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                </div>
              </div>
              <CodeFeedback />
              {codeStatus === 'idle' && !codeValidating && (
                <span className="text-[10px] text-charcoal-400 block mt-1">
                  Instantly connect a friend to this new Blend
                </span>
              )}
            </div>

            {/* General form error (non-code errors) */}
            {error && codeStatus !== 'invalid' && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || codeValidating || codeStatus === 'invalid'}
              className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-subtle transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Create Expenso Blend
            </button>
          </form>
        )}

        {/* Tab 3: Connect with Friend / Join Blend */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinWithCode} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Enter 6-Character Invite or Blend Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Friend code or Blend code"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={e => handleJoinCodeChange(e.target.value)}
                  onBlur={() => joinCodeInput.trim() && checkCode(joinCodeInput)}
                  autoFocus
                  className={`w-full px-3 py-2.5 pr-8 text-base font-mono tracking-widest text-center uppercase bg-white text-charcoal-900 border rounded-xl focus:outline-none focus:ring-2 shadow-subtle transition-all ${
                    codeStatus === 'valid'
                      ? 'border-emerald-500 focus:ring-emerald-400'
                      : codeStatus === 'invalid'
                      ? 'border-rose-400 focus:ring-rose-300'
                      : 'border-warm-300 focus:ring-brand-600'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {codeValidating && <Loader2 className="w-4 h-4 text-charcoal-400 animate-spin" />}
                  {!codeValidating && codeStatus === 'valid' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                  {!codeValidating && codeStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                </div>
              </div>

              <CodeFeedback />

              {codeStatus === 'idle' && !codeValidating && (
                <p className="text-[11px] text-charcoal-500 mt-1.5 leading-relaxed">
                  Enter a friend's personal code <strong>or</strong> a Blend code to instantly connect and join.
                </p>
              )}
            </div>

            {/* General form error (non-code errors) */}
            {error && codeStatus !== 'invalid' && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || codeValidating || codeStatus === 'invalid' || !joinCodeInput.trim()}
              className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-subtle transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Users className="w-3.5 h-3.5" />}
              <span>Connect & Join Blend</span>
            </button>
          </form>
        )}

        </div>

        <div className="p-4 bg-white border-t border-warm-200 text-center shrink-0">
          <button
            type="button"
            onClick={closeBlendModal}
            className="text-xs font-bold text-charcoal-500 hover:text-charcoal-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
