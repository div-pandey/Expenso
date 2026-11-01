import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { isValidInviteCodeFormat } from '../../utils/inviteCodes';
import { X, Copy, Check, Users, Loader2, UserCheck, AlertCircle, Plus } from 'lucide-react';

interface ConfirmedFriend {
  code: string;
  name: string;
}

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

  // Multi-friend state for Create tab
  const [currentFriendCode, setCurrentFriendCode] = useState('');
  const [confirmedFriends, setConfirmedFriends] = useState<ConfirmedFriend[]>([]);
  const [friendCodeValidating, setFriendCodeValidating] = useState(false);
  const [friendCodeStatus, setFriendCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [friendCodeValidName, setFriendCodeValidName] = useState('');
  const [friendCodeError, setFriendCodeError] = useState('');

  // Join tab state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinValidating, setJoinValidating] = useState(false);
  const [joinCodeStatus, setJoinCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [joinCodeValidName, setJoinCodeValidName] = useState('');
  const [joinIsBlend, setJoinIsBlend] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopied(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Friend code validation (Create tab â€” personal codes ONLY) ----
  const resetFriendCodeStatus = () => {
    setFriendCodeStatus('idle');
    setFriendCodeValidName('');
    setFriendCodeError('');
  };

  const checkFriendCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) { resetFriendCodeStatus(); return; }
    if (!isValidInviteCodeFormat(clean)) {
      setFriendCodeStatus('invalid');
      setFriendCodeError('Code must be exactly 6 alphanumeric characters.');
      return;
    }
    // Check if this code is already added
    if (confirmedFriends.some(f => f.code === clean)) {
      setFriendCodeStatus('invalid');
      setFriendCodeError('This friend has already been added.');
      return;
    }
    setFriendCodeValidating(true);
    setFriendCodeStatus('idle');
    setFriendCodeError('');
    const result = await validateInviteCode(clean);
    setFriendCodeValidating(false);
    if (result.valid) {
      if (result.isBlend) {
        // Blend codes are NOT allowed here
        setFriendCodeStatus('invalid');
        setFriendCodeError('This is a blend code, not a personal invite code. Please enter your friend\'s personal code.');
      } else {
        setFriendCodeStatus('valid');
        setFriendCodeValidName(result.name || '');
        setFriendCodeError('');
      }
    } else {
      setFriendCodeStatus('invalid');
      setFriendCodeError(result.error || 'Invalid invitation code.');
    }
  }, [validateInviteCode, confirmedFriends]);

  const handleFriendCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setCurrentFriendCode(upper);
    resetFriendCodeStatus();
    
    if (upper.trim().length === 6) {
      checkFriendCode(upper);
    }
  };

  /** Moves the current validated friend into the confirmedFriends list */
  const confirmCurrentFriend = () => {
    if (friendCodeStatus !== 'valid' || !friendCodeValidName) return;
    setConfirmedFriends(prev => [...prev, { code: currentFriendCode.trim().toUpperCase(), name: friendCodeValidName }]);
    setCurrentFriendCode('');
    resetFriendCodeStatus();
    
  };

  const removeConfirmedFriend = (code: string) => {
    setConfirmedFriends(prev => prev.filter(f => f.code !== code));
  };

  // ---- Join tab validation ----
  const resetJoinStatus = () => {
    setJoinCodeStatus('idle');
    setJoinCodeValidName('');
    setJoinIsBlend(false);
    setJoinError('');
  };

  const checkJoinCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) { resetJoinStatus(); return; }
    if (!isValidInviteCodeFormat(clean)) {
      setJoinCodeStatus('invalid');
      setJoinError('Code must be exactly 6 alphanumeric characters.');
      return;
    }
    setJoinValidating(true);
    setJoinCodeStatus('idle');
    setJoinError('');
    const result = await validateInviteCode(clean);
    setJoinValidating(false);
    if (result.valid) {
      setJoinCodeStatus('valid');
      setJoinCodeValidName(result.name || '');
      setJoinIsBlend(Boolean(result.isBlend));
      setJoinError('');
    } else {
      setJoinCodeStatus('invalid');
      setJoinError(result.error || 'Invalid invitation code.');
    }
  }, [validateInviteCode]);

  const handleJoinCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setJoinCodeInput(upper);
    resetJoinStatus();
    if (upper.trim().length === 6) {
      checkJoinCode(upper);
    }
  };

  // ---- Create Blend submit ----
  const handleCreateBlend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blendName.trim()) {
      setFormError('Please enter a name for your Blend');
      return;
    }

    // Build final friends list â€” confirmed + current (if valid)
    let allFriendCodes = confirmedFriends.map(f => f.code);
    const currentClean = currentFriendCode.trim().toUpperCase();
    if (currentClean) {
      if (friendCodeStatus !== 'valid') {
        // Validate now
        setFriendCodeValidating(true);
        const result = await validateInviteCode(currentClean);
        setFriendCodeValidating(false);
        if (!result.valid) {
          setFriendCodeStatus('invalid');
          setFriendCodeError(result.error || 'Invalid invitation code. Please check or leave blank.');
          return;
        }
        if (result.isBlend) {
          setFriendCodeStatus('invalid');
          setFriendCodeError('This is a blend code, not a personal invite code.');
          return;
        }
        setFriendCodeStatus('valid');
        setFriendCodeValidName(result.name || '');
        allFriendCodes = [...allFriendCodes, currentClean];
      } else {
        allFriendCodes = [...allFriendCodes, currentClean];
      }
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await createBlend(blendName.trim(), allFriendCodes.length > 0 ? allFriendCodes : undefined);
      setBlendName('');
      setCurrentFriendCode('');
      setConfirmedFriends([]);
      resetFriendCodeStatus();
      
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create Blend');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Join with code submit ----
  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) {
      setJoinError('Please enter a 6-character code');
      return;
    }
    if (joinCodeStatus !== 'valid') {
      setJoinValidating(true);
      const result = await validateInviteCode(clean);
      setJoinValidating(false);
      if (!result.valid) {
        setJoinCodeStatus('invalid');
        setJoinError(result.error || 'Invalid invitation code.');
        return;
      }
      setJoinCodeStatus('valid');
      setJoinCodeValidName(result.name || '');
    }
    setJoinError('');
    setIsSubmitting(true);
    try {
      await joinBlendWithFriendCode(clean);
      setJoinCodeInput('');
      resetJoinStatus();
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Invalid invitation code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (tab: 'switch' | 'create' | 'join') => {
    setActiveTab(tab);
    setFormError('');
    resetFriendCodeStatus();
    resetJoinStatus();
    setCurrentFriendCode('');
    setJoinCodeInput('');
    setBlendName('');
    setConfirmedFriends([]);
    
  };

  if (!isBlendModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) closeBlendModal(); }}
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
              <h2 className="text-base font-bold text-charcoal-900 leading-none">Expenso Blends</h2>
              <p className="text-xs text-charcoal-500 mt-0.5">Private groups for tracking shared commutes</p>
            </div>
          </div>
          <button onClick={closeBlendModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1">
          {/* Personal Code Card */}
          <div className="p-5 pb-3">
            <div className="bg-white border border-brand-200 rounded-xl p-3.5 shadow-subtle flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 block">Your Personal Invitation Code</span>
                <span className="text-xl font-mono font-black text-brand-900 tracking-widest mt-0.5 block">{currentUser.inviteCode}</span>
                <span className="text-[11px] text-charcoal-500 block">Share this with friends so they can add you to a Blend</span>
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

          {/* Tabs */}
          <div className="px-5 pt-1">
            <div className="flex bg-warm-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => switchTab('switch')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'switch' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'}`}
              >
                My Blends ({userBlends.length})
              </button>
              <button
                onClick={() => switchTab('create')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'create' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'}`}
              >
                + Create Blend
              </button>
              <button
                onClick={() => switchTab('join')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'join' ? 'bg-white text-charcoal-900 shadow-subtle' : 'text-charcoal-500 hover:text-charcoal-900'}`}
              >
                Connect Friend
              </button>
            </div>
          </div>

          {/* Tab 1: My Blends */}
          {activeTab === 'switch' && (
            <div className="p-5 space-y-2.5 max-h-64 overflow-y-auto">
              {userBlends.length === 0 && (
                <p className="text-center text-xs text-charcoal-400 py-6">No blends yet. Create your first one!</p>
              )}
              {userBlends.map(blend => {
                const isActive = currentBlend?.id === blend.id;
                return (
                  <div
                    key={blend.id}
                    onClick={() => { switchBlend(blend.id); closeBlendModal(); }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isActive ? 'border-brand-600 bg-brand-50/80 text-brand-950 font-bold ring-1 ring-brand-600' : 'border-warm-200 bg-white hover:bg-warm-100 text-charcoal-800'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-warm-100 flex items-center justify-center text-xs font-bold text-charcoal-700">
                        {blend.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold truncate max-w-[180px]">{blend.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-charcoal-400 font-normal">{blend.memberCount || 1} member{blend.memberCount === 1 ? '' : 's'}</span>
                          {blend.blendCode && (
                            <>
                              <span className="text-charcoal-300 text-[10px]">â€¢</span>
                              <span className="font-mono text-[10px] font-bold bg-warm-100 text-charcoal-700 px-1 rounded border border-warm-200">{blend.blendCode}</span>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(blend.blendCode || ''); showToast(`Copied Blend Code: ${blend.blendCode}`); }}
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
                    {isActive && <span className="text-[10px] bg-brand-700 text-white font-bold px-2 py-0.5 rounded">Active</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Create a New Blend */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateBlend} className="p-5 space-y-3.5">
              {/* Blend Name */}
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
                <span className="text-[10px] text-charcoal-400 block mt-1">A unique 6-character Blend Code will be generated automatically.</span>
              </div>

              {/* Friends section */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                  Friend's Personal Invite Code <span className="text-charcoal-400 font-normal normal-case">(optional)</span>
                </label>

                {/* Confirmed friends chips */}
                {confirmedFriends.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {confirmedFriends.map(f => (
                      <span key={f.code} className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 border border-brand-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" />
                        {f.name}
                        <button
                          type="button"
                          onClick={() => removeConfirmedFriend(f.code)}
                          className="ml-0.5 text-brand-500 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Current friend code input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. RAHUL9"
                    maxLength={6}
                    value={currentFriendCode}
                    onChange={e => handleFriendCodeChange(e.target.value)}
                    onBlur={() => currentFriendCode.trim() && checkFriendCode(currentFriendCode)}
                    className={`w-full px-3 py-2 pr-8 text-xs font-mono tracking-widest bg-white text-charcoal-900 border rounded-xl focus:outline-none focus:ring-2 uppercase transition-all ${
                      friendCodeStatus === 'valid' ? 'border-emerald-500 focus:ring-emerald-400'
                      : friendCodeStatus === 'invalid' ? 'border-rose-400 focus:ring-rose-300'
                      : 'border-warm-300 focus:ring-brand-600'
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {friendCodeValidating && <Loader2 className="w-3.5 h-3.5 text-charcoal-400 animate-spin" />}
                    {!friendCodeValidating && friendCodeStatus === 'valid' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    {!friendCodeValidating && friendCodeStatus === 'invalid' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                </div>

                {/* Feedback */}
                {friendCodeValidating && (
                  <span className="flex items-center gap-1 text-[11px] text-charcoal-500 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking code...</span>
                )}
                {!friendCodeValidating && friendCodeStatus === 'valid' && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Connect now with <strong className="font-bold underline">{friendCodeValidName}</strong></span>
                    </div>
                    {/* "Add more friends" option */}
                    <button
                      type="button"
                      onClick={confirmCurrentFriend}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100/80 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 transition-all shadow-subtle cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add more friends</span>
                      <span className="text-[10px] text-emerald-600 font-normal">(optional)</span>
                    </button>
                  </div>
                )}
                {!friendCodeValidating && friendCodeStatus === 'invalid' && friendCodeError && (
                  <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {friendCodeError}
                  </span>
                )}
                {friendCodeStatus === 'idle' && !friendCodeValidating && (
                  <span className="text-[10px] text-charcoal-400 block mt-1">Enter your friend's personal code to instantly add them to this blend</span>
                )}
              </div>

              {/* General form error */}
              {formError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || friendCodeValidating || friendCodeStatus === 'invalid'}
                className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-subtle transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Create Expenso Blend
              </button>
            </form>
          )}

          {/* Tab 3: Connect Friend / Join Blend */}
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
                    onBlur={() => joinCodeInput.trim() && checkJoinCode(joinCodeInput)}
                    autoFocus
                    className={`w-full px-3 py-2.5 pr-8 text-base font-mono tracking-widest text-center uppercase bg-white text-charcoal-900 border rounded-xl focus:outline-none focus:ring-2 shadow-subtle transition-all ${
                      joinCodeStatus === 'valid' ? 'border-emerald-500 focus:ring-emerald-400'
                      : joinCodeStatus === 'invalid' ? 'border-rose-400 focus:ring-rose-300'
                      : 'border-warm-300 focus:ring-brand-600'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {joinValidating && <Loader2 className="w-4 h-4 text-charcoal-400 animate-spin" />}
                    {!joinValidating && joinCodeStatus === 'valid' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                    {!joinValidating && joinCodeStatus === 'invalid' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                  </div>
                </div>

                {joinValidating && (
                  <span className="flex items-center gap-1 text-[11px] text-charcoal-500 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking code...</span>
                )}
                {!joinValidating && joinCodeStatus === 'valid' && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
                    <UserCheck className="w-3.5 h-3.5" /> Found {joinIsBlend ? 'Blend' : 'Friend'}: <strong>{joinCodeValidName}</strong> â€” ready to connect!
                  </span>
                )}
                {!joinValidating && joinCodeStatus === 'invalid' && joinError && (
                  <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {joinError}
                  </span>
                )}
                {joinCodeStatus === 'idle' && !joinValidating && (
                  <p className="text-[11px] text-charcoal-500 mt-1.5 leading-relaxed">
                    Enter a friend's personal code <strong>or</strong> a Blend code to instantly connect and join.
                  </p>
                )}
              </div>

              {joinError && joinCodeStatus !== 'invalid' && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {joinError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || joinValidating || joinCodeStatus === 'invalid' || !joinCodeInput.trim()}
                className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-subtle transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                <span>Connect &amp; Join Blend</span>
              </button>
            </form>
          )}
        </div>

        <div className="p-4 bg-white border-t border-warm-200 text-center shrink-0">
          <button type="button" onClick={closeBlendModal} className="text-xs font-bold text-charcoal-500 hover:text-charcoal-800">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

