import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle2, XCircle, ExternalLink, Clock, Loader2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';

export const ProofReviewModal: React.FC = () => {
  const {
    reviewingSettlement,
    closeProofReview,
    confirmSettlement,
    rejectSettlement,
    members,
    currentUser,
  } = useApp();

  const [confirming, setConfirming] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  if (!reviewingSettlement) return null;

  const s = reviewingSettlement;
  const fromMember = members.find(m => m.id === s.fromMemberId);
  const toMember = members.find(m => m.id === s.toMemberId);
  const isSender = s.fromMemberId === currentUser.id;
  const isRecipient = s.toMemberId === currentUser.id;
  const canAct = isRecipient && s.status === 'proof_submitted';

  const handleConfirm = async () => {
    setConfirming(true);
    try { await confirmSettlement(s.id); } finally { setConfirming(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try { await rejectSettlement(s.id, rejectReason.trim()); } finally { setRejecting(false); }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending_payment: { label: 'Pending Payment', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    proof_submitted: { label: 'Proof Submitted – Awaiting Confirmation', color: 'text-sky-700 bg-sky-50 border-sky-200', icon: <Clock className="w-3.5 h-3.5" /> },
    confirmed: { label: 'Confirmed – Debt Cleared', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    rejected: { label: 'Rejected – Debt Remains Outstanding', color: 'text-rose-700 bg-rose-50 border-rose-200', icon: <XCircle className="w-3.5 h-3.5" /> },
    cancelled: { label: 'Cancelled', color: 'text-charcoal-500 bg-warm-100 border-warm-300', icon: <XCircle className="w-3.5 h-3.5" /> },
  };
  const status = statusConfig[s.status || 'confirmed'] || statusConfig['confirmed'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={closeProofReview} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated w-full sm:max-w-md border border-warm-200 overflow-hidden animate-pop-in">
        <div className="max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white p-5 pb-4 border-b border-warm-100 flex items-center justify-between z-10">
            <div>
              <h2 className="font-black text-charcoal-900 text-base">Settlement Review</h2>
              <p className="text-[11px] text-charcoal-500">Verify the payment and confirm receipt</p>
            </div>
            <button onClick={closeProofReview} className="p-1.5 rounded-xl text-charcoal-500 hover:bg-warm-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Settlement Info */}
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center ${fromMember?.avatarColor || 'bg-warm-300'}`}>{fromMember?.initials}</div>
                  <div>
                    <p className="font-bold text-charcoal-900">{fromMember?.name}{isSender && ' (You)'}</p>
                    <p className="text-charcoal-500">paid</p>
                  </div>
                </div>
                <span className="text-xl font-black text-brand-900">{formatCurrency(s.amountPaise)}</span>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-bold text-charcoal-900 text-right">{toMember?.name}{isRecipient && ' (You)'}</p>
                    <p className="text-charcoal-500 text-right">recipient</p>
                  </div>
                  <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center ${toMember?.avatarColor || 'bg-warm-300'}`}>{toMember?.initials}</div>
                </div>
              </div>
              <p className="text-[11px] text-charcoal-400">{formatDateTime(s.date)}{s.notes && ` · ${s.notes}`}</p>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold ${status.color}`}>
              {status.icon}
              {status.label}
            </div>

            {/* Sender waiting message */}
            {isSender && s.status === 'proof_submitted' && (
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
                <p className="font-bold">Waiting for {toMember?.name} to confirm</p>
                <p className="mt-0.5 text-sky-700">Your proof has been submitted. Balances will update once they tap &ldquo;Received&rdquo;.</p>
              </div>
            )}

            {/* Proof Screenshot */}
            {s.proofImageUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-charcoal-700">Payment Proof Screenshot</p>
                  <button onClick={() => window.open(s.proofImageUrl, '_blank')} className="flex items-center gap-1 text-[11px] text-brand-700 hover:text-brand-800 font-semibold">
                    <ExternalLink className="w-3 h-3" />Full size
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-warm-200 bg-warm-50">
                  <img src={s.proofImageUrl} alt="Payment proof" className="w-full object-contain max-h-56 cursor-pointer" onClick={() => window.open(s.proofImageUrl, '_blank')} />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-warm-100 border border-warm-200 text-xs text-charcoal-500 text-center">No proof screenshot attached yet.</div>
            )}

            {/* Decision notes */}
            {s.decisionNotes && (s.status === 'confirmed' || s.status === 'rejected') && (
              <div className={`p-3.5 rounded-xl text-xs border ${s.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                <p className="font-bold">{s.status === 'confirmed' ? 'Confirmation Note' : 'Rejection Reason'}</p>
                <p className="mt-0.5">{s.decisionNotes}</p>
              </div>
            )}

            {/* Recipient action buttons */}
            {canAct && !showRejectForm && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-charcoal-600 font-semibold">Did you receive {formatCurrency(s.amountPaise)} from <strong className="text-charcoal-900">{fromMember?.name}</strong>?</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectForm(true)} className="btn-action-secondary flex-1 flex items-center justify-center gap-1.5 px-4 py-3 border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-bold rounded-xl">
                    <XCircle className="w-4 h-4" />Not received
                  </button>
                  <button onClick={handleConfirm} disabled={confirming} className="btn-action-emerald group flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-card">
                    {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />}
                    {confirming ? 'Confirming...' : 'Received'}
                  </button>
                </div>
                <p className="text-[10px] text-charcoal-400 text-center">Confirming permanently clears this debt from all balances.</p>
              </div>
            )}

            {/* Reject form */}
            {canAct && showRejectForm && (
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Rejecting keeps the full debt outstanding. {fromMember?.name} will be notified.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-700">Reason for rejection</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Payment not received in my account..." rows={3} className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-warm-50 text-sm text-charcoal-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-charcoal-400 placeholder:text-xs" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectForm(false)} className="btn-action-secondary flex-1 px-4 py-3 rounded-xl border border-warm-300 text-sm font-bold text-charcoal-700">Back</button>
                  <button onClick={handleReject} disabled={!rejectReason.trim() || rejecting} className="btn-action-secondary flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-card">
                    {rejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {(s.status === 'confirmed' || s.status === 'cancelled' || (s.status === 'rejected' && !isRecipient)) && (
              <button onClick={closeProofReview} className="btn-action-secondary w-full px-4 py-3 bg-warm-100 hover:bg-warm-200 text-charcoal-800 text-sm font-bold rounded-xl">Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
