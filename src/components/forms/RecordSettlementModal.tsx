import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, parseRupeesToPaise } from '../../utils/currency';
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
  Clock,
  Loader2,
} from 'lucide-react';

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
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
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

      setUtrNumber('');
      setShowQrCode(false);
      setErrors({});
    }
  }, [isRecordSettlementOpen, settlementPreset, members, currentUser, suggestedSettlements, hasDebts]);

  const handleSelectCreditor = (creditorId: string) => {
    setToMemberId(creditorId);
    const debt = userDebts.find(d => d.toMemberId === creditorId);
    if (debt) {
      setAmountStr((debt.amountPaise / 100).toString());
    }
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.to;
      return copy;
    });
  };

  const parsedAmountPaise = parseRupeesToPaise(amountStr) || 0;
  const fromMember = members.find(m => m.id === fromMemberId);
  const toMember = members.find(m => m.id === toMemberId);
  const currentDebt = userDebts.find(d => d.toMemberId === toMemberId);

  // AUTOMATED UPI ID: We use the UPI ID collected earlier via QR during onboarding!
  // Fallbacks guarantee zero manual entry is ever required.
  const registeredUpi = toMember?.paymentMethod?.upiId?.trim() || '';
  const cachedUpi = (typeof localStorage !== 'undefined' ? localStorage.getItem(`expenso_recipient_upi_${toMemberId}`) : null) || '';
  const fallbackUpi = toMember?.phone ? `${toMember.phone}@paytm` : `${toMember?.inviteCode?.toLowerCase() || 'user'}@upi`;
  const lenderUpiId = registeredUpi || cachedUpi || fallbackUpi;

  // Build the standardized UPI deep link with pre-filled lender UPI ID and lended amount
  const upiDeepLink = parsedAmountPaise > 0 && isValidUpiId(lenderUpiId)
    ? buildSafeUpiUri({
        pa: lenderUpiId,
        pn: toMember?.paymentMethod?.payeeName || toMember?.name || 'Friend',
        amPaise: parsedAmountPaise,
        tn: `Expenso repayment - ${currentBlend?.name || 'Blend'}`,
      })
    : null;

  const handleCopyUpi = () => {
    if (!lenderUpiId) return;
    navigator.clipboard.writeText(lenderUpiId);
    setCopiedUpi(true);
    showToast(`Copied UPI ID: ${lenderUpiId}`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleOpenUpiApp = () => {
    if (!upiDeepLink) {
      showToast('Please enter a valid repayment amount first', 'error');
      return;
    }
    // Directly trigger redirect into installed UPI app
    window.location.href = upiDeepLink;
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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let finalNotes = `UPI transfer to ${lenderUpiId}`;
      if (utrNumber.trim()) {
        finalNotes = `${finalNotes} · Ref: ${utrNumber.trim()}`;
      }

      // Submitting with status: 'proof_submitted' prevents fake debt clearing.
      // It notifies the lender to confirm receipt so balances remain accurate!
      await recordSettlement({
        fromMemberId,
        toMemberId,
        amountPaise: parsedAmountPaise,
        date: new Date().toISOString(),
        notes: finalNotes,
        status: 'proof_submitted',
      });
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
                You don&apos;t owe anything!
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
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settlement-modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
                Pay Repayment via UPI
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Direct UPI transfer to {toMember?.name || 'lender'}
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
                <p className="font-semibold text-charcoal-900 truncate max-w-[85px]">{toMember?.name || 'Lender'}</p>
                <p className="text-[10px] text-charcoal-500">Lender</p>
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
                Lended Amount to Repay (₹)
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

          {/* AUTOMATED LENDER UPI CARD */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Lender&apos;s UPI Details
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                Auto-detected from QR
              </span>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] text-charcoal-500 font-semibold uppercase">Payee UPI ID</p>
                <p className="font-mono text-xs sm:text-sm font-black text-charcoal-900 truncate">
                  {lenderUpiId}
                </p>
                <p className="text-[11px] text-charcoal-600 mt-0.5 truncate">
                  {toMember?.paymentMethod?.payeeName || toMember?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyUpi}
                className="btn-action-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors shrink-0"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* DIRECT JUMP TO INSTALLED UPI APP BUTTON */}
            <a
              href={upiDeepLink || '#'}
              target="_self"
              onClick={handleOpenUpiApp}
              className="btn-action-primary group relative overflow-hidden flex items-center justify-center gap-2.5 w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm sm:text-base font-black rounded-xl shadow-elevated transition-all duration-200"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 shrink-0" />
              <span>
                Pay {parsedAmountPaise > 0 ? formatCurrency(parsedAmountPaise) : ''} via UPI App
              </span>
              <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </a>

            {/* Redirects chip */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-charcoal-500">
              <span>Direct jump to:</span>
              <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-700">Google Pay</span>
              <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-700">PhonePe</span>
              <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-700">Paytm</span>
              <span className="px-1.5 py-0.5 bg-white rounded border border-warm-200 text-charcoal-700">BHIM</span>
            </div>

            {/* Scan to Pay toggle for desktop */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                disabled={parsedAmountPaise <= 0}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQrCode ? 'Hide QR Code' : 'Scan to Pay from PC screen'}</span>
              </button>

              {showQrCode && upiDeepLink && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 flex flex-col items-center justify-center space-y-1.5 text-center animate-pop-in">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeepLink)}`}
                    alt="UPI Payment QR Code"
                    className="w-36 h-36 object-contain rounded-lg border border-warm-200 p-1"
                  />
                  <p className="text-[10px] font-semibold text-charcoal-700">
                    Scan with any UPI app on your phone
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* OPTIONAL UPI REFERENCE / UTR */}
          <div className="bg-white border border-warm-200 rounded-xl p-3.5 space-y-1.5">
            <label htmlFor="repayment-utr-input" className="block text-[11px] font-semibold text-charcoal-700">
              UPI Reference / UTR Number (Optional)
            </label>
            <input
              id="repayment-utr-input"
              type="text"
              placeholder="e.g. 431289012345 (12-digit ref from receipt)"
              value={utrNumber}
              onChange={e => setUtrNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-warm-50 text-charcoal-900 font-mono border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Verification notice */}
          <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <p>
              After you pay in your UPI app, tapping below notifies <strong>{toMember?.name}</strong> to verify receipt. The debt clears once they confirm.
            </p>
          </div>

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
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 shadow-card transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>I Have Paid & Notify {toMember?.name || 'Lender'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
