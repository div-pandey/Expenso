import React from 'react';
import type { Expense } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';
import { getTransportConfig } from '../../utils/transport';
import { TransportIcon } from '../common/TransportIcon';
import { ChevronRight } from 'lucide-react';

interface ExpenseItemProps {
  expense: Expense;
  onClick?: () => void;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onClick }) => {
  const { members, currentUser, openExpenseDetails } = useApp();
  const config = getTransportConfig(expense.category);
  const payer = members.find(m => m.id === expense.payerId);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openExpenseDetails(expense);
    }
  };

  const isUserPayer = expense.payerId === currentUser.id;
  const userSharePaise = expense.shares[currentUser.id] || 0;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group w-full flex items-center justify-between p-3.5 bg-white hover:bg-warm-50/80 border border-warm-200/80 rounded-xl transition-all cursor-pointer active:scale-[0.99] shadow-subtle focus:outline-none focus:ring-2 focus:ring-brand-600"
    >
      <div className="flex items-center gap-3 min-w-0">
        <TransportIcon category={expense.category} size="md" />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-charcoal-900 truncate">
              {expense.description}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${config.bgClass} ${config.textClass} ${config.borderClass}`}
            >
              {config.badgeLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mt-0.5 truncate">
            <span>Paid by {isUserPayer ? 'You' : payer?.name}</span>
            <span>·</span>
            <span>Shared by {expense.participantIds.length}</span>
            <span>·</span>
            <span className="text-charcoal-400">{formatDateTime(expense.date)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 shrink-0">
        <div className="text-right">
          <span className="text-sm sm:text-base font-bold text-charcoal-900 block leading-tight">
            {formatCurrency(expense.amountPaise)}
          </span>
          {userSharePaise > 0 && (
            <span className="text-[11px] text-charcoal-500 font-medium block">
              {isUserPayer ? (
                <span className="text-emerald-700">You lent {formatCurrency(expense.amountPaise - userSharePaise)}</span>
              ) : (
                <span className="text-amber-700">Your share {formatCurrency(userSharePaise)}</span>
              )}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};
