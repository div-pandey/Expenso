import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, QrCode, ShieldCheck, CheckCircle2, Upload, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { decodeQrCodeFromImageFile, isValidUpiId, SAMPLE_UPI_DESTINATIONS } from '../../utils/upi';
import type { UserPaymentMethod } from '../../types';

export const PaymentSettingsModal: React.FC = () => {
  const { currentUser, isPaymentSettingsOpen, closePaymentSettings, updatePaymentMethod, showToast } = useApp();

  const [upiIdInput, setUpiIdInput] = useState(currentUser.paymentMethod?.upiId || '');
  const [payeeNameInput, setPayeeNameInput] = useState(currentUser.paymentMethod?.payeeName || currentUser.fullName);
  const [qrDecoding, setQrDecoding] = useState(false);
  const [qrResult, setQrResult] = useState<{
    success: boolean;
    upiId?: string;
    payeeName?: string;
    qrPayload?: string;
    error?: string;
  } | null>(
    currentUser.paymentMethod?.qrFormatVerified
      ? {
          success: true,
          upiId: currentUser.paymentMethod.upiId,
          payeeName: currentUser.paymentMethod.payeeName,
          qrPayload: currentUser.paymentMethod.qrPayload,
        }
      : null
  );
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isPaymentSettingsOpen) return null;

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrDecoding(true);
    setQrResult(null);

    try {
      const result = await decodeQrCodeFromImageFile(file);
      if (result.success && result.parsed) {
        setQrResult({
          success: true,
          upiId: result.parsed.pa,
          payeeName: result.parsed.pn || payeeNameInput,
          qrPayload: result.payload,
        });
        setUpiIdInput(result.parsed.pa);
        if (result.parsed.pn) setPayeeNameInput(result.parsed.pn);
        showToast('UPI QR decoded and verified!');
      } else {
        setQrResult({ success: false, error: result.error });
      }
    } finally {
      setQrDecoding(false);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSeedSample = () => {
    const sample = SAMPLE_UPI_DESTINATIONS[currentUser.id];
    if (!sample) {
      showToast('No sample UPI available for this account', 'info');
      return;
    }
    setUpiIdInput(sample.upiId);
    setPayeeNameInput(sample.payeeName);
    setQrResult({
      success: true,
      upiId: sample.upiId,
      payeeName: sample.payeeName,
      qrPayload: sample.rawUri,
    });
    showToast('Sample UPI details pre-filled!');
  };

  const handleSave = async () => {
    const finalUpiId = (qrResult?.upiId || upiIdInput).trim();
    const finalPayeeName = (qrResult?.payeeName || payeeNameInput).trim() || currentUser.fullName;

    if (!finalUpiId) {
      showToast('Please enter a UPI ID or upload your QR code', 'error');
      return;
    }

    if (!isValidUpiId(finalUpiId)) {
      showToast('Invalid UPI ID format (e.g., name@okhdfcbank)', 'error');
      return;
    }

    setSaving(true);
    try {
      const method: UserPaymentMethod = {
        userId: currentUser.id,
        payeeName: finalPayeeName,
        upiId: finalUpiId,
        qrPayload: qrResult?.qrPayload,
        qrFormatVerified: qrResult?.success === true,
        currency: 'INR',
        createdAt: currentUser.paymentMethod?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await updatePaymentMethod(method);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={closePaymentSettings} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated w-full sm:max-w-md border border-warm-200 max-h-[92vh] flex flex-col overflow-hidden animate-slide-up sm:animate-pop-in">
        {/* Header */}
        <div className="p-5 border-b border-warm-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-charcoal-900">Payment Settings</h2>
              <p className="text-[11px] text-charcoal-500">Your UPI details for receiving settlements</p>
            </div>
          </div>
          <button
            onClick={closePaymentSettings}
            className="p-2 rounded-xl text-charcoal-500 hover:text-charcoal-800 hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* QR Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-charcoal-700 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-700" />
                Upload your UPI QR code
              </label>
              {SAMPLE_UPI_DESTINATIONS[currentUser.id] && (
                <button
                  onClick={handleSeedSample}
                  className="text-[10px] font-bold text-brand-700 hover:underline"
                >
                  Use sample (demo)
                </button>
              )}
            </div>

            <label
              htmlFor="qr-upload"
              className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
                qrDecoding
                  ? 'border-brand-300 bg-brand-50'
                  : qrResult?.success
                  ? 'border-emerald-300 bg-emerald-50'
                  : qrResult?.success === false
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-warm-300 hover:border-brand-300 hover:bg-brand-50/40 bg-warm-50'
              }`}
            >
              {qrDecoding ? (
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              ) : qrResult?.success ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              ) : (
                <Upload className="w-8 h-8 text-charcoal-400" />
              )}
              <p className="text-xs font-semibold text-charcoal-600">
                {qrDecoding
                  ? 'Decoding QR...'
                  : qrResult?.success
                  ? 'QR format verified'
                  : 'Click to upload your UPI QR image'}
              </p>
              <p className="text-[10px] text-charcoal-400">PNG, JPG, WebP · Max 5MB</p>
              <input
                ref={fileInputRef}
                id="qr-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleQrUpload}
                disabled={qrDecoding}
              />
            </label>

            {/* QR Verification Result */}
            {qrResult && (
              <div className={`p-3 rounded-xl text-xs border ${
                qrResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {qrResult.success ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      UPI QR format verified
                    </div>
                    <p className="font-mono text-[11px]">{qrResult.upiId}</p>
                    <p className="text-[11px] text-emerald-700">Payee: {qrResult.payeeName}</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{qrResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual UPI ID */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-charcoal-700">
              Or enter UPI ID manually
            </label>
            <input
              type="text"
              value={upiIdInput}
              onChange={e => setUpiIdInput(e.target.value)}
              placeholder="e.g. yourname@okhdfcbank"
              className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-warm-50 text-sm font-mono text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-charcoal-400 placeholder:font-sans"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-charcoal-700">
              Your display name for payments
            </label>
            <input
              type="text"
              value={payeeNameInput}
              onChange={e => setPayeeNameInput(e.target.value)}
              placeholder="Your name as it appears in UPI"
              className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-warm-50 text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-charcoal-400"
            />
          </div>

          <p className="text-[10px] text-charcoal-400 leading-relaxed">
            We only decode the UPI QR on your device — no bank accounts or credentials required. &ldquo;Format verified&rdquo; means the QR payload follows the <code className="bg-warm-100 px-1 rounded font-mono">upi://pay</code> standard, not that we&rsquo;ve confirmed your bank details.
          </p>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={closePaymentSettings}
            className="flex-1 px-4 py-3 rounded-xl border border-warm-300 text-sm font-bold text-charcoal-700 hover:bg-warm-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-card transition-all"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Payment Details'}
          </button>
        </div>
      </div>
    </div>
  );
};

