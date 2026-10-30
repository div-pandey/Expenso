import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, parseRupeesToPaise } from '../../utils/currency';
import { getCurrentDateTimeLocal } from '../../utils/dates';
import { buildSafeUpiUri } from '../../utils/upi';
import {
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ExternalLink,
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
  } = useApp();

  const [fromMemberId, setFromMemberId] = useState<string>('');
  const [toMemberId, setToMemberId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [dateTime, setDateTime] = useState<string>(getCurrentDateTimeLocal());
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debts where currentUser is the debtor (owes money to someone)
  const userDebts = suggestedSettlements.filter(s => s.fromMemberId === currentUser.id);
  const eligibleCreditorIds = userDebts.map(s => s.toMemberId);
  const eligibleCreditors = members.filter(m => eligibleCreditorIds.includes(m.id));
  const hasDebts = eligibleCreditors.length > 0;

  useEffect(() => {
    if (isRecordSettlementOpen) {
      setFromMemberId(currentUser.id);
      if (hasDebts) {
        // If settlementPreset is provided and recipient is an eligible creditor, use it
        let defaultToId = '';
        let initialAmountPaise = 0;

        if (settlementPreset?.toId && eligibleCreditorIds.includes(settlementPreset.toId)) {
          defaultToId = settlementPreset.toId;
          const debt = userDebts.find(d => d.toMemberId === defaultToId);
          initialAmountPaise = settlementPreset.amountPaise || debt?.amountPaise || 0;
        } else if (settlementPreset?.fromId && eligibleCreditorIds.includes(settlementPreset.fromId)) {
          defaultToId = settlementPreset.fromId;
          const debt = userDebts.find(d => d.toMemberId === defaultToId);
          initialAmountPaise = settlementPreset.amountPaise || debt?.amountPaise || 0;
        } else {
          // Default to the first creditor the user owes
          defaultToId = eligibleCreditors[0]?.id || '';
          const debt = userDebts.find(d => d.toMemberId === defaultToId);
          initialAmountPaise = debt?.amountPaise || 0;
        }

        setToMemberId(defaultToId);
        setAmountStr(initialAmountPaise > 0 ? (initialAmountPaise / 100).toString() : '');
      } else {
        setToMemberId('');
        setAmountStr('');
      }

      setDateTime(getCurrentDateTimeLocal());
      setNotes('UPI / Cash repayment');
      setErrors({});
    }
  }, [isRecordSettlementOpen, settlementPreset, members, currentUser, suggestedSettlements, hasDebts]);

  const parsedAmountPaise = parseRupeesToPaise(amountStr) || 0;

  const fromMember = members.find(m => m.id === fromMemberId);
  const toMember = members.find(m => m.id === toMemberId);
  const currentDebt = userDebts.find(d => d.toMemberId === toMemberId);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    recordSettlement({
      fromMemberId,
      toMemberId,
      amountPaise: parsedAmountPaise,
      date: new Date(dateTime).toISOString(),
      notes: notes.trim() ? notes.trim() : undefined,
    });
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
                  Other members of this Blend currently owe you money. Repayments are only made by members who owe debts. When your friends transfer money to you, you will receive a notification to verify and confirm it.
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

  // Case 2: User owes money to 1 or more members
  const hasUpi = !!toMember?.paymentMethod?.upiId;
  const upiDeepLink = hasUpi && toMember?.paymentMethod?.upiId && parsedAmountPaise > 0
    ? buildSafeUpiUri({
        pa: toMember.paymentMethod.upiId,
        pn: toMember.paymentMethod.payeeName,
        amPaise: parsedAmountPaise,
        tn: `Expenso repayment - ${currentBlend?.name || 'Blend'}`,
      })
    : null;

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
            <div>
              <h2 id="settlement-modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
                Record Repayment
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Clear outstanding balance with friends
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
          {/* Transfer Flow Banner */}
          <div className="bg-white border border-warm-200 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-subtle">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${fromMember?.avatarColor || 'bg-stone-300'}`}>
                {fromMember?.initials || '??'}
              </div>
              <div>
                <p className="font-semibold text-charcoal-900 truncate max-w-[90px]">{fromMember?.name}</p>
                <p className="text-[10px] text-charcoal-500">Payer (You)</p>
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                {parsedAmountPaise > 0 ? formatCurrency(parsedAmountPaise) : 'Repaying'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold text-charcoal-900 truncate max-w-[90px]">{toMember?.name || 'Recipient'}</p>
                <p className="text-[10px] text-charcoal-500">Receiver</p>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${toMember?.avatarColor || 'bg-stone-300'}`}>
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

          {/* Recipient Selection: ONLY show members currentUser actually owes */}
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

          {/* Direct UPI Payment Box if recipient has a registered UPI ID */}
          {hasUpi && upiDeepLink && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  Pay via UPI App
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {toMember?.paymentMethod?.upiId}
                </span>
              </div>
              <a
                href={upiDeepLink}
                target="_self"
                className="btn-action-primary flex items-center justify-center gap-2 w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-card"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open in UPI App ({formatCurrency(parsedAmountPaise)})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-75" />
              </a>
              <p className="text-[10px] text-charcoal-500 text-center">
                Payment is locked to {toMember?.name}'s verified UPI ID. After paying, click below to confirm.
              </p>
            </div>
          )}

          {/* Date & Note */}
          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="repayment-datetime-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Date & Time
              </label>
              <input
                id="repayment-datetime-input"
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="repayment-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Note / Payment Mode
              </label>
              <input
                id="repayment-notes-input"
                type="text"
                placeholder="e.g. GPay UPI, Cash at Metro Gate"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Notice */}
          <p className="text-[11px] text-charcoal-500 bg-warm-100 p-2.5 rounded-lg border border-warm-200">
            Note: This records that money was settled between friends without altering previous ride history.
          </p>

          <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-warm-50 py-2 border-t border-warm-200">
            <button
              type="button"
              onClick={closeRecordSettlement}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-card transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirm Repayment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
