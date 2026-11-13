import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { TransportCategory } from '../../types';
import { TRANSPORT_LIST } from '../../utils/transport';
import { calculateEqualShares } from '../../utils/calculations';
import { formatCurrency, parseRupeesToPaise } from '../../utils/currency';
import { TransportIcon } from '../common/TransportIcon';
import { X, Check, Users, ShieldCheck, Loader2 } from 'lucide-react';

export const EditExpenseModal: React.FC = () => {
  const {
    editingExpense,
    closeEditExpense,
    members,
    currentUser,
    updateExpense,
  } = useApp();

  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransportCategory>('metro');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setAmountStr((editingExpense.amountPaise / 100).toString());
      setDescription(editingExpense.description);
      setCategory(editingExpense.category);
      setSelectedParticipants(editingExpense.participantIds);
      try {
        const d = new Date(editingExpense.date);
        const offset = d.getTimezoneOffset() * 60000;
        setDateTime(new Date(d.getTime() - offset).toISOString().slice(0, 16));
      } catch {
        setDateTime('');
      }
      setNotes(editingExpense.notes || '');
      setErrors({});
    }
  }, [editingExpense]);

  const parsedAmountPaise = useMemo(() => {
    return parseRupeesToPaise(amountStr) || 0;
  }, [amountStr]);

  const liveShares = useMemo(() => {
    if (parsedAmountPaise <= 0 || selectedParticipants.length === 0) return {};
    return calculateEqualShares(parsedAmountPaise, selectedParticipants);
  }, [parsedAmountPaise, selectedParticipants]);

  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length === 1) return;
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
    if (isSubmitting || !editingExpense || !validate()) return;

    setIsSubmitting(true);
    try {
      await updateExpense(editingExpense.id, {
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

  if (!editingExpense) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) closeEditExpense();
      }}
    >
      <div
        className="w-full sm:max-w-xl bg-warm-50 border-t sm:border border-warm-200 sm:rounded-2xl shadow-modal max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-white shrink-0">
          <h2 id="edit-modal-title" className="text-base sm:text-lg font-bold text-charcoal-900 leading-none">
            Edit Expense
          </h2>
          <button
            onClick={closeEditExpense}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Payer is strictly the creator */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Paid by: {currentUser.fullName} (You)
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              Creator
            </span>
          </div>

          <div>
            <label htmlFor="edit-amount-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-charcoal-400">
                ₹
              </span>
              <input
                id="edit-amount-input"
                type="number"
                step="any"
                min="0.01"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xl font-bold bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 shadow-subtle"
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-600 font-medium mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Transport Mode
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TRANSPORT_LIST.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                    category === item.id
                      ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-600 shadow-subtle'
                      : 'border-warm-200 bg-white text-charcoal-700 hover:bg-warm-100'
                  }`}
                >
                  <TransportIcon category={item.id} size="sm" className="mb-1" />
                  <span className="text-[11px] truncate w-full">{item.badgeLabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="edit-description-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1.5">
              Description <span className="text-charcoal-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="edit-description-input"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white text-charcoal-900 border border-warm-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-600 shadow-subtle"
            />
            {errors.description && <p className="text-xs text-rose-600 font-medium mt-1">{errors.description}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                Split Between <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedParticipants(members.map(m => m.id))}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                Everyone
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
                        : 'border-warm-200 bg-white text-charcoal-500 opacity-60'
                    }`}
                  >
                    <span className="text-xs truncate">{member.name}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-700 border-brand-700 text-white' : 'border-warm-300 bg-white'}`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {parsedAmountPaise > 0 && selectedParticipants.length > 0 && (
            <div className="bg-white border border-brand-200 rounded-xl p-3 shadow-subtle space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold pb-1.5 border-b border-warm-200">
                <span>Calculated Share</span>
                <span className="text-brand-800">{formatCurrency(Math.floor(parsedAmountPaise / selectedParticipants.length))} / person</span>
              </div>
              {selectedParticipants.map(pid => {
                const member = members.find(m => m.id === pid);
                return (
                  <div key={pid} className="flex justify-between text-charcoal-600">
                    <span>{member?.name || pid}</span>
                    <span>{formatCurrency(liveShares[pid] || 0)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 pt-1 border-t border-warm-200">
            <div>
              <label htmlFor="edit-datetime-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Date & Time
              </label>
              <input
                id="edit-datetime-input"
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div>
              <label htmlFor="edit-notes-input" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                Notes
              </label>
              <textarea
                id="edit-notes-input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-warm-50 py-2 border-t border-warm-200">
            <button
              type="button"
              onClick={closeEditExpense}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-card transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
