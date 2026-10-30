import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { getTimeOfDayGreeting } from '../../utils/dates';
import { ExpenseItem } from '../activity/ExpenseItem';
import type { PeriodFilter } from '../../types';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Sparkles,
  Receipt,
  Users,
  Copy,
  Check,
  UserPlus,
} from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    currentBlend,
    members,
    expenses,
    periodExpenses,
    periodFilter,
    setPeriodFilter,
    periodSpendPaise,
    currentUser,
    currentUserBalance,
    balances,
    suggestedSettlements,
    openAddExpense,
    openBlendModal,
    setActiveTab,
    showToast,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const greeting = getTimeOfDayGreeting();
  const netPaise = currentUserBalance.netBalancePaise;

  // If blend has only 1 member (just the current user), show Blend CTA instead of Add Expense
  const hasBlendFriends = members.length >= 2;

  const copyMyCode = () => {
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopiedCode(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const recentExpenses = expenses.slice(0, 5);

  const periods: { id: PeriodFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  // Category distribution for current period
  const categoryTotals: Record<string, number> = {};
  for (const exp of periodExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amountPaise;
  }
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Greeting and Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <p className="text-xs font-bold text-charcoal-400 tracking-wider uppercase">
              Blend: <strong className="text-charcoal-700">{currentBlend?.name || 'My Blend'}</strong>
            </p>
            <button
              onClick={openBlendModal}
              className="text-xs text-brand-700 font-bold hover:underline"
            >
              (Switch / Create)
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-charcoal-900 tracking-tight">
            {greeting}, {currentUser.fullName}
          </h1>
        </div>

        {/* Primary CTA — conditional on blend membership */}
        {hasBlendFriends ? (
          <button
            onClick={openAddExpense}
            className="btn-action-primary group w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-card transition-all"
          >
            <Plus className="w-5 h-5 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
            <span>Add My Expense</span>
          </button>
        ) : (
          <button
            onClick={openBlendModal}
            className="btn-action-primary group w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm sm:text-base rounded-2xl shadow-card transition-all"
          >
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            <span>Create / Join a Blend</span>
          </button>
        )}
      </div>

      {/* Quick Invite Code Banner */}
      <div className="bg-white border border-warm-200 rounded-3xl p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 shadow-subtle">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-bold text-charcoal-800">
                Your Personal Code:
              </span>
              <span className="font-mono text-base font-black text-brand-900 tracking-wider bg-brand-50 px-3 py-1 rounded-xl border border-brand-200/80">
                {currentUser.inviteCode}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Friends can enter this code in Expenso to connect and commute together.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={copyMyCode}
            className="btn-action-secondary group flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-charcoal-700 rounded-xl text-xs sm:text-sm font-bold border border-warm-200 transition-all"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-600 animate-pop-in" /> : <Copy className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            onClick={openBlendModal}
            className="btn-action-secondary flex-1 sm:flex-initial flex items-center justify-center px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs sm:text-sm font-bold border border-brand-200 transition-all"
          >
            Connect Friend
          </button>
        </div>
      </div>

      {/* Primary Financial Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Your Personal Net Balance Hero Card */}
        <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-4">
              <span>Your Net Position</span>
              {netPaise > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold border border-emerald-200 text-xs">
                  <ArrowDownLeft className="w-4 h-4" />
                  You are owed
                </span>
              ) : netPaise < 0 ? (
                <span className="inline-flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg font-semibold border border-rose-200 text-xs">
                  <ArrowUpRight className="w-4 h-4" />
                  You owe
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-charcoal-600 bg-warm-100 px-2.5 py-1 rounded-lg font-semibold text-xs">
                  <CheckCircle className="w-4 h-4 text-brand-600" />
                  All settled up
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1.5">
              <span
                className={`text-4xl sm:text-5xl font-black tracking-tight ${
                  netPaise > 0
                    ? 'text-emerald-700'
                    : netPaise < 0
                    ? 'text-rose-600'
                    : 'text-charcoal-800'
                }`}
              >
                {netPaise === 0
                  ? '₹0'
                  : formatCurrency(Math.abs(netPaise))}
              </span>
              <p className="text-xs sm:text-sm text-charcoal-600 font-medium">
                {netPaise > 0
                  ? 'Members of this Blend owe you this amount.'
                  : netPaise < 0
                  ? 'You owe this amount to your Blend members.'
                  : 'You have no outstanding commute debts.'}
              </p>
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-warm-100 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-charcoal-500 font-medium">
              Paid: {formatCurrency(currentUserBalance.totalPaidPaise)} · Share: {formatCurrency(currentUserBalance.totalSharePaise)}
            </span>
            <button
              onClick={() => setActiveTab('balances')}
              className="font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 hover:underline"
            >
              View Balances &rarr;
            </button>
          </div>
        </div>

        {/* Group Spending Summary Card with Period Selector */}
        <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-row items-center justify-between gap-2.5 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
                Blend Commute Spend
              </span>

              {/* Period Chips */}
              <div className="flex bg-warm-100 p-1 rounded-xl border border-warm-200 gap-1 shrink-0">
                {periods.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPeriodFilter(p.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      periodFilter === p.id
                        ? 'bg-white text-charcoal-900 shadow-subtle'
                        : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 space-y-1.5">
              <span className="text-4xl sm:text-5xl font-black text-charcoal-900 tracking-tight">
                {formatCurrency(periodSpendPaise)}
              </span>
              <p className="text-xs sm:text-sm text-charcoal-500">
                Total commute expenses for {periodExpenses.length} ride{periodExpenses.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="pt-5 mt-6 border-t border-warm-100">
            {topCategories.length > 0 ? (
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="text-charcoal-400 font-medium shrink-0">Top rides:</span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {topCategories.map(([cat, amt]) => (
                    <span
                      key={cat}
                      className="bg-warm-100 border border-warm-200 px-2.5 py-1 rounded-lg text-xs font-medium text-charcoal-700 shrink-0"
                    >
                      {cat.toUpperCase()}: <strong>{formatCurrency(amt)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-charcoal-400">No expenses recorded for this period</span>
            )}
          </div>
        </div>
      </div>

      {/* Blend Members Balance Strip */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-charcoal-500" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-charcoal-700">
              {currentBlend?.name || 'Blend'} Balances Summary ({members.length} members)
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('balances')}
            className="text-xs sm:text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
          >
            Settle balances &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => {
            const b = balances[member.id]?.netBalancePaise || 0;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-warm-200/90 bg-warm-50/60 transition-all hover:border-brand-200 hover:bg-warm-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-bold flex items-center justify-center shrink-0 shadow-subtle ${member.avatarColor}`}
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-charcoal-900 truncate">
                      {member.name} {member.isCurrentUser && '(You)'}
                    </p>
                    <p className="text-xs text-charcoal-500 truncate mt-0.5">
                      {b > 0 ? 'should receive' : b < 0 ? 'owes blend' : 'settled'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      b > 0
                        ? 'text-emerald-700'
                        : b < 0
                        ? 'text-rose-600'
                        : 'text-charcoal-600'
                    }`}
                  >
                    {b === 0
                      ? '₹0'
                      : (b > 0 ? '+' : '-') + formatCurrency(Math.abs(b))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {suggestedSettlements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-warm-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-50/70 p-4 sm:p-5 rounded-2xl border border-brand-200/80">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-brand-900">
              <Sparkles className="w-5 h-5 text-brand-700 shrink-0" />
              <span>
                <strong>{suggestedSettlements.length} settlement{suggestedSettlements.length === 1 ? '' : 's'} needed</strong> to clear all debts.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('balances')}
              className="w-full sm:w-auto text-center text-xs sm:text-sm font-bold text-brand-800 bg-white border border-brand-300 px-4 py-2.5 sm:py-2 rounded-xl hover:bg-brand-50 transition-colors shadow-subtle"
            >
              Review & Settle Up
            </button>
          </div>
        )}
      </div>

      {/* Recent Chronological Expenses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-charcoal-500" />
            <h2 className="text-base sm:text-lg font-bold text-charcoal-900">
              Recent Commute Rides
            </h2>
          </div>
          {expenses.length > 5 && (
            <button
              onClick={() => setActiveTab('activity')}
              className="text-xs sm:text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
            >
              See all ({expenses.length}) &rarr;
            </button>
          )}
        </div>

        {recentExpenses.length > 0 ? (
          <div className="space-y-3">
            {recentExpenses.map(expense => (
              <ExpenseItem key={expense.id} expense={expense} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-warm-200 rounded-3xl py-14 sm:py-16 px-8 sm:px-12 text-center shadow-subtle space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto shadow-subtle">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-charcoal-900">No commute expenses recorded in this Blend</h3>
              <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto leading-relaxed">
                {hasBlendFriends
                  ? 'Record your metro ride, auto fare, or cab split in less than 10 seconds.'
                  : 'Add friends to your Blend first, then start splitting commute expenses together.'}
              </p>
            </div>
            {hasBlendFriends ? (
              <button
                onClick={openAddExpense}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-card hover:bg-brand-800 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Add My First Expense
              </button>
            ) : (
              <button
                onClick={openBlendModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-card hover:bg-brand-800 transition-all"
              >
                <Users className="w-4 h-4" />
                Create / Join a Blend with Friends
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
