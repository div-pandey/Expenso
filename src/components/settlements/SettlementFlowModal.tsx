import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { buildSafeUpiUri, isValidUpiId } from '../../utils/upi';
import { formatCurrency } from '../../utils/currency';
import type { Settlement } from '../../types';

interface SettlementFlowModalProps {
  isOpen: boolean;
  toMemberId: string;
  amountPaise: number;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const COMMON_UPI_HANDLES = ['@okaxis', '@okhdfcbank', '@paytm', '@ybl', '@upi', '@oksbi', '@icici'];

export const SettlementFlowModal: React.FC<SettlementFlowModalProps> = ({
  isOpen,
  toMemberId,
  amountPaise,
  onClose,
}) => {
  const {
    currentUser,
    members,
    currentBlend,
    initiateSettlement,
    submitSettlementProof,
    cancelSettlement,
    showToast,
  } = useApp();

  const toMember = members.find(m => m.id === toMemberId);

  const [step, setStep] = useState<Step>(1);
  const [initiating, setInitiating] = useState(false);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [customUpi, setCustomUpi] = useState<string>(() => {
    return toMember?.paymentMethod?.upiId || (typeof localStorage !== 'undefined' ? localStorage.getItem(`expenso_recipient_upi_${toMemberId}`) || '' : '');
  });
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || toMemberId === currentUser.id) return null;

  const effectiveUpi = (customUpi.trim() || toMember?.paymentMethod?.upiId || '').trim();
  const hasValidUpi = isValidUpiId(effectiveUpi);

  const upiDeepLink = hasValidUpi
    ? buildSafeUpiUri({
        pa: effectiveUpi,
        pn: toMember?.paymentMethod?.payeeName || toMember?.name || 'Friend',
        amPaise: amountPaise,
        tn: `Expenso settlement - ${currentBlend?.name || 'Blend'}`,
      })
    : null;

  const handleApplyHandle = (handle: string) => {
    const current = customUpi.trim();
    if (!current) {
      setCustomUpi(handle);
      return;
    }
    const atIdx = current.indexOf('@');
    if (atIdx >= 0) {
      setCustomUpi(current.substring(0, atIdx) + handle);
    } else {
      setCustomUpi(current + handle);
    }
  };

  const handleInitiate = async () => {
    if (toMemberId === currentUser.id) {
      showToast('You cannot settle with yourself', 'error');
      return;
    }
    if (effectiveUpi && hasValidUpi) {
      try {
        localStorage.setItem(`expenso_recipient_upi_${toMemberId}`, effectiveUpi);
      } catch {}
    }
    setInitiating(true);
    try {
      const s = await initiateSettlement({ toMemberId, amountPaise });
      setSettlement(s);
      setStep(2);
    } catch {
      // error shown via context toast
    } finally {
      setInitiating(false);
    }
  };

  const handleCopyUpi = () => {
    if (!effectiveUpi) return;
    navigator.clipboard.writeText(effectiveUpi);
    setCopiedUpi(true);
    showToast(`Copied UPI ID: ${effectiveUpi}`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Screenshot must be under 5MB', 'error'); return; }
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) { showToast('Upload a PNG, JPG or WebP image', 'error'); return; }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!settlement) return;
    if (!proofPreview && !utrNumber.trim()) {
      showToast('Please upload a screenshot or enter UPI Reference/UTR', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const notes = utrNumber.trim() ? `UPI Ref: ${utrNumber.trim()}` : undefined;
      await submitSettlementProof(settlement.id, proofPreview || '', notes);
      setStep(3);
    } catch {
      // handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (settlement && settlement.status === 'pending_payment') {
      try { await cancelSettlement(settlement.id); } catch { /* best-effort */ }
    }
    onClose();
  };

  const stepLabels = ['Review', 'Pay & Attach', 'Done'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={step === 3 ? onClose : handleCancel} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated w-full sm:max-w-md border border-warm-200 overflow-hidden animate-pop-in">

        {/* Step Indicator Header */}
        <div className="px-5 pt-5 pb-4 border-b border-warm-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-charcoal-900 text-base">Settle Up</h2>
            <button onClick={step === 3 ? onClose : handleCancel} className="p-1.5 rounded-xl text-charcoal-500 hover:bg-warm-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const num = (i + 1) as Step;
              const isActive = step === num;
              const isDone = step > num;
              return (
                <React.Fragment key={num}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${isDone ? 'bg-emerald-600 text-white' : isActive ? 'bg-brand-700 text-white' : 'bg-warm-200 text-charcoal-400'}`}>
                      {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : num}
                    </div>
                    <span className={`text-[10px] font-bold hidden sm:block ${isActive ? 'text-charcoal-900' : 'text-charcoal-400'}`}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && <div className={`flex-1 h-px ${isDone ? 'bg-emerald-400' : 'bg-warm-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step 1: Review & Initiate */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${currentUser.avatarColor}`}>{currentUser.initials}</div>
                  <span className="text-sm font-bold text-charcoal-900">You</span>
                </div>
                <div className="flex items-center gap-1 text-charcoal-400 text-xs"><span>paying</span><ArrowRight className="w-4 h-4 text-brand-700" /></div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${toMember?.avatarColor || 'bg-warm-300'}`}>{toMember?.initials}</div>
                  <span className="text-sm font-bold text-charcoal-900">{toMember?.name}</span>
                </div>
              </div>
              <div className="text-center pt-1">
                <span className="text-3xl font-black text-brand-900">{formatCurrency(amountPaise)}</span>
              </div>
            </div>

            {hasValidUpi ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold"><QrCode className="w-3.5 h-3.5" />UPI Payment Details</div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">Active</span>
                </div>
                <p className="font-mono text-sm font-bold text-charcoal-900">{effectiveUpi}</p>
                <p className="text-xs text-charcoal-600">{toMember?.paymentMethod?.payeeName || toMember?.name}</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-800">
                <div className="flex items-center gap-1.5 font-bold"><AlertCircle className="w-4 h-4 shrink-0" />Enter {toMember?.name}&apos;s UPI ID</div>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm or name@okaxis"
                  value={customUpi}
                  onChange={e => setCustomUpi(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-charcoal-900 font-mono border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-subtle"
                />
                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-amber-900 font-semibold mr-0.5">Quick handle:</span>
                  {COMMON_UPI_HANDLES.map(handle => (
                    <button
                      type="button"
                      key={handle}
                      onClick={() => handleApplyHandle(handle)}
                      className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded font-medium transition-colors"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-charcoal-400 leading-relaxed bg-warm-50 rounded-xl p-3 border border-warm-200">
              Notice: Expenso opens your UPI app but <strong>cannot verify</strong> payment success. A settlement is only officially cleared when the recipient confirms your screenshot.
            </p>

            <div className="flex gap-3">
              <button onClick={handleCancel} className="btn-action-secondary flex-1 px-4 py-3 rounded-xl border border-warm-300 text-sm font-bold text-charcoal-700">Cancel</button>
              <button onClick={handleInitiate} disabled={initiating} className="btn-action-primary group flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-card">
                {initiating && <Loader2 className="w-4 h-4 animate-spin" />}
                {initiating ? 'Starting...' : 'Initiate Settlement'}
                {!initiating && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pay + Upload Proof */}
        {step === 2 && settlement && (
          <div className="p-5 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-charcoal-500">Sending to <strong className="text-charcoal-900">{toMember?.name}</strong></p>
              <p className="text-2xl font-black text-brand-900">{formatCurrency(amountPaise)}</p>
            </div>

            {hasValidUpi && upiDeepLink ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold">Strict Payee Verification</p>
                    <p className="text-[11px] text-emerald-700 truncate">
                      Locked to <strong>{toMember?.paymentMethod?.payeeName || toMember?.name}</strong> ({effectiveUpi}). Cannot go to any other account.
                    </p>
                  </div>
                </div>

                <a
                  href={upiDeepLink}
                  target="_self"
                  className="btn-action-primary group relative overflow-hidden flex items-center justify-center gap-2.5 w-full px-5 py-4 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-card"
                >
                  <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span>Pay {formatCurrency(amountPaise)} via UPI App</span>
                  <ExternalLink className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
                </a>

                {/* Popular App Compatibility Badges */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-charcoal-400">
                  <span>Redirects to:</span>
                  <span className="px-1.5 py-0.5 bg-warm-100 rounded border border-warm-200 text-charcoal-600">Google Pay</span>
                  <span className="px-1.5 py-0.5 bg-warm-100 rounded border border-warm-200 text-charcoal-600">PhonePe</span>
                  <span className="px-1.5 py-0.5 bg-warm-100 rounded border border-warm-200 text-charcoal-600">Paytm</span>
                  <span className="px-1.5 py-0.5 bg-warm-100 rounded border border-warm-200 text-charcoal-600">BHIM</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 p-2.5 rounded-xl border border-warm-200 bg-warm-50 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <p className="text-[9px] text-charcoal-500 font-semibold uppercase">Payee UPI ID</p>
                      <p className="text-xs font-mono font-bold text-charcoal-900 truncate">{effectiveUpi}</p>
                    </div>
                    <button onClick={handleCopyUpi} className="btn-action-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-warm-300 text-xs font-bold text-charcoal-700 shrink-0">
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pop-in" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUpi ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                      showQrCode ? 'bg-emerald-100 border-emerald-400 text-emerald-900' : 'bg-white border-warm-300 text-charcoal-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{showQrCode ? 'Hide QR' : 'QR Code'}</span>
                  </button>
                </div>

                {showQrCode && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col items-center justify-center space-y-1.5 text-center animate-pop-in">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiDeepLink)}`}
                      alt="UPI Payment QR Code"
                      className="w-36 h-36 object-contain rounded-lg border border-warm-200 p-1"
                    />
                    <p className="text-[10px] font-semibold text-charcoal-700">Scan to pay with any UPI app</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">Pay {toMember?.name} directly. Return here after transferring.</div>
            )}

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-warm-200" />
              <span className="text-[10px] uppercase font-bold tracking-wide text-charcoal-400 whitespace-nowrap">After paying, attach proof</span>
              <div className="flex-1 h-px bg-warm-200" />
            </div>

            {/* UPI UTR reference */}
            <div>
              <label htmlFor="flow-utr-input" className="block text-[11px] font-semibold text-charcoal-700 mb-1">
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                id="flow-utr-input"
                type="text"
                placeholder="e.g. 431289012345 (12-digit UPI ref)"
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-warm-50 text-charcoal-900 font-mono border border-warm-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {proofPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-warm-200">
                <img src={proofPreview} alt="Payment proof" className="w-full h-36 object-cover" />
                <button onClick={() => { setProofFile(null); setProofPreview(null); }} className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-subtle hover:bg-white active:scale-90 transition-all">
                  <X className="w-3.5 h-3.5 text-charcoal-700" />
                </button>
              </div>
            ) : (
              <label htmlFor="proof-upload" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-warm-300 hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer transition-all duration-200 group">
                <Upload className="w-6 h-6 text-charcoal-400 group-hover:scale-110 group-hover:text-brand-700 transition-all duration-200" />
                <p className="text-xs font-semibold text-charcoal-600 group-hover:text-charcoal-900 transition-colors">Upload payment confirmation screenshot</p>
                <p className="text-[10px] text-charcoal-400">PNG, JPG, WebP · Max 5MB</p>
                <input ref={fileInputRef} id="proof-upload" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFileChange} />
              </label>
            )}

            <div className="flex gap-3">
              <button onClick={handleCancel} className="btn-action-secondary flex-1 px-4 py-3 rounded-xl border border-warm-300 text-sm font-bold text-charcoal-700">Cancel</button>
              <button onClick={handleSubmitProof} disabled={(!proofFile && !utrNumber.trim()) || submitting} className="btn-action-emerald group flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-card">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Proof'}
                {!submitting && <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="p-5 space-y-5">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-pop-in">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-charcoal-900 text-lg">Proof Submitted!</h3>
                <p className="text-xs text-charcoal-500 max-w-xs">Your payment screenshot has been shared with <strong className="text-charcoal-800">{toMember?.name}</strong>. They&apos;ll confirm once they check Expenso.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-2 text-xs text-charcoal-600">
              <p className="font-bold text-charcoal-900 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" />What happens next</p>
              <ul className="space-y-1 ml-5 list-disc">
                <li>{toMember?.name} gets a notification in Expenso</li>
                <li>They review your screenshot and tap &ldquo;Received&rdquo;</li>
                <li>Once confirmed, your balance clears automatically</li>
                <li>If rejected, the debt stays outstanding — check with them directly</li>
              </ul>
            </div>

            <button onClick={onClose} className="btn-action-primary w-full px-4 py-3 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-xl shadow-card">Done</button>
          </div>
        )}
      </div>
    </div>
  );
};
