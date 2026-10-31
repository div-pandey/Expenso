import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { ConfirmDialog } from '../forms/ConfirmDialog';
import {
  Users,
  Edit2,
  Check,
  RotateCcw,
  Copy,
  UserPlus,
  KeyRound,
} from 'lucide-react';

export const GroupView: React.FC = () => {
  const {
    currentBlend,
    members,
    expenses,
    totalGroupSpendPaise,
    currentUser,
    updateBlendName,
    handleResetDemoData,
    openBlendModal,
    isCloudConfigured,
    showToast,
  } = useApp();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentBlend?.name || '');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      await updateBlendName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopiedCode(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Active Blend Header Card */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Active Expenso Blend
              </span>
              <button
                onClick={openBlendModal}
                className="text-[10px] text-brand-700 font-bold hover:underline"
              >
                (Switch Blend)
              </button>
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  autoFocus
                  className="text-lg sm:text-xl font-black text-charcoal-900 border border-brand-500 rounded-lg px-2.5 py-1 focus:outline-none ring-2 ring-brand-200"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-brand-700 text-white rounded-lg hover:bg-brand-800"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                  {currentBlend?.name || 'My Blend'}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(currentBlend?.name || '');
                    setIsEditingName(true);
                  }}
                  className="p-1 text-charcoal-400 hover:text-charcoal-700 rounded-md hover:bg-warm-100 transition-colors"
                  aria-label="Edit blend name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-xs text-charcoal-500 mt-1">
              Private friend commute group with {members.length} members.
            </p>
          </div>

          {/* Group Stat Pills */}
          <div className="flex items-center gap-3">
            <div className="bg-warm-50 border border-warm-200/90 rounded-xl px-3 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-charcoal-500 block">
                Total Blend Spend
              </span>
              <span className="text-sm sm:text-base font-black text-charcoal-900">
                {formatCurrency(totalGroupSpendPaise)}
              </span>
            </div>
            <div className="bg-warm-50 border border-warm-200/90 rounded-xl px-3 py-2 text-center">
              <span className="text-[10px] uppercase font-bold text-charcoal-500 block">
                Total Rides
              </span>
              <span className="text-sm sm:text-base font-black text-charcoal-900">
                {expenses.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Blend Code & Personal Code Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Blend Code (shareable to join this blend directly) */}
        {currentBlend?.blendCode && (
          <div className="bg-white border border-warm-200 rounded-3xl p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-charcoal-500" />
              <h2 className="text-sm font-bold text-charcoal-900">Blend Code</h2>
              <span className="text-[10px] font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 ml-auto">
                Shareable
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Share this code so anyone can join <strong>{currentBlend.name}</strong> directly.
            </p>
            <div className="bg-warm-50/70 border border-warm-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <span className="text-xl font-mono font-black text-brand-900 tracking-widest">
                {currentBlend.blendCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentBlend.blendCode || '');
                  showToast(`Copied Blend code: ${currentBlend.blendCode}`);
                }}
                className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors border border-brand-200 shrink-0"
                title="Copy Blend Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Your Personal Account & Invitation Code */}
        <div className={`bg-white border border-warm-200 rounded-3xl p-5 shadow-subtle space-y-3 ${!currentBlend?.blendCode ? 'col-span-full sm:col-span-1' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-charcoal-500" />
              <h2 className="text-sm font-bold text-charcoal-900">
                Your Personal Code
              </h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Active User
            </span>
          </div>

          <div className="bg-warm-50/70 border border-warm-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${currentUser.avatarColor}`}>
                {currentUser.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal-900">{currentUser.fullName}</p>
                <p className="text-xs text-charcoal-400">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-warm-200 shadow-subtle self-start sm:self-auto">
              <div>
                <span className="text-[9px] uppercase font-bold text-charcoal-400 block">
                  Your Personal Code
                </span>
                <span className="text-base font-mono font-black text-brand-900 tracking-wider">
                  {currentUser.inviteCode}
                </span>
              </div>
            <button
              onClick={copyMyCode}
              className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-lg transition-colors border border-brand-200"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Blend Members List */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-charcoal-500" />
            <h2 className="text-sm font-bold text-charcoal-900">
              Blend Members ({members.length})
            </h2>
          </div>
          <button
            onClick={openBlendModal}
            className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Connect Friend</span>
          </button>
        </div>

        <div className="divide-y divide-warm-100">
          {members.map(member => (
            <div
              key={member.id}
              className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${member.avatarColor}`}
                >
                  {member.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-charcoal-900">
                      {member.name}
                    </span>
                    {member.isCurrentUser && (
                      <span className="text-[10px] font-bold bg-brand-100 text-brand-800 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>
                  {member.inviteCode && (
                    <span className="text-[10px] font-mono text-charcoal-400">
                      Code: {member.inviteCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Blend Member
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Local Sandbox / Demo Controls */}
      {!isCloudConfigured && (
        <div className="bg-white border border-warm-200 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-sm font-bold text-charcoal-900">
            Multi-User Sandbox Controls
          </h2>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            Expenso is currently running in local storage sandbox mode. You can reset the sandbox back to its initial demo state if needed.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-charcoal-700 bg-warm-100 hover:bg-warm-200 rounded-xl transition-colors border border-warm-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Sandbox Data
            </button>
          </div>
        </div>
      )}



      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Sandbox Data?"
        message="This will re-initialize the local accounts and sample rides for Rahul, Aman, and Divyansh."
        confirmLabel="Reset Sandbox"
        onConfirm={() => {
          handleResetDemoData();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
