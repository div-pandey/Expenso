import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
  History,
  Trash2,
  QrCode,
  Clock,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { SettlementFlowModal } from '../settlements/SettlementFlowModal';

export const BalancesView: React.FC = () => {
  const {
    currentBlend,
    currentUser,
    members,
    balances,
    suggestedSettlements,
    settlements,
    deleteSettlement,
    openProofReview,
  } = useApp();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settlementFlow, setSettlementFlow] = useState<{
    toMemberId: string;
    amountPaise: number;
  } | null>(null);

  const handleDeleteSettlement = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this recorded repayment? Net balances will automatically recalculate.')) {
      setDeletingId(id);
      try {
        await deleteSettlement(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Pending</span>;
      case 'proof_submitted':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-0.5"><ImageIcon className="w-2.5 h-2.5" /> Proof Sent</span>;
      case 'confirmed':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Confirmed</span>;
      case 'rejected':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" /> Rejected</span>;
      case 'cancelled':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-100 text-charcoal-500 border border-warm-300 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" /> Cancelled</span>;
      default:
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Settled</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="pt-1">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-charcoal-900 tracking-tight">
            Balances & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Transparent group balances and smart simplified debt settlements
          </p>
        </div>
      </div>

      {/* Suggested Settlements Section (Optimized Transfers) */}
      <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-charcoal-900">
                Outstanding Balances & Repayments
              </h2>
              <p className="text-[11px] text-charcoal-500">
                Remaining net amounts owed after all shared rides and repayments
              </p>
            </div>
          </div>
          {suggestedSettlements.length === 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              All Settled Up!
            </span>
          )}
        </div>

        {suggestedSettlements.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {suggestedSettlements.map((s, idx) => {
              const fromMember = members.find(m => m.id === s.fromMemberId);
              const toMember = members.find(m => m.id === s.toMemberId);
              const isCurrentUserDebtor = s.fromMemberId === currentUser.id;

              return (
                <div
                  key={`${s.fromMemberId}-${s.toMemberId}-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-warm-200 bg-warm-50/70 gap-3"
                >
                  <div className="flex items-center gap-3">
                    {/* From Member */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${fromMember?.avatarColor || 'bg-stone-300'}`}>
                        {fromMember?.initials}
                      </div>
                      <span className="text-xs font-bold text-charcoal-900">
                        {fromMember?.name} {fromMember?.isCurrentUser && '(You)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-1 text-charcoal-400">
                      <span className="text-xs font-medium text-charcoal-500">owes</span>
                      <ArrowRight className="w-3.5 h-3.5 text-brand-700" />
                    </div>

                    {/* To Member */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${toMember?.avatarColor || 'bg-stone-300'}`}>
                        {toMember?.initials}
                      </div>
                      <span className="text-xs font-bold text-charcoal-900">
                        {toMember?.name} {toMember?.isCurrentUser && '(You)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-warm-200">
                    <span className="text-base font-black text-brand-900">
                      {formatCurrency(s.amountPaise)}
                    </span>
                    {isCurrentUserDebtor ? (() => {
                      const myProof = settlements.find(
                        st => st.fromMemberId === currentUser.id && st.toMemberId === s.toMemberId && st.status === 'proof_submitted'
                      );
                      return (
                        <div className="flex items-center gap-2">
                          {myProof && (
                            <button
                              type="button"
                              onClick={() => openProofReview(myProof)}
                              className="px-2.5 py-1 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-300 text-xs font-bold rounded-lg transition-colors"
                            >
                              Proof Sent
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setSettlementFlow({
                                toMemberId: s.toMemberId,
                                amountPaise: s.amountPaise,
                              })
                            }
                            className="btn-action-emerald group flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-subtle"
                          >
                            <QrCode className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                            <span>Settle Up</span>
                          </button>
                        </div>
                      );
                    })() : (() => {
                      const pendingProof = settlements.find(
                        st => st.fromMemberId === s.fromMemberId && st.toMemberId === currentUser.id && st.status === 'proof_submitted'
                      );
                      if (pendingProof) {
                        return (
                          <button
                            type="button"
                            onClick={() => openProofReview(pendingProof)}
                            className="btn-action-emerald group flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-subtle animate-pulse"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review & Confirm</span>
                          </button>
                        );
                      }
                      return (
                        <span className="text-[11px] font-semibold text-charcoal-500 bg-warm-100 px-2.5 py-1 rounded-md border border-warm-200">
                          Awaiting payment
                        </span>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-warm-50/50 rounded-xl border border-warm-200/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-charcoal-900">Zero Debts Outstanding</h3>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto mt-0.5">
              Everyone in {currentBlend?.name || 'this Blend'} is perfectly squared away. No repayments needed.
            </p>
          </div>
        )}
      </div>

      {/* Individual Net Balances Breakdown Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-600 px-1">
          Individual Balance Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {members.map(member => {
            const summary = balances[member.id] || {
              memberId: member.id,
              totalPaidPaise: 0,
              totalSharePaise: 0,
              repaymentsSentPaise: 0,
              repaymentsReceivedPaise: 0,
              netBalancePaise: 0,
            };
            const net = summary.netBalancePaise;

            return (
              <div
                key={member.id}
                className="bg-white border border-warm-200 rounded-2xl p-4 shadow-subtle flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${member.avatarColor}`}>
                        {member.initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-charcoal-900">
                          {member.name} {member.isCurrentUser && '(You)'}
                        </h3>
                        <p className="text-[10px] text-charcoal-400">{member.phone || 'Member'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {net > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Should receive
                        </span>
                      ) : net < 0 ? (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Owes money
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-charcoal-600 bg-warm-100 px-2 py-0.5 rounded">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Net Amount Banner */}
                  <div className="mt-3.5 p-3 rounded-xl bg-warm-50/70 border border-warm-200/80">
                    <span className="text-xs text-charcoal-500 font-medium block">Net Balance</span>
                    <span
                      className={`text-2xl font-black ${
                        net > 0
                          ? 'text-emerald-700'
                          : net < 0
                          ? 'text-rose-600'
                          : 'text-charcoal-700'
                      }`}
                    >
                      {net === 0
                        ? '₹0'
                        : `${net > 0 ? '+' : '-'}${formatCurrency(Math.abs(net))}`}
                    </span>
                    <p className="text-[11px] text-charcoal-600 font-medium mt-0.5">
                      {net > 0
                        ? `${member.name} should receive ${formatCurrency(net)}.`
                        : net < 0
                        ? `${member.name} owes ${formatCurrency(Math.abs(net))}.`
                        : `${member.name} is settled.`}
                    </p>
                  </div>
                </div>

                {/* Mathematical Breakdown of Contributions */}
                <div className="space-y-1.5 text-[11px] text-charcoal-600 pt-2 border-t border-warm-100">
                  <div className="flex justify-between">
                    <span>Total rides paid for:</span>
                    <strong className="text-charcoal-900">{formatCurrency(summary.totalPaidPaise)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fair share consumed:</span>
                    <strong className="text-charcoal-900">{formatCurrency(summary.totalSharePaise)}</strong>
                  </div>
                  {summary.repaymentsSentPaise > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Repayments sent:</span>
                      <strong>+{formatCurrency(summary.repaymentsSentPaise)}</strong>
                    </div>
                  )}
                  {summary.repaymentsReceivedPaise > 0 && (
                    <div className="flex justify-between text-charcoal-500">
                      <span>Repayments received:</span>
                      <strong>-{formatCurrency(summary.repaymentsReceivedPaise)}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Repayment History Log */}
      <div className="bg-white border border-warm-200 rounded-2xl p-5 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-charcoal-500" />
            <h2 className="text-sm font-bold text-charcoal-900">
              Logged Repayment History
            </h2>
          </div>
          <span className="text-xs text-charcoal-400">
            {settlements.length} repayment{settlements.length === 1 ? '' : 's'}
          </span>
        </div>

        {settlements.length > 0 ? (
          <div className="divide-y divide-warm-100 text-xs">
            {settlements.map(item => {
              const fromMember = members.find(m => m.id === item.fromMemberId);
              const toMember = members.find(m => m.id === item.toMemberId);
              const isRecipient = item.toMemberId === currentUser.id;

              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-charcoal-900">
                        {fromMember?.name} {fromMember?.isCurrentUser && '(You)'} paid {toMember?.name} {toMember?.isCurrentUser && '(You)'}
                      </p>
                      <p className="text-[10px] text-charcoal-400">
                        {formatDateTime(item.date)} {item.notes && `· ${item.notes}`}
                      </p>
                      <div className="mt-0.5">
                        {getStatusBadge(item.status || 'confirmed')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-sm">
                      {formatCurrency(item.amountPaise)}
                    </span>
                    {/* View proof button for recipient or sender when proof submitted */}
                    {isRecipient && item.status === 'proof_submitted' && (
                      <button
                        onClick={() => openProofReview(item)}
                        className="text-xs font-bold text-sky-700 hover:text-sky-800 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all duration-150 hover:-translate-y-0.5 active:scale-95 shadow-subtle"
                        title="Review payment proof"
                      >
                        Review
                      </button>
                    )}
                    {!isRecipient && item.status === 'proof_submitted' && (
                      <button
                        onClick={() => openProofReview(item)}
                        className="text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 px-2 py-1 rounded-lg bg-warm-100 hover:bg-warm-200 border border-warm-200 transition-all"
                        title="View settlement details"
                      >
                        Details
                      </button>
                    )}
                    {item.createdBy === currentUser.id && !['confirmed'].includes(item.status || '') && (
                      <button
                        onClick={() => handleDeleteSettlement(item.id)}
                        disabled={deletingId === item.id}
                        className="text-charcoal-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        title="Delete repayment (auto-recalculates balances)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-charcoal-400 py-3 text-center">
            No repayments logged yet. Use &ldquo;Settle Up&rdquo; once someone transfers money via UPI.
          </p>
        )}
      </div>

      {/* Settlement Flow Modal */}
      {settlementFlow && (
        <SettlementFlowModal
          isOpen={!!settlementFlow}
          toMemberId={settlementFlow.toMemberId}
          amountPaise={settlementFlow.amountPaise}
          onClose={() => setSettlementFlow(null)}
        />
      )}
    </div>
  );
};
