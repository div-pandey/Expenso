import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { TransportCategory } from '../../types';
import { TRANSPORT_LIST, getTransportConfig } from '../../utils/transport';
import { calculateEqualShares } from '../../utils/calculations';
import { formatCurrency, parseRupeesToPaise } from '../../utils/currency';
import { getCurrentDateTimeLocal } from '../../utils/dates';
import { TransportIcon } from '../common/TransportIcon';
import { X, Check, Users, ShieldCheck, Loader2 } from 'lucide-react';

export const AddExpenseModal: React.FC = () => {
  const {
    isAddExpenseOpen,
    closeAddExpense,
    members,
    currentUser,
    currentBlend,
    addExpense,
  } = useApp();

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransportCategory>('metro');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [dateTime, setDateTime] = useState(getCurrentDateTimeLocal());
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset defaults when modal opens
  useEffect(() => {
    if (isAddExpenseOpen) {
      setAmountStr('');
      setDescription('');
      setCategory('metro');
      // Default: all members in current blend selected
      setSelectedParticipants(members.map(m => m.id));
      setDateTime(getCurrentDateTimeLocal());
      setNotes('');
      setShowNotes(false);
      setErrors({});
    }
  }, [isAddExpenseOpen, members]);

  const quickAmounts = [30, 60, 90, 120, 150, 200];
  const activeTransportConfig = getTransportConfig(category);

  const parsedAmountPaise = useMemo(() => {
    return parseRupeesToPaise(amountStr) || 0;
  }, [amountStr]);

  const liveShares = useMemo(() => {
    if (parsedAmountPaise <= 0 || selectedParticipants.length === 0) return {};
    return calculateEqualShares(parsedAmountPaise, selectedParticipants);
  }, [parsedAmountPaise, selectedParticipants]);

  const isEveryoneSelected = selectedParticipants.length === members.length;

  const toggleSelectAll = () => {
    if (isEveryoneSelected) {
      setSelectedParticipants([currentUser.id]);
    } else {
      setSelectedParticipants(members.map(m => m.id));
    }
  };

  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length === 1) return; // At least one participant
      setSelectedParticipants(selectedParticipants.filter(id => id !== memberId));
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!parsedAmountPaise || parsedAmountPaise <= 0) {
      errs.amount = 'Please enter a valid amount greater than ₹0';
    }
    if (selectedParticipants.length === 0) {
      errs.participants = 'Please select at least one participant';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !validate()) return;

    setIsSubmitting(true);
    try {
      await addExpense({
        description: description.trim(),
        amountPaise: parsedAmountPaise,
        category,
        participantIds: selectedParticipants,
        date: new Date(dateTime).toISOString(),
        notes: notes.trim() ? notes.trim() : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAddExpenseOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) closeAddExpense();
      }}
    >
      <div
        className="w-full sm:max-w-xl bg-warm-50 border-t sm:border border-warm-200 sm:rounded-2xl shadow-modal max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h2 id="modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
                Record My Commute Expense
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Blend: <strong>{currentBlend?.name || 'Default'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={closeAddExpense}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
          {/* Authenticated Payer Identity Banner (Enforces Requirement 4: No Payer Selection) */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${currentUser.avatarColor}`}>
                {currentUser.initials}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-950">
                    Paid by: {currentUser.fullName} (You)
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <span className="text-[11px] text-emerald-800">
                  Expenses are always recorded by the member who paid
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Verified
            </span>
          </div>

          {/* Amount Input with Currency Hero Display */}
          <div>
            <label htmlFor="amount-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Expense Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-charcoal-400">
                ₹
              </span>
              <input
                id="amount-input"
                type="number"
                step="any"
                min="0.01"
                placeholder="0"
                value={amountStr}
                onChange={e => {
                  setAmountStr(e.target.value);
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                }}
                autoFocus
                className="w-full pl-11 pr-4 py-3 text-2xl font-bold bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all placeholder:text-charcoal-300 shadow-subtle"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-600 font-medium mt-1.5">{errors.amount}</p>
            )}

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {quickAmounts.map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => {
                    setAmountStr(val.toString());
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    amountStr === val.toString()
                      ? 'bg-brand-700 text-white border-brand-700 shadow-subtle'
                      : 'bg-white text-charcoal-700 border-warm-200 hover:border-warm-300 hover:bg-warm-100'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Transport Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Transport Mode
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TRANSPORT_LIST.map(item => {
                const isSelected = category === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setCategory(item.id);
                      if (!description && item.quickDescriptions.length > 0) {
                        setDescription(item.quickDescriptions[0]);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-600 shadow-subtle'
                        : 'border-warm-200 bg-white text-charcoal-700 hover:bg-warm-100 hover:border-warm-300'
                    }`}
                  >
                    <TransportIcon category={item.id} size="sm" className="mb-1" />
                    <span className="text-[11px] truncate w-full">{item.badgeLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Description <span className="text-charcoal-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="description-input"
              type="text"
              placeholder="e.g. Metro tickets, Morning auto, Cab home"
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all placeholder:text-charcoal-400 shadow-subtle"
            />
            {errors.description && (
              <p className="text-xs text-rose-600 font-medium mt-1.5">{errors.description}</p>
            )}

            {/* Quick description suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-charcoal-500 font-medium">
                Suggestions:
              </span>
              {activeTransportConfig.quickDescriptions.map(suggestion => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => {
                    setDescription(suggestion);
                    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  className="text-[11px] bg-white border border-warm-200 px-2 py-0.5 rounded-md text-charcoal-600 hover:text-charcoal-900 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Flexible Participant Selection (Requirement 5) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                Who Shared This Ride? <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                {isEveryoneSelected ? 'Deselect others' : 'Everyone in Blend'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map(member => {
                const isSelected = selectedParticipants.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    onClick={() => toggleParticipant(member.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-warm-200 bg-white text-charcoal-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${member.avatarColor}`}
                      >
                        {member.initials}
                      </div>
                      <span className="text-xs truncate">
                        {member.name} {member.isCurrentUser && '(You)'}
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-brand-700 border-brand-700 text-white'
                          : 'border-warm-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.participants && (
              <p className="text-xs text-rose-600 font-medium mt-1.5">{errors.participants}</p>
            )}
          </div>

          {/* Live Calculation Preview Card */}
          {parsedAmountPaise > 0 && selectedParticipants.length > 0 && (
            <div className="bg-white border border-brand-200 rounded-xl p-3.5 shadow-subtle space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-warm-200">
                <span className="text-charcoal-600 font-medium">
                  Split method: <strong className="text-charcoal-900">Equal split ({selectedParticipants.length} people)</strong>
                </span>
                <span className="font-bold text-brand-800 text-sm">
                  {formatCurrency(Math.floor(parsedAmountPaise / selectedParticipants.length))} / person
                </span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                {selectedParticipants.map(pid => {
                  const member = members.find(m => m.id === pid);
                  if (!member) return null;
                  const sharePaise = liveShares[pid] || 0;
                  const isYou = pid === currentUser.id;

                  return (
                    <div key={pid} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-charcoal-800">
                          {member.name} {isYou && '(You)'}
                        </span>
                        {isYou && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                            You Paid
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-charcoal-700 font-medium">
                          Share: {formatCurrency(sharePaise)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date, Time & Optional Notes */}
          <div className="space-y-3 pt-1 border-t border-warm-200">
            <div>
              <label htmlFor="datetime-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Date & Time
              </label>
              <input
                id="datetime-input"
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>

            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-xs text-brand-700 hover:text-brand-800 font-medium flex items-center gap-1"
              >
                + Add optional note
              </button>
            ) : (
              <div>
                <label htmlFor="notes-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes-input"
                  rows={2}
                  placeholder="e.g. Yellow line from Central Secretariat"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600 placeholder:text-charcoal-400"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-warm-50 py-2 border-t border-warm-200">
            <button
              type="button"
              onClick={closeAddExpense}
              className="btn-action-secondary px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-action-primary group flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-card flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform duration-200" />
                  <span>Save Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
