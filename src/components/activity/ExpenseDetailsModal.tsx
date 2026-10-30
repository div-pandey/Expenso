import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';
import { getTransportConfig } from '../../utils/transport';
import { TransportIcon } from '../common/TransportIcon';
import { ConfirmDialog } from '../forms/ConfirmDialog';
import { X, Edit3, Trash2, Calendar, FileText, CheckCircle2, Lock } from 'lucide-react';

export const ExpenseDetailsModal: React.FC = () => {
  const {
    viewingExpense,
    closeExpenseDetails,
    openEditExpense,
    deleteExpense,
    members,
    currentUser,
  } = useApp();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!viewingExpense) return null;

  const transportConfig = getTransportConfig(viewingExpense.category);
  const payer = members.find(m => m.id === viewingExpense.payerId);
  const isCreator = viewingExpense.createdBy === currentUser.id;

  const handleDelete = async () => {
    await deleteExpense(viewingExpense.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in"
        onClick={e => {
          if (e.target === e.currentTarget) closeExpenseDetails();
        }}
      >
        <div
          className="w-full sm:max-w-md bg-warm-50 border-t sm:border border-warm-200 sm:rounded-2xl shadow-modal max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-warm-200 bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Commute Ride Breakdown
            </span>
            <button
              onClick={closeExpenseDetails}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 hover:bg-warm-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-5 space-y-4">
            {/* Main Hero Summary */}
            <div className="bg-white border border-warm-200 rounded-2xl p-4 shadow-subtle flex items-start gap-3.5">
              <TransportIcon category={viewingExpense.category} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${transportConfig.bgClass} ${transportConfig.textClass} ${transportConfig.borderClass}`}>
                    {transportConfig.badgeLabel}
                  </span>
                </div>
                <h3 id="details-title" className="text-base font-bold text-charcoal-900 leading-tight">
                  {viewingExpense.description}
                </h3>
                <p className="text-xl font-black text-brand-800 mt-1">
                  {formatCurrency(viewingExpense.amountPaise)}
                </p>
              </div>
            </div>

            {/* Payer and Date Info */}
            <div className="bg-white border border-warm-200 rounded-xl p-3.5 shadow-subtle space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-warm-100">
                <span className="text-charcoal-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  Paid By (Creator)
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-charcoal-900">
                  <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${payer?.avatarColor || 'bg-stone-300'}`}>
                    {payer?.initials || '??'}
                  </div>
                  <span>{payer?.name} {isCreator && '(You)'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-charcoal-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                  Date & Time
                </span>
                <span className="font-medium text-charcoal-800">
                  {formatDateTime(viewingExpense.date)}
                </span>
              </div>

              {viewingExpense.notes && (
                <div className="pt-2 border-t border-warm-100 text-charcoal-600 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                  <p className="italic">{viewingExpense.notes}</p>
                </div>
              )}
            </div>

            {/* Participant Shares Breakdown */}
            <div className="bg-white border border-warm-200 rounded-xl p-3.5 shadow-subtle space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-warm-100 font-bold text-charcoal-700">
                <span>Split Among ({viewingExpense.participantIds.length} members)</span>
                <span>Share</span>
              </div>
              <div className="space-y-2 text-xs">
                {viewingExpense.participantIds.map(pid => {
                  const member = members.find(m => m.id === pid);
                  const sharePaise = viewingExpense.shares[pid] || 0;
                  const isPayer = pid === viewingExpense.payerId;

                  return (
                    <div key={pid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center ${member?.avatarColor || 'bg-stone-300'}`}>
                          {member?.initials || '??'}
                        </div>
                        <span className="font-medium text-charcoal-800">
                          {member?.name || pid} {pid === currentUser.id && '(You)'}
                        </span>
                        {isPayer && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-1.5 py-0.2 rounded border border-emerald-200">
                            Payer
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-charcoal-900">
                        {formatCurrency(sharePaise)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ownership Security Notice */}
            {!isCreator && (
              <div className="bg-warm-100/80 border border-warm-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-charcoal-600">
                <Lock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                <span>Only the payer ({payer?.name}) can edit or delete this expense.</span>
              </div>
            )}
          </div>

          {/* Actions (Only visible to the authenticated creator!) */}
          <div className="p-4 bg-white border-t border-warm-200 flex items-center justify-between gap-3 shrink-0">
            {isCreator ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => {
                    closeExpenseDetails();
                    openEditExpense(viewingExpense);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-charcoal-700 hover:text-charcoal-900 hover:bg-warm-100 rounded-xl border border-warm-300 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </>
            ) : (
              <button
                onClick={closeExpenseDetails}
                className="w-full py-2 text-xs font-bold text-charcoal-700 hover:bg-warm-100 rounded-xl border border-warm-300 transition-colors"
              >
                Close Breakdown
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Expense?"
        message={`Are you sure you want to delete "${viewingExpense.description}" (${formatCurrency(viewingExpense.amountPaise)})? All friend balances in this Blend will be recalculated.`}
        confirmLabel="Delete Expense"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
