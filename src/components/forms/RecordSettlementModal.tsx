import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, parseRupeesToPaise } from '../../utils/currency';
import { getCurrentDateTimeLocal } from '../../utils/dates';
import { buildSafeUpiUri, isValidUpiId } from '../../utils/upi';
import {
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ExternalLink,
  QrCode,
  Copy,
  Upload,
  Banknote,
  Clock,
  Loader2,
} from 'lucide-react';

const COMMON_UPI_HANDLES = ['@okaxis', '@okhdfcbank', '@paytm', '@ybl', '@upi', '@oksbi', '@icici'];

export const RecordSettlementModal: React.FC = () => {
  const {
    isRecordSettlementOpen,
    closeRecordSettlement,
    settlementPreset,
    members,
    currentUser,
    currentUserBalance,
    currentBlend,
    suggestedSettlements,
    recordSettlement,
    showToast,
  } = useApp();

  const [fromMemberId, setFromMemberId] = useState<string>('');
  const [toMemberId, setToMemberId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>(getCurrentDateTimeLocal());
  const [notes, setNotes] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');

  // UPI Specific state
  const [recipientUpi, setRecipientUpi] = useState<string>('');
  const [isEditingUpi, setIsEditingUpi] = useState<boolean>(false);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [_proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cash Specific state
  const [cashConfirmed, setCashConfirmed] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debts where currentUser is the debtor (owes money to someone)
  const userDebts = suggestedSettlements.filter(s => s.fromMemberId === currentUser.id);
  const eligibleCreditorIds = userDebts.map(s => s.toMemberId);
  const eligibleCreditors = members.filter(m => eligibleCreditorIds.includes(m.id));
  const hasDebts = eligibleCreditors.length > 0;

  useEffect(() => {
    if (isRecordSettlementOpen) {
      setFromMemberId(currentUser.id);
      let targetToId = '';
      let initialAmountPaise = 0;

      if (hasDebts) {
        if (settlementPreset?.toId && eligibleCreditorIds.includes(settlementPreset.toId)) {
          targetToId = settlementPreset.toId;
          const debt = userDebts.find(d => d.toMemberId === targetToId);
          initialAmountPaise = settlementPreset.amountPaise || debt?.amountPaise || 0;
        } else if (settlementPreset?.fromId && eligibleCreditorIds.includes(settlementPreset.fromId)) {
          targetToId = settlementPreset.fromId;
          const debt = userDebts.find(d => d.toMemberId === targetToId);
          initialAmountPaise = settlementPreset.amountPaise || debt?.amountPaise || 0;
        } else {
          targetToId = eligibleCreditors[0]?.id || '';
          const debt = userDebts.find(d => d.toMemberId === targetToId);
          initialAmountPaise = debt?.amountPaise || 0;
        }

        setToMemberId(targetToId);
        setAmountStr(initialAmountPaise > 0 ? (initialAmountPaise / 100).toString() : '');
      } else {
        setToMemberId('');
        setAmountStr('');
      }

      setDateTime(getCurrentDateTimeLocal());
      setNotes('');
      setPaymentMode('upi');
      setUtrNumber('');
      setProofFile(null);
      setProofPreview(null);
      setShowQrCode(false);
      setCashConfirmed(false);
      setIsEditingUpi(false);
      setErrors({});

      // Load cached or registered UPI ID for target recipient
      if (targetToId) {
        const mem = members.find(m => m.id === targetToId);
        const savedUpi = mem?.paymentMethod?.upiId || localStorage.getItem(`expenso_recipient_upi_${targetToId}`) || '';
        setRecipientUpi(savedUpi);
      }
    }
  }, [isRecordSettlementOpen, settlementPreset, members, currentUser, suggestedSettlements, hasDebts]);

  // When toMember changes, update the recipient UPI ID
  const handleSelectCreditor = (creditorId: string) => {
    setToMemberId(creditorId);
    const debt = userDebts.find(d => d.toMemberId === creditorId);
    if (debt) {
      setAmountStr((debt.amountPaise / 100).toString());
    }
    const mem = members.find(m => m.id === creditorId);
    const savedUpi = mem?.paymentMethod?.upiId || localStorage.getItem(`expenso_recipient_upi_${creditorId}`) || '';
    setRecipientUpi(savedUpi);
    setIsEditingUpi(!savedUpi);
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.to;
      delete copy.upi;
      return copy;
    });
  };

  const parsedAmountPaise = parseRupeesToPaise(amountStr) || 0;
  const fromMember = members.find(m => m.id === fromMemberId);
  const toMember = members.find(m => m.id === toMemberId);
  const currentDebt = userDebts.find(d => d.toMemberId === toMemberId);

  // Validate and construct UPI Deep Link
  const effectiveUpi = recipientUpi.trim();
  const hasValidUpi = isValidUpiId(effectiveUpi);

  const upiDeepLink = hasValidUpi && parsedAmountPaise > 0
    ? buildSafeUpiUri({
        pa: effectiveUpi,
        pn: toMember?.paymentMethod?.payeeName || toMember?.name || 'Friend',
        amPaise: parsedAmountPaise,
        tn: notes.trim() || `Expenso repayment - ${currentBlend?.name || 'Blend'}`,
      })
    : null;

  const handleApplyHandle = (handle: string) => {
    const current = recipientUpi.trim();
    if (!current) {
      setRecipientUpi(handle);
      return;
    }
    const atIdx = current.indexOf('@');
    if (atIdx >= 0) {
      setRecipientUpi(current.substring(0, atIdx) + handle);
    } else {
      setRecipientUpi(current + handle);
    }
  };

  const handleCopyUpi = () => {
    if (!effectiveUpi) return;
    navigator.clipboard.writeText(effectiveUpi);
    setCopiedUpi(true);
    showToast(`Copied UPI ID: ${effectiveUpi}`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot must be under 5MB', 'error');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Upload a PNG, JPG or WebP image', 'error');
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!parsedAmountPaise || parsedAmountPaise <= 0) {
      errs.amount = 'Please enter a valid amount greater than ₹0';
    } else if (currentDebt && parsedAmountPaise > currentDebt.amountPaise) {
      errs.amount = `Amount cannot exceed your debt of ${formatCurrency(currentDebt.amountPaise)}`;
    }

    if (!fromMemberId) {
      errs.from = 'Please select who made the repayment';
    }
    if (!toMemberId) {
      errs.to = 'Please select who received the repayment';
    } else if (!eligibleCreditorIds.includes(toMemberId)) {
      errs.to = 'You do not owe this member any money';
    }

    if (fromMemberId === toMemberId) {
      errs.to = 'The payer and receiver cannot be the same person';
    }

    if (paymentMode === 'upi') {
      if (!effectiveUpi) {
        errs.upi = `Please enter ${toMember?.name || 'recipient'}'s UPI ID to pay`;
      } else if (!hasValidUpi) {
        errs.upi = 'Invalid UPI ID format (e.g. 9876543210@paytm or name@okaxis)';
      }
    } else if (paymentMode === 'cash') {
      if (!cashConfirmed) {
        errs.cash = 'Please check the box confirming you handed cash in person';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Save recipient UPI to local cache if valid
      if (hasValidUpi && toMemberId) {
        try {
          localStorage.setItem(`expenso_recipient_upi_${toMemberId}`, effectiveUpi);
        } catch {
          // ignore localStorage error
        }
      }

      if (paymentMode === 'upi') {
        let finalNotes = notes.trim();
        if (utrNumber.trim()) {
          finalNotes = finalNotes ? `${finalNotes} · UPI Ref / UTR: ${utrNumber.trim()}` : `UPI Ref / UTR: ${utrNumber.trim()}`;
        }
        if (!finalNotes) {
          finalNotes = `UPI repayment to ${effectiveUpi}`;
        }

        // Submitting with status: 'proof_submitted' prevents fake debt clearing.
        // It notifies the recipient to review and confirm receipt!
        await recordSettlement({
          fromMemberId,
          toMemberId,
          amountPaise: parsedAmountPaise,
          date: new Date(dateTime).toISOString(),
          notes: finalNotes,
          status: 'proof_submitted',
          proofImageUrl: proofPreview || undefined,
        });
      } else {
        // Physical Cash Handover
        const cashNote = notes.trim()
          ? `[Cash Handed Over] ${notes.trim()}`
          : 'Cash repayment handed over in person';

        await recordSettlement({
          fromMemberId,
          toMemberId,
          amountPaise: parsedAmountPaise,
          date: new Date(dateTime).toISOString(),
          notes: cashNote,
          status: 'confirmed',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecordSettlementOpen) return null;

  // Case 1: User does not owe anyone anything (Lender or All Settled Up)
  if (!hasDebts) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-modal-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
        onClick={e => {
          if (e.target === e.currentTarget) closeRecordSettlement();
        }}
      >
        <div
          className="w-full sm:max-w-md bg-warm-50 border-t sm:border border-warm-200 sm:rounded-2xl shadow-modal max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 id="settlement-modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
                Repayment Status
              </h2>
            </div>
            <button
              onClick={closeRecordSettlement}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-subtle animate-pop-in">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-charcoal-900">
                You don't owe anything!
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 max-w-xs mx-auto">
                You have zero outstanding debt in {currentBlend?.name || 'this Blend'}. You are all settled up.
              </p>
            </div>

            {currentUserBalance.netBalancePaise > 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 text-left space-y-1.5 shadow-subtle">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>You are a lender (+{formatCurrency(currentUserBalance.netBalancePaise)})</span>
                </div>
                <p className="text-emerald-700 leading-relaxed text-[11px]">
                  Other members of this Blend currently owe you money. Repayments are only made by members who owe debts. When your friends transfer money to you, you will receive a notification to verify and confirm receipt.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-warm-100 border border-warm-200 text-xs text-charcoal-600">
                All shared commute rides and previous repayments are completely balanced out.
              </div>
            )}

            <button
              type="button"
              onClick={closeRecordSettlement}
              className="btn-action-primary w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl shadow-card text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) closeRecordSettlement();
      }}
    >
      <div
        className="w-full sm:max-w-md bg-warm-50 border-t sm:border border-warm-200 sm:rounded-2xl shadow-modal max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settlement-modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
                Record Repayment
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Pay real debt via UPI or Cash
              </p>
            </div>
          </div>
          <button
            onClick={closeRecordSettlement}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Transfer Summary Card */}
          <div className="bg-white border border-warm-200 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-subtle">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${fromMember?.avatarColor || 'bg-stone-300'}`}>
                {fromMember?.initials || '??'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-charcoal-900 truncate max-w-[85px]">{fromMember?.name}</p>
                <p className="text-[10px] text-charcoal-500">Payer (You)</p>
              </div>
            </div>

            <div className="flex flex-col items-center px-2 shrink-0">
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-black text-emerald-700 mt-0.5">
                {parsedAmountPaise > 0 ? formatCurrency(parsedAmountPaise) : 'Repaying'}
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="text-right min-w-0">
                <p className="font-semibold text-charcoal-900 truncate max-w-[85px]">{toMember?.name || 'Recipient'}</p>
                <p className="text-[10px] text-charcoal-500">Receiver</p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${toMember?.avatarColor || 'bg-stone-300'}`}>
                {toMember?.initials || '??'}
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="repayment-amount-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                Repayment Amount (₹)
              </label>
              {currentDebt && (
                <span className="text-[10px] font-bold text-charcoal-500 bg-warm-100 px-2 py-0.5 rounded border border-warm-200">
                  Debt owed: {formatCurrency(currentDebt.amountPaise)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-charcoal-400">
                ₹
              </span>
              <input
                id="repayment-amount-input"
                type="number"
                step="any"
                min="0.01"
                placeholder="0"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-4 py-2.5 text-2xl font-bold bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-subtle"
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-600 font-medium mt-1">{errors.amount}</p>}
          </div>

          {/* Recipient Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                Who are you repaying?
              </label>
              <span className="text-[10px] text-charcoal-500">
                Only friends you owe
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eligibleCreditors.map(member => {
                const debt = userDebts.find(d => d.toMemberId === member.id);
                const isSelected = toMemberId === member.id;
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => handleSelectCreditor(member.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600 shadow-subtle'
                        : 'border-warm-200 bg-white text-charcoal-700 hover:bg-warm-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${member.avatarColor}`}>
                        {member.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold leading-tight">{member.name}</p>
                        <p className="text-[10px] text-charcoal-500">
                          {debt ? `You owe: ${formatCurrency(debt.amountPaise)}` : 'Creditor'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
            {errors.to && <p className="text-xs text-rose-600 font-medium mt-1">{errors.to}</p>}
          </div>

          {/* Mode Switcher: UPI vs Cash */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2 bg-warm-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMode === 'upi'
                    ? 'bg-white text-emerald-900 shadow-subtle'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>⚡ Pay via UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-white text-charcoal-900 shadow-subtle'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-amber-700" />
                <span>💵 Cash Handed Over</span>
              </button>
            </div>
          </div>

          {/* MODE 1: UPI PAYMENT */}
          {paymentMode === 'upi' && (
            <div className="space-y-3.5 pt-1">
              {/* Recipient UPI ID Section */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                    {toMember?.name}&apos;s UPI ID
                  </span>
                  {hasValidUpi && !isEditingUpi && (
                    <button
                      type="button"
                      onClick={() => setIsEditingUpi(true)}
                      className="text-[11px] text-emerald-800 hover:underline font-semibold"
                    >
                      Edit UPI ID
                    </button>
                  )}
                </div>

                {/* If already has valid UPI and not editing */}
                {hasValidUpi && !isEditingUpi ? (
                  <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2.5">
                    <span className="font-mono font-bold text-xs text-charcoal-900 truncate">
                      {effectiveUpi}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Ready to Pay
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`Enter ${toMember?.name || 'recipient'}'s UPI ID (e.g. 9876543210@paytm)`}
                      value={recipientUpi}
                      onChange={e => setRecipientUpi(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 font-mono border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-subtle"
                    />

                    {/* Quick UPI Handle Chips */}
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-emerald-900 font-semibold mr-0.5">Quick handle:</span>
                      {COMMON_UPI_HANDLES.map(handle => (
                        <button
                          type="button"
                          key={handle}
                          onClick={() => handleApplyHandle(handle)}
                          className="px-2 py-0.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded font-medium transition-colors"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>

                    {isEditingUpi && hasValidUpi && (
                      <button
                        type="button"
                        onClick={() => setIsEditingUpi(false)}
                        className="text-[11px] text-emerald-800 font-bold hover:underline"
                      >
                        ✓ Done Editing
                      </button>
                    )}
                  </div>
                )}
                {errors.upi && <p className="text-xs text-rose-600 font-medium">{errors.upi}</p>}

                {/* REAL UPI REDIRECT BUTTON */}
                <div className="pt-1 space-y-2">
                  <a
                    href={upiDeepLink || '#'}
                    target="_self"
                    onClick={e => {
                      if (!hasValidUpi) {
                        e.preventDefault();
                        setErrors(prev => ({
                          ...prev,
                          upi: `Please provide a valid UPI ID for ${toMember?.name || 'the recipient'} first`,
                        }));
                      } else if (parsedAmountPaise <= 0) {
                        e.preventDefault();
                        setErrors(prev => ({
                          ...prev,
                          amount: 'Please enter a valid amount greater than ₹0',
                        }));
                      }
                    }}
                    className={`btn-action-primary group relative overflow-hidden flex items-center justify-center gap-2 w-full py-3 rounded-xl shadow-card text-xs font-black transition-all ${
                      hasValidUpi && parsedAmountPaise > 0
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                        : 'bg-warm-300 text-charcoal-400 cursor-not-allowed'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>
                      Pay {parsedAmountPaise > 0 ? formatCurrency(parsedAmountPaise) : ''} via UPI App (GPay / PhonePe / Paytm)
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  {/* App Compatibility Chips */}
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-charcoal-400">
                    <span>Redirects to:</span>
                    <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-600">GPay</span>
                    <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-600">PhonePe</span>
                    <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-600">Paytm</span>
                    <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-600">BHIM</span>
                  </div>

                  {/* Copy UPI & Show QR Code Tools */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      disabled={!hasValidUpi}
                      className="btn-action-secondary flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50 disabled:opacity-40"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied!' : 'Copy UPI ID'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      disabled={!hasValidUpi || parsedAmountPaise <= 0}
                      className={`btn-action-secondary flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11px] font-bold transition-all disabled:opacity-40 ${
                        showQrCode
                          ? 'bg-emerald-200 border-emerald-400 text-emerald-950'
                          : 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{showQrCode ? 'Hide QR Code' : 'Scan to Pay'}</span>
                    </button>
                  </div>

                  {/* Dynamic QR Code Viewer */}
                  {showQrCode && upiDeepLink && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col items-center justify-center space-y-2 text-center animate-pop-in">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeepLink)}`}
                        alt="UPI Payment QR Code"
                        className="w-36 h-36 object-contain rounded-lg border border-warm-200 p-1"
                      />
                      <p className="text-[10px] font-semibold text-charcoal-700">
                        Scan from mobile camera or Google Pay / PhonePe scanner to pay
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Proof & UTR Reference (Prevents Fake Debt Clearance) */}
              <div className="space-y-3 bg-white border border-warm-200 rounded-xl p-3.5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
                    Step 2: Submit Payment Reference / Proof
                  </h3>
                  <p className="text-[10px] text-charcoal-500">
                    To prevent false debt clearing, {toMember?.name} will verify your payment before debt is cleared.
                  </p>
                </div>

                {/* 12-digit UPI UTR / Transaction ID */}
                <div>
                  <label htmlFor="repayment-utr-input" className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                    UPI Reference / UTR Number (Optional)
                  </label>
                  <input
                    id="repayment-utr-input"
                    type="text"
                    placeholder="e.g. 431289012345 (12-digit UPI ref)"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-warm-50 text-charcoal-900 font-mono border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Payment Screenshot Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                    Payment Screenshot (Optional)
                  </label>
                  {proofPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-warm-200 max-h-32">
                      <img src={proofPreview} alt="Payment proof" className="w-full h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow-subtle hover:bg-white text-charcoal-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="modal-proof-upload"
                      className="flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-warm-300 hover:border-brand-500 hover:bg-brand-50/30 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-charcoal-400" />
                      <span className="text-[11px] font-semibold text-charcoal-600">
                        Upload screenshot (PNG, JPG)
                      </span>
                      <input
                        ref={fileInputRef}
                        id="modal-proof-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Notes Input */}
                <div>
                  <label htmlFor="repayment-notes-input" className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                    Note / Memo
                  </label>
                  <input
                    id="repayment-notes-input"
                    type="text"
                    placeholder="e.g. Sent via Google Pay"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-warm-50 text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Informational notice */}
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <p>
                  Clicking below submits this repayment as <strong>Pending Confirmation</strong>. {toMember?.name} will receive a notification to verify receipt and officially clear the debt.
                </p>
              </div>
            </div>
          )}

          {/* MODE 2: CASH PAYMENT */}
          {paymentMode === 'cash' && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Banknote className="w-4 h-4 text-amber-700" />
                  <span>Physical Cash Handover</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Use this when you handed actual physical currency directly to {toMember?.name} in person (e.g. at the metro gate, bus stand, or office).
                </p>
              </div>

              {/* Date & Time */}
              <div>
                <label htmlFor="cash-datetime-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                  Handover Date & Time
                </label>
                <input
                  id="cash-datetime-input"
                  type="datetime-local"
                  value={dateTime}
                  onChange={e => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Cash Handover Notes */}
              <div>
                <label htmlFor="cash-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                  Handover Location / Details
                </label>
                <input
                  id="cash-notes-input"
                  type="text"
                  placeholder="e.g. Given at Rajiv Chowk metro exit"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Mandatory Cash Attestation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-warm-300 bg-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cashConfirmed}
                  onChange={e => setCashConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-warm-300"
                />
                <span className="text-xs text-charcoal-800 font-medium leading-tight">
                  I confirm that I personally handed over <strong>{formatCurrency(parsedAmountPaise)}</strong> in physical cash to <strong>{toMember?.name}</strong>.
                </span>
              </label>
              {errors.cash && <p className="text-xs text-rose-600 font-medium">{errors.cash}</p>}

              <p className="text-[11px] text-charcoal-500 bg-warm-100 p-2.5 rounded-lg border border-warm-200">
                Notice: {toMember?.name} will receive a notification that a cash repayment was recorded so they can balance their books.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-warm-50 py-2 border-t border-warm-200">
            <button
              type="button"
              onClick={closeRecordSettlement}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-card transition-all flex items-center justify-center gap-2 ${
                paymentMode === 'upi'
                  ? 'bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50'
                  : 'bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : paymentMode === 'upi' ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Submit Payment & Notify {toMember?.name || 'Friend'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm Cash Repayment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
