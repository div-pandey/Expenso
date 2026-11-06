import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  XCircle,
} from 'lucide-react';
import { buildSafeUpiUri, isValidUpiId } from '../../utils/upi';
import { formatCurrency } from '../../utils/currency';
import {
  verifyPaymentProofWithGemini,
  getGeminiApiKey,
  setGeminiApiKey,
  type VerificationResult,
} from '../../services/geminiPaymentVerifier';
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

  React.useEffect(() => {
    if (toMemberId) {
      const upi = toMember?.paymentMethod?.upiId || (typeof localStorage !== 'undefined' ? localStorage.getItem(`expenso_recipient_upi_${toMemberId}`) || '' : '');
      if (upi) setCustomUpi(upi);
    }
  }, [toMemberId, toMember?.paymentMethod?.upiId]);
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini AI Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getGeminiApiKey()));
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());

  useEffect(() => {
    const key = getGeminiApiKey();
    if (key) {
      setHasApiKey(true);
      if (!apiKeyInput) {
        setApiKeyInput(key);
      }
    }
  }, [isOpen]);

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

  const verifyProof = async (dataUrl: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const activeKey = apiKeyInput.trim() || getGeminiApiKey();
      const res = await verifyPaymentProofWithGemini({
        imageDataUrl: dataUrl,
        expectedAmountPaise: amountPaise,
        recipientName: toMember?.name || 'Friend',
        recipientUpi: effectiveUpi,
        expectedUtr: utrNumber.trim() || undefined,
        apiKey: activeKey || undefined,
      });
      setVerificationResult(res);
      if (res.isValid) {
        showToast('Payment screenshot verified by Gemini AI!');
        if (res.detectedUtr && !utrNumber.trim()) {
          setUtrNumber(res.detectedUtr);
        }
      } else {
        showToast(res.rejectionReason || 'AI verification rejected this screenshot', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setVerificationResult({
        isValid: false,
        confidence: 0,
        rejectionReason: msg,
        summary: 'Failed to verify proof',
        issues: [msg],
        checklist: {
          isReceipt: false,
          receiptDetail: 'Verification process failed',
          isAmountMatch: false,
          amountDetail: `Expected ₹${formatCurrency(amountPaise)}`,
          isStatusSuccess: false,
          statusDetail: 'Unverified',
          isUtrFound: false,
          utrDetail: 'Unverified',
        },
        engineUsed: 'smart-vision-heuristic',
      });
      showToast(msg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

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
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setProofPreview(dataUrl);
      await verifyProof(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setProofPreview(null);
    setVerificationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitProof = async () => {
    if (!settlement) return;
    if (!proofFile || !proofPreview) {
      showToast('Please upload your payment confirmation screenshot', 'error');
      return;
    }
    if (!verificationResult || !verificationResult.isValid) {
      showToast(verificationResult?.rejectionReason || 'Please upload a verified payment screenshot', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const notes = utrNumber.trim() ? `UPI Ref: ${utrNumber.trim()}` : undefined;
      await submitSettlementProof(settlement.id, proofPreview, notes);
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
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-warm-200">
                  <img src={proofPreview} alt="Payment proof" className="w-full h-36 object-cover" />
                  <button
                    onClick={handleRemoveProof}
                    className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-subtle hover:bg-white active:scale-90 transition-all text-charcoal-700"
                    title="Remove screenshot"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* AI Verification Status Card */}
                {isVerifying && (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 text-xs text-purple-900 animate-pulse">
                    <Sparkles className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Gemini AI Inspecting Payment Proof...</p>
                      <p className="text-[11px] text-purple-700">Checking receipt authenticity, payment status, ₹{formatCurrency(amountPaise)} amount, and UPI UTR.</p>
                    </div>
                  </div>
                )}

                {/* Verification Failed Card with Specific Reason Breakdown */}
                {verificationResult && !verificationResult.isValid && !isVerifying && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2.5 text-xs text-rose-950 animate-pop-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 text-sm">
                        <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>AI Verification Rejected</span>
                      </div>
                      {verificationResult.detectedApp && verificationResult.detectedApp !== 'None' && verificationResult.detectedApp !== 'Unknown' && (
                        <span className="text-[10px] font-bold bg-white text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                          {verificationResult.detectedApp}
                        </span>
                      )}
                    </div>

                    {/* Primary Reason */}
                    <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200">
                      <p className="text-xs font-bold text-rose-900 leading-snug">
                        {verificationResult.rejectionReason}
                      </p>
                    </div>

                    {/* Specific Checklist Breakdown */}
                    {verificationResult.checklist && (
                      <div className="bg-white/80 rounded-xl p-2.5 border border-rose-200 space-y-2 text-[11px]">
                        <p className="text-[10px] uppercase font-bold text-rose-900 tracking-wider">
                          Inspection Checklist:
                        </p>
                        
                        {/* 1. Receipt Authenticity */}
                        <div className="flex items-start gap-2">
                          {verificationResult.checklist.isReceipt ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-charcoal-800">Screenshot Authenticity: </span>
                            <span className={verificationResult.checklist.isReceipt ? 'text-emerald-700 font-medium' : 'text-rose-700 font-semibold'}>
                              {verificationResult.checklist.receiptDetail || (verificationResult.checklist.isReceipt ? 'Valid payment confirmation' : 'Not a payment receipt')}
                            </span>
                          </div>
                        </div>

                        {/* 2. Amount Check */}
                        <div className="flex items-start gap-2">
                          {verificationResult.checklist.isAmountMatch ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-charcoal-800">Amount Check: </span>
                            <span className={verificationResult.checklist.isAmountMatch ? 'text-emerald-700 font-medium' : 'text-rose-700 font-semibold'}>
                              {verificationResult.checklist.amountDetail || (verificationResult.checklist.isAmountMatch ? `Exact ₹${formatCurrency(amountPaise)} match` : `Does not match ₹${formatCurrency(amountPaise)}`)}
                            </span>
                          </div>
                        </div>

                        {/* 3. Transaction Status */}
                        <div className="flex items-start gap-2">
                          {verificationResult.checklist.isStatusSuccess ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-charcoal-800">Payment Status: </span>
                            <span className={verificationResult.checklist.isStatusSuccess ? 'text-emerald-700 font-medium' : 'text-rose-700 font-semibold'}>
                              {verificationResult.checklist.statusDetail || (verificationResult.checklist.isStatusSuccess ? 'Completed successfully' : 'Not completed / failed / pending')}
                            </span>
                          </div>
                        </div>

                        {/* 4. 12-digit UTR */}
                        <div className="flex items-start gap-2">
                          {verificationResult.checklist.isUtrFound ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="font-semibold text-charcoal-800">UPI Ref / UTR: </span>
                            <span className={verificationResult.checklist.isUtrFound ? 'text-emerald-700 font-medium font-mono' : 'text-charcoal-600'}>
                              {verificationResult.checklist.utrDetail || 'Not detected on screenshot'}
                            </span>
                          </div>
                        </div>

                        {/* 5. Payee match if available */}
                        {verificationResult.checklist.recipientDetail && (
                          <div className="flex items-start gap-2">
                            {verificationResult.checklist.isRecipientMatch !== false ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                            )}
                            <div className="flex-1">
                              <span className="font-semibold text-charcoal-800">Payee Match: </span>
                              <span className={verificationResult.checklist.isRecipientMatch !== false ? 'text-emerald-700 font-medium' : 'text-rose-700 font-semibold'}>
                                {verificationResult.checklist.recipientDetail}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* How to resolve */}
                    <div className="p-2 bg-rose-100/60 rounded-lg text-[10px] text-rose-800 flex items-start gap-1.5">
                      <span className="font-bold">What to do:</span>
                      <span>Please open Google Pay, PhonePe, or Paytm, go to your Transaction History, open the completed transfer of ₹{formatCurrency(amountPaise)}, and upload that screenshot.</span>
                    </div>
                  </div>
                )}

                {/* Verification Successful Card with Checklist */}
                {verificationResult && verificationResult.isValid && !isVerifying && (
                  <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2 text-xs text-emerald-950 animate-pop-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        {verificationResult.engineUsed === 'gemini-ai' ? 'Verified by Gemini AI' : 'Verified Payment Screenshot'}
                      </span>
                      {verificationResult.detectedApp && (
                        <span className="text-[10px] font-bold bg-white text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                          {verificationResult.detectedApp}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs font-semibold text-emerald-900">
                      {verificationResult.summary}
                    </p>

                    {/* Checklist */}
                    {verificationResult.checklist && (
                      <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-200 space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span><strong>Receipt:</strong> {verificationResult.checklist.receiptDetail || 'Authentic payment confirmation'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span><strong>Amount:</strong> {verificationResult.checklist.amountDetail || `₹${formatCurrency(amountPaise)} exact match`}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-800">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                          <span><strong>Status:</strong> {verificationResult.checklist.statusDetail || 'Completed successfully'}</span>
                        </div>
                        {verificationResult.detectedUtr && (
                          <div className="flex items-center gap-2 text-emerald-800">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                            <span className="font-mono"><strong>UPI Ref / UTR:</strong> {verificationResult.detectedUtr}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor="proof-upload" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-warm-300 hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer transition-all duration-200 group">
                <Upload className="w-6 h-6 text-charcoal-400 group-hover:scale-110 group-hover:text-brand-700 transition-all duration-200" />
                <p className="text-xs font-semibold text-charcoal-600 group-hover:text-charcoal-900 transition-colors">Upload payment confirmation screenshot</p>
                <p className="text-[10px] text-charcoal-400">PNG, JPG, WebP · Max 5MB · AI Verified</p>
                <input ref={fileInputRef} id="proof-upload" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFileChange} />
              </label>
            )}

            {/* Optional Gemini API Key Drawer */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-[10px] text-charcoal-400 hover:text-charcoal-600 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span>{hasApiKey ? 'Gemini AI Vision Active ✓' : 'Use your free Gemini API Key (optional)'}</span>
              </button>
              {showApiKeyInput && (
                <div className="mt-1.5 p-2 bg-warm-50 border border-warm-200 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-charcoal-700">Google Gemini API Key</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline flex items-center gap-0.5">
                      Get free key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      placeholder="Paste Gemini API key"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs bg-white border border-warm-300 rounded font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGeminiApiKey(apiKeyInput);
                        setHasApiKey(Boolean(apiKeyInput.trim()));
                        setShowApiKeyInput(false);
                        showToast('Gemini API key saved!');
                        if (proofPreview) verifyProof(proofPreview);
                      }}
                      className="px-2.5 py-1 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleCancel} className="btn-action-secondary flex-1 px-4 py-3 rounded-xl border border-warm-300 text-sm font-bold text-charcoal-700">Cancel</button>
              <button
                onClick={handleSubmitProof}
                disabled={
                  !proofFile || !proofPreview || isVerifying || !verificationResult?.isValid || submitting
                }
                className="btn-action-emerald group flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-card"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Proof</span>
                    <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                  </>
                )}
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
