import React, { useState } from 'react';
import type { Settlement } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';
import { ShieldCheck, ArrowRight, Trash2 } from 'lucide-react';

interface RepaymentItemProps {
  settlement: Settlement;
}

export const RepaymentItem: React.FC<RepaymentItemProps> = ({ settlement }) => {
  const { members, currentUser, deleteSettlement } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const fromMember = members.find(m => m.id === settlement.fromMemberId);
  const toMember = members.find(m => m.id === settlement.toMemberId);

  const isSender = settlement.fromMemberId === currentUser.id;
  const isReceiver = settlement.toMemberId === currentUser.id;
  const isCreator = settlement.createdBy === currentUser.id;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this recorded repayment? All member balances will automatically recalculate.')) {
      setIsDeleting(true);
      try {
        await deleteSettlement(settlement.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="w-full flex items-center justify-between p-3.5 bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-200/80 rounded-xl transition-all shadow-subtle">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
          <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-charcoal-900 truncate">
              {fromMember?.name} {isSender && '(You)'}
            </span>
            <span className="text-xs text-charcoal-400 flex items-center gap-0.5 font-medium">
              paid <ArrowRight className="w-3 h-3 text-emerald-600 inline" />
            </span>
            <span className="text-sm font-bold text-charcoal-900 truncate">
              {toMember?.name} {isReceiver && '(You)'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-emerald-100 text-emerald-800 border-emerald-300">
              Repayment
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mt-0.5 truncate">
            {settlement.notes && <span>{settlement.notes}</span>}
            {settlement.notes && <span>·</span>}
            <span className="text-charcoal-400">{formatDateTime(settlement.date)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-3 shrink-0">
        <div className="text-right">
          <span className="text-sm sm:text-base font-black text-emerald-800 block leading-tight">
            {formatCurrency(settlement.amountPaise)}
          </span>
          <span className="text-[11px] text-charcoal-500 font-medium block">
            {isSender ? (
              <span className="text-emerald-700">You paid back</span>
            ) : isReceiver ? (
              <span className="text-emerald-700">You received</span>
            ) : (
              <span>Direct transfer</span>
            )}
          </span>
        </div>

        {isCreator && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-charcoal-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete this repayment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

