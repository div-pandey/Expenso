import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { ConfirmDialog } from '../forms/ConfirmDialog';
import { BlendAvatar } from '../common/BlendAvatar';
import { BlendPfpModal } from '../forms/BlendPfpModal';
import { isValidInviteCodeFormat } from '../../utils/inviteCodes';
import type { Member } from '../../types';
import {
  Users,
  Edit2,
  Check,
  RotateCcw,
  Copy,
  UserPlus,
  KeyRound,
  Crown,
  Trash2,
  UserMinus,
  Camera,
  Plus,
  AlertCircle,
  Loader2,
  LogOut,
  X,
  UserCheck,
} from 'lucide-react';

export const GroupView: React.FC = () => {
  const {
    currentBlend,
    members,
    expenses,
    totalGroupSpendPaise,
    currentUser,
    isBlendAdmin,
    updateBlendDetails,
    deleteBlend,
    removeMemberFromBlend,
    addMemberToBlend,
    validateInviteCode,
    handleResetDemoData,
    openBlendModal,
    isCloudConfigured,
    showToast,
  } = useApp();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentBlend?.name || '');
  const [isPfpModalOpen, setIsPfpModalOpen] = useState(false);

  // Add Member inline form state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberCode, setNewMemberCode] = useState('');
  const [memberCodeValidating, setMemberCodeValidating] = useState(false);
  const [memberCodeStatus, setMemberCodeStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [memberCodeValidName, setMemberCodeValidName] = useState('');
  const [memberCodeError, setMemberCodeError] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Confirm dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBlendCode, setCopiedBlendCode] = useState(false);

  if (!currentBlend) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-12">
        <div className="w-20 h-20 rounded-3xl bg-warm-100 flex items-center justify-center mb-6 shadow-subtle">
          <Users className="w-10 h-10 text-charcoal-400" />
        </div>
        <h2 className="text-2xl font-black text-charcoal-800 mb-3">
          You're not in any blend
        </h2>
        <p className="text-sm text-charcoal-500 max-w-sm leading-relaxed mb-8">
          Create your first blend now and start calculating expenses with your friends, or share your personal code so that they can add you to their blend.
        </p>
        <button
          onClick={openBlendModal}
          className="flex items-center gap-2 px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-2xl shadow-card transition-all text-sm mb-4"
        >
          <UserPlus className="w-4 h-4" />
          Create / Join a Blend
        </button>
      </div>
    );
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      await updateBlendDetails({ name: nameInput.trim() });
      setIsEditingName(false);
    }
  };

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopiedCode(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyBlendCode = () => {
    if (!currentBlend.blendCode) return;
    navigator.clipboard.writeText(currentBlend.blendCode);
    setCopiedBlendCode(true);
    showToast(`Copied Blend code: ${currentBlend.blendCode}`);
    setTimeout(() => setCopiedBlendCode(false), 2000);
  };

  const checkMemberCode = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setMemberCodeStatus('idle');
      setMemberCodeError('');
      setMemberCodeValidName('');
      return;
    }
    if (!isValidInviteCodeFormat(clean)) {
      setMemberCodeStatus('invalid');
      setMemberCodeError('Code must be exactly 6 alphanumeric characters.');
      return;
    }
    // Check if member already in blend
    if (members.some(m => m.inviteCode === clean)) {
      setMemberCodeStatus('invalid');
      setMemberCodeError('This person is already a member of this blend.');
      return;
    }
    setMemberCodeValidating(true);
    setMemberCodeStatus('idle');
    setMemberCodeError('');
    const result = await validateInviteCode(clean);
    setMemberCodeValidating(false);
    if (result.valid) {
      if (result.isBlend) {
        setMemberCodeStatus('invalid');
        setMemberCodeError("This is a blend code. Please enter your friend's personal code.");
      } else {
        setMemberCodeStatus('valid');
        setMemberCodeValidName(result.name || '');
      }
    } else {
      setMemberCodeStatus('invalid');
      setMemberCodeError(result.error || 'Invalid personal code.');
    }
  };

  const handleMemberCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setNewMemberCode(upper);
    setMemberCodeStatus('idle');
    setMemberCodeError('');
    if (upper.trim().length === 6) {
      checkMemberCode(upper);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberCodeStatus !== 'valid' || !newMemberCode.trim()) return;
    setIsAddingMember(true);
    try {
      await addMemberToBlend(newMemberCode.trim());
      setNewMemberCode('');
      setMemberCodeStatus('idle');
      setMemberCodeValidName('');
      setIsAddMemberOpen(false);
    } catch {
      // Error toast is handled in AppContext
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteBlendConfirm = async () => {
    try {
      await deleteBlend();
      setShowDeleteConfirm(false);
    } catch {
      // Handled in context
    }
  };

  const handleRemoveMemberConfirm = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberFromBlend(memberToRemove.id);
      setMemberToRemove(null);
    } catch {
      // Handled in context
    }
  };

  const handleLeaveBlendConfirm = async () => {
    try {
      await removeMemberFromBlend(currentUser.id);
      setShowLeaveConfirm(false);
    } catch {
      // Handled in context
    }
  };

  // Find admin member profile
  const adminMember = members.find(m => m.role === 'admin' || m.id === currentBlend.createdBy);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Active Blend Header Card */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Blend PFP / Avatar */}
            <div className="relative group shrink-0">
              <BlendAvatar name={currentBlend.name} icon={currentBlend.icon} size="xl" />
              {isBlendAdmin && (
                <button
                  type="button"
                  onClick={() => setIsPfpModalOpen(true)}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white hover:bg-brand-50 text-brand-700 rounded-xl border border-warm-200 shadow-subtle flex items-center justify-center transition-all cursor-pointer group-hover:scale-110"
                  title="Change Blend Icon / Profile Picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
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
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 bg-warm-100 text-charcoal-600 rounded-lg hover:bg-warm-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                    {currentBlend.name}
                  </h1>
                  {isBlendAdmin && (
                    <button
                      onClick={() => {
                        setNameInput(currentBlend.name);
                        setIsEditingName(true);
                      }}
                      className="p-1 text-charcoal-400 hover:text-charcoal-700 rounded-md hover:bg-warm-100 transition-colors"
                      title="Edit blend name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {isBlendAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3 text-amber-600" /> You are the Blend Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal-500 bg-warm-100 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3 text-amber-600" /> Admin: {adminMember?.name || 'Blend Owner'}
                  </span>
                )}
                <span className="text-xs text-charcoal-400">•</span>
                <span className="text-xs text-charcoal-500">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>

          {/* Group Stat Pills */}
          <div className="flex items-center gap-3">
            <div className="bg-warm-50 border border-warm-200/90 rounded-2xl px-4 py-2.5 text-center flex-1 sm:flex-initial">
              <span className="text-[10px] uppercase font-bold text-charcoal-500 block">
                Total Blend Spend
              </span>
              <span className="text-sm sm:text-base font-black text-charcoal-900">
                {formatCurrency(totalGroupSpendPaise)}
              </span>
            </div>
            <div className="bg-warm-50 border border-warm-200/90 rounded-2xl px-4 py-2.5 text-center flex-1 sm:flex-initial">
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
        {/* Blend Code */}
        {currentBlend.blendCode && (
          <div className="bg-white border border-warm-200 rounded-3xl p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-charcoal-500" />
              <h2 className="text-sm font-bold text-charcoal-900">Blend Code</h2>
              <span className="text-[10px] font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 ml-auto">
                Shareable
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Share this code so friends can join <strong>{currentBlend.name}</strong> directly.
            </p>
            <div className="bg-warm-50/70 border border-warm-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <span className="text-xl font-mono font-black text-brand-900 tracking-widest">
                {currentBlend.blendCode}
              </span>
              <button
                onClick={copyBlendCode}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold rounded-lg transition-colors border border-brand-200 shrink-0"
              >
                {copiedBlendCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBlendCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Your Personal Account & Invitation Code */}
        <div className="bg-white border border-warm-200 rounded-3xl p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-charcoal-500" />
              <h2 className="text-sm font-bold text-charcoal-900">
                Your Personal Code
              </h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Personal Code
            </span>
          </div>

          <div className="bg-warm-50/70 border border-warm-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-charcoal-400 block">
                Share to get added by friends
              </span>
              <span className="text-lg font-mono font-black text-brand-900 tracking-wider">
                {currentUser.inviteCode}
              </span>
            </div>
            <button
              onClick={copyMyCode}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-warm-100 text-charcoal-800 text-xs font-bold rounded-lg transition-colors border border-warm-200 shrink-0 shadow-subtle"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Blend Members Card */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-charcoal-500" />
            <h2 className="text-sm font-bold text-charcoal-900">
              Blend Members ({members.length})
            </h2>
          </div>

          {/* Admin "+ Add Member" Button */}
          {isBlendAdmin && (
            <button
              onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold rounded-xl border border-brand-200 transition-all cursor-pointer"
            >
              {isAddMemberOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isAddMemberOpen ? 'Cancel' : 'Add Member'}</span>
            </button>
          )}
        </div>

        {/* Admin Add Member Inline Panel */}
        {isBlendAdmin && isAddMemberOpen && (
          <form
            onSubmit={handleAddMemberSubmit}
            className="p-4 bg-warm-50/80 border border-brand-200 rounded-2xl space-y-3 animate-slide-up"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-800">
                Add Member by Personal Invite Code
              </span>
              <span className="text-[10px] text-charcoal-400">Admin Only</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="e.g. RAHUL9"
                maxLength={6}
                value={newMemberCode}
                onChange={e => handleMemberCodeChange(e.target.value)}
                autoFocus
                className={`w-full px-3 py-2 pr-8 text-xs font-mono tracking-widest uppercase bg-white text-charcoal-900 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  memberCodeStatus === 'valid'
                    ? 'border-emerald-500 focus:ring-emerald-400'
                    : memberCodeStatus === 'invalid'
                    ? 'border-rose-400 focus:ring-rose-300'
                    : 'border-warm-300 focus:ring-brand-600'
                }`}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {memberCodeValidating && <Loader2 className="w-3.5 h-3.5 text-charcoal-400 animate-spin" />}
                {!memberCodeValidating && memberCodeStatus === 'valid' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                {!memberCodeValidating && memberCodeStatus === 'invalid' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
              </div>
            </div>

            {/* Validation Feedback */}
            {memberCodeValidating && (
              <span className="flex items-center gap-1 text-[11px] text-charcoal-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying friend's code...
              </span>
            )}
            {!memberCodeValidating && memberCodeStatus === 'valid' && (
              <div className="flex items-center justify-between gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs text-emerald-800 font-semibold">
                  Found: <strong className="underline">{memberCodeValidName}</strong>
                </span>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="px-3 py-1 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-subtle transition-all flex items-center gap-1 cursor-pointer"
                >
                  {isAddingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add to Blend</span>
                </button>
              </div>
            )}
            {!memberCodeValidating && memberCodeStatus === 'invalid' && memberCodeError && (
              <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {memberCodeError}
              </span>
            )}
          </form>
        )}

        {/* Member list */}
        <div className="divide-y divide-warm-100">
          {members.map(member => {
            const isMemberAdmin = member.role === 'admin' || member.id === currentBlend.createdBy;
            const canKick = isBlendAdmin && !member.isCurrentUser && member.id !== currentBlend.createdBy;
            const canLeave = !isBlendAdmin && member.isCurrentUser;

            return (
              <div
                key={member.id}
                className="py-3.5 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${member.avatarColor}`}
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

                <div className="flex items-center gap-2.5">
                  {/* Admin vs Member Badge */}
                  {isMemberAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Crown className="w-3 h-3 text-amber-600" /> Blend Admin
                    </span>
                  ) : (
                    <span className="text-[11px] text-charcoal-500 bg-warm-100 border border-warm-200 px-2.5 py-1 rounded-full font-medium">
                      Member
                    </span>
                  )}

                  {/* Admin Kick Member Action */}
                  {canKick && (
                    <button
                      type="button"
                      onClick={() => setMemberToRemove(member)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      title={`Remove ${member.name} from blend`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Kick</span>
                    </button>
                  )}

                  {/* Ordinary Member Leave Blend Action */}
                  {canLeave && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveConfirm(true)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-charcoal-600 hover:text-rose-600 bg-warm-100 hover:bg-rose-50 border border-warm-200 rounded-lg transition-colors cursor-pointer"
                      title="Leave this blend"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Danger Zone: Delete Blend */}
      {isBlendAdmin && (
        <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-900">
              Blend Admin Danger Zone
            </h2>
          </div>
          <p className="text-xs text-charcoal-500 leading-relaxed max-w-xl">
            As the Blend Admin, you can permanently delete <strong>"{currentBlend.name}"</strong>. This will remove all members and clear the commute history for this blend. This action cannot be undone.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete This Blend</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Profile Picture / Icon Modal */}
      <BlendPfpModal
        isOpen={isPfpModalOpen}
        blendName={currentBlend.name}
        currentIcon={currentBlend.icon}
        onClose={() => setIsPfpModalOpen(false)}
        onSave={async icon => {
          await updateBlendDetails({ icon: icon || '' });
        }}
      />

      {/* Confirm Delete Blend Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`Delete "${currentBlend.name}"?`}
        message="This will permanently delete this blend, all member associations, and associated records for everyone. This cannot be undone."
        confirmLabel="Delete Blend"
        isDestructive={true}
        onConfirm={handleDeleteBlendConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Confirm Kick Member Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        title={`Kick ${memberToRemove?.name}?`}
        message={`Are you sure you want to remove ${memberToRemove?.name} from "${currentBlend.name}"? They will receive an in-app notification and no longer have access to this blend.`}
        confirmLabel="Remove Member"
        isDestructive={true}
        onConfirm={handleRemoveMemberConfirm}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Confirm Leave Blend Dialog */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title={`Leave "${currentBlend.name}"?`}
        message="Are you sure you want to leave this blend? You will need an invite code to rejoin."
        confirmLabel="Leave Blend"
        isDestructive={true}
        onConfirm={handleLeaveBlendConfirm}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Reset Sandbox Confirm Dialog */}
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
