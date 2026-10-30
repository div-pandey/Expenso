import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import {
  decodeQrCodeFromImageFile,
  isValidUpiId,
} from '../../utils/upi';
import type { UserPaymentMethod } from '../../types';

// ─── Step Definitions ───────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Create Account',
  2: 'Invite Code',
  3: 'UPI Setup',
  4: 'Review & Finish',
};

// ─── Step Indicator ──────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: Step;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {(Array.from({ length: totalSteps }, (_, i) => i + 1) as Step[]).map((step) => {
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <React.Fragment key={step}>
            <div
              className={`flex items-center justify-center rounded-full font-semibold transition-all text-xs
                ${isActive ? 'w-7 h-7 bg-brand-700 text-white shadow-sm ring-2 ring-brand-700/20' : ''}
                ${isDone ? 'w-6 h-6 bg-brand-200 text-brand-800' : ''}
                ${!isActive && !isDone ? 'w-6 h-6 bg-warm-200 text-charcoal-400' : ''}
              `}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                step
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`h-px flex-1 max-w-[28px] transition-colors ${
                  step < currentStep ? 'bg-brand-400' : 'bg-warm-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    isOnboardingOpen,
    closeOnboarding,
    updatePaymentMethod,
    registerUser,
    setShowLandingPage,
    showToast,
    openLogin,
  } = useApp();

  const [step, setStep] = useState<Step>(1);

  // Step 1 – Account Registration
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [profileError, setProfileError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Step 3 – UPI Setup
  const [upiMode, setUpiMode] = useState<'qr' | 'manual'>('qr');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [qrDecoding, setQrDecoding] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [qrVerified, setQrVerified] = useState(false);
  const [upiError, setUpiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 4 – Saving
  const [isSaving, setIsSaving] = useState(false);

  if (!isOnboardingOpen) return null;

  const totalSteps: number = 4;

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as Step);
  const goBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const handleClose = () => {
    // If the user already registered an account (step > 1), navigate into the app
    if (step > 1) {
      setShowLandingPage(false);
    }
    closeOnboarding();
  };

  // ── Step 1: Create Account ─────────────────────────────────────────────────

  const handleRegisterNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileError('');

    if (!fullName.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setProfileError('Please enter a valid email address (e.g. name@campus.edu).');
      return;
    }

    setIsRegistering(true);
    try {
      const newUser = await registerUser(fullName.trim(), trimmedEmail);
      setPayeeName(newUser.fullName);
      goNext();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create account';
      setProfileError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Step 3: QR File Handling ───────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrFile(file);
    setUpiError('');
    setQrVerified(false);
    setQrPayload(null);
    setUpiId('');
    setPayeeName(fullName.trim() || currentUser.fullName);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setQrPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // Decode in-browser
    setQrDecoding(true);
    try {
      const result = await decodeQrCodeFromImageFile(file);
      if (result.success && result.parsed) {
        setQrPayload(result.payload ?? null);
        setUpiId(result.parsed.pa);
        setPayeeName(result.parsed.pn ?? (fullName.trim() || currentUser.fullName));
        setQrVerified(true);
        setUpiError('');
      } else {
        setUpiError(result.error ?? 'Could not decode QR. Try a clearer image or enter UPI ID manually.');
        setQrVerified(false);
      }
    } finally {
      setQrDecoding(false);
    }
    e.target.value = '';
  };

  const handleUseSeedUpi = () => {
    // Provide a valid college UPI demo target
    const fallbackSeed = {
      upiId: `${fullName.toLowerCase().replace(/\s+/g, '') || 'student'}@oksbi`,
      payeeName: fullName.trim() || currentUser.fullName || 'College Commuter',
      rawUri: `upi://pay?pa=student@oksbi&pn=${encodeURIComponent(fullName.trim() || 'Student')}&cu=INR&tn=ExpensoCommute`,
    };

    setUpiId(fallbackSeed.upiId);
    setPayeeName(fallbackSeed.payeeName);
    setQrPayload(fallbackSeed.rawUri);
    setQrVerified(true);
    setUpiError('');
    setQrFile(null);
    setQrPreviewUrl(null);
  };

  const handleManualUpiNext = () => {
    setUpiError('');
    const trimmedId = upiId.trim();
    if (!trimmedId) {
      setUpiError('Please enter your UPI ID.');
      return;
    }
    if (!isValidUpiId(trimmedId)) {
      setUpiError('Invalid UPI ID format. Example: yourname@upi or 9876543210@paytm');
      return;
    }
    setUpiId(trimmedId);
    setQrVerified(false); // manual entry is format-checked, not QR decoded
    setQrPayload(null);
    goNext();
  };

  const handleUpiStepNext = () => {
    if (upiMode === 'qr') {
      if (!qrVerified || !upiId) {
        setUpiError('Please upload a valid UPI QR code before continuing.');
        return;
      }
      goNext();
    } else {
      handleManualUpiNext();
    }
  };

  // ── Step 4: Finish Setup ───────────────────────────────────────────────────

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      if (upiId.trim()) {
        const now = new Date().toISOString();
        const method: UserPaymentMethod = {
          userId: currentUser.id,
          payeeName: payeeName.trim() || fullName.trim() || currentUser.fullName,
          upiId: upiId.trim(),
          qrPayload: qrPayload ?? undefined,
          qrFormatVerified: qrVerified,
          currency: 'INR',
          createdAt: currentUser.paymentMethod?.createdAt ?? now,
          updatedAt: now,
        };
        await updatePaymentMethod(method);
      }
      setShowLandingPage(false);
      closeOnboarding();
      showToast(`Welcome to Expenso, ${fullName.trim() || currentUser.fullName}!`);
    } catch {
      showToast('Failed to save payment details. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render Steps ────────────────────────────────────────────────────────────

  // Step 1: Account Registration
  const renderStep1 = () => (
    <form onSubmit={handleRegisterNext} className="space-y-4">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-700" />
          <span>Quick 30-Second Signup</span>
        </div>
        <h3 className="text-lg font-black text-charcoal-900 tracking-tight">
          Create your Expenso Account
        </h3>
        <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">
          Start recording college transit rides and splitting fares with zero confusion.
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <User className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (profileError) setProfileError('');
          }}
          placeholder="e.g. Divyansh Sharma"
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all font-medium"
        />
      </div>

      {/* College Email */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          College or Personal Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (profileError) setProfileError('');
          }}
          placeholder="e.g. student@campus.edu"
          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all font-medium"
        />
      </div>

      {/* Phone Number (Optional) */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          Phone Number <span className="font-normal text-charcoal-400">(optional)</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all font-medium"
        />
      </div>

      {profileError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700 leading-relaxed">{profileError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isRegistering}
        className="btn-action-primary group relative overflow-hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm transition-all duration-150 active:scale-[0.99] shadow-card disabled:opacity-50"
      >
        {isRegistering ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating your account…</span>
          </>
        ) : (
          <>
            <span>Create Account & Continue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </>
        )}
      </button>

      {/* Switch to login */}
      <div className="pt-2 text-center border-t border-warm-200">
        <p className="text-xs text-charcoal-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => {
              closeOnboarding();
              openLogin();
            }}
            className="font-bold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer"
          >
            Sign In here
          </button>
        </p>
      </div>
    </form>
  );

  // Step 2: Invite Code & Profile
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* User greeting */}
      <div className="flex flex-col items-center gap-2.5 pt-1 text-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-subtle ${currentUser.avatarColor}`}
        >
          {currentUser.initials}
        </div>
        <div>
          <h3 className="text-base font-black text-charcoal-900">
            Account Created, {currentUser.fullName}!
          </h3>
          <p className="text-xs text-charcoal-500 mt-0.5 font-medium">{currentUser.email}</p>
        </div>
      </div>

      {/* Personal 6-char Invite Code Card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/40 border border-brand-200 p-4 text-center space-y-2.5">
        <p className="text-[11px] font-bold text-brand-800 uppercase tracking-wider">
          Your Personal 6-Character Invite Code
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-3xl font-black tracking-widest text-brand-900 bg-white/80 px-4 py-1.5 rounded-xl border border-brand-200 shadow-sm">
            {currentUser.inviteCode}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(currentUser.inviteCode);
              setCopiedCode(true);
              showToast(`Copied invite code: ${currentUser.inviteCode}`);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="btn-action-secondary p-2.5 rounded-xl bg-white hover:bg-warm-100 border border-brand-300 text-brand-800 transition-all shadow-subtle cursor-pointer"
            title="Copy Invite Code"
          >
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-600 animate-pop-in" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-charcoal-600 max-w-xs mx-auto leading-relaxed">
          Share this code with your commute friends so they can add you to their daily ride Blends.
        </p>
      </div>

      <div className="rounded-xl bg-warm-100 border border-warm-200 px-4 py-3 text-xs text-charcoal-600 leading-relaxed">
        <strong className="text-charcoal-800">Next:</strong> Set up your personal UPI QR so when friends owe you for shared rides, they can pay you directly with one click.
      </div>

      <div className="flex gap-2.5 pt-1">
        <button
          onClick={() => {
            setShowLandingPage(false);
            closeOnboarding();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-700 text-xs font-bold hover:bg-warm-100 transition-colors"
        >
          <span>Go to Dashboard</span>
        </button>
        <button
          onClick={goNext}
          className="btn-action-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-card"
        >
          <span>Continue to UPI</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Step 3: UPI Setup
  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-charcoal-900">UPI Payment Setup</h3>
        <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">
          Add your UPI QR so friends can settle debts directly to your bank account.{' '}
          <span className="text-charcoal-400">(Optional — you can skip)</span>
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-warm-200 overflow-hidden bg-warm-100 p-1 gap-1">
        {(['qr', 'manual'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setUpiMode(mode);
              setUpiError('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              upiMode === mode
                ? 'bg-white text-brand-800 shadow-sm border border-warm-200'
                : 'text-charcoal-500 hover:text-charcoal-800'
            }`}
          >
            {mode === 'qr' ? 'Upload UPI QR' : 'Enter UPI ID'}
          </button>
        ))}
      </div>

      {/* QR Upload Mode */}
      {upiMode === 'qr' && (
        <div className="space-y-3">
          {/* Quick Demo QR shortcut */}
          <button
            type="button"
            onClick={handleUseSeedUpi}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-brand-300 bg-brand-50 text-brand-800 text-xs font-bold hover:bg-brand-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-700" />
            <span>Fill verified test student UPI QR ({fullName.toLowerCase().replace(/\s+/g, '') || 'student'}@oksbi)</span>
          </button>

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              qrDecoding
                ? 'border-brand-400 bg-brand-50/50'
                : qrVerified
                ? 'border-emerald-500 bg-emerald-50/40'
                : upiError
                ? 'border-red-300 bg-red-50/40'
                : 'border-warm-300 bg-warm-50 hover:border-brand-400 hover:bg-brand-50/30'
            }`}
          >
            {qrDecoding ? (
              <>
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                <p className="text-xs text-brand-800 font-bold">Decoding QR client-side…</p>
              </>
            ) : qrPreviewUrl ? (
              <>
                <img
                  src={qrPreviewUrl}
                  alt="Uploaded QR"
                  className="w-24 h-24 object-cover rounded-xl border border-warm-200 shadow-subtle"
                />
                {qrVerified ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> UPI QR format verified
                  </div>
                ) : (
                  <p className="text-xs text-charcoal-500 font-medium">Click to choose a different image</p>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-warm-200 text-charcoal-600 flex items-center justify-center shadow-subtle">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-charcoal-800">Upload your personal UPI QR</p>
                  <p className="text-[11px] text-charcoal-400 mt-0.5">PNG, JPEG or WebP · decoded on your device</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 text-white text-xs font-bold shadow-subtle">
                  <Upload className="w-3.5 h-3.5" /> Choose Image
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Verified UPI details banner */}
          {qrVerified && upiId && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-mono font-bold text-emerald-900 truncate">{upiId}</p>
                {payeeName && (
                  <p className="text-[11px] text-emerald-700 truncate">{payeeName}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual UPI ID Mode */}
      {upiMode === 'manual' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
              UPI ID
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                setUpiError('');
              }}
              placeholder="e.g. yourname@oksbi"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-colors font-mono font-medium ${
                upiError
                  ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                  : 'border-warm-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
              Payee Name <span className="font-normal text-charcoal-400">(optional)</span>
            </label>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder={fullName || currentUser.fullName}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium"
            />
          </div>
          <p className="text-[11px] text-charcoal-500 bg-warm-100 rounded-xl p-2.5 leading-relaxed">
            Note: Manual UPI IDs are checked for format validity. For the green verified badge, upload a QR image.
          </p>
        </div>
      )}

      {upiError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700 leading-relaxed">{upiError}</p>
        </div>
      )}

      <div className="flex gap-2.5 pt-1">
        <button
          onClick={goBack}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-700 text-xs font-bold hover:bg-warm-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={() => {
            if (!upiId && !qrFile) {
              goNext(); // skip UPI
              return;
            }
            handleUpiStepNext();
          }}
          disabled={qrDecoding}
          className="btn-action-primary flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-card disabled:opacity-50"
        >
          <span>{upiId ? 'Review Details' : 'Skip for now'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Step 4: Review & Finish
  const renderStep4 = () => {
    const hasUpi = Boolean(upiId);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-charcoal-900">Review & Complete Setup</h3>
          <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">
            Confirm your commute profile and payment destination.
          </p>
        </div>

        {/* Profile summary card */}
        <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden divide-y divide-warm-100 shadow-subtle">
          <div className="p-4">
            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider mb-2">
              Profile
            </p>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${currentUser.avatarColor}`}
              >
                {currentUser.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-charcoal-900 truncate">
                  {fullName || currentUser.fullName}
                </p>
                <p className="text-xs text-charcoal-500 truncate">{currentUser.email}</p>
                {phone && phone.trim() !== '+91' && phone.trim() !== '+91 ' && (
                  <p className="text-xs text-charcoal-400 mt-0.5">{phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider mb-1">
                Your Personal Code
              </p>
              <p className="font-mono text-base font-black tracking-widest text-brand-800">
                {currentUser.inviteCode}
              </p>
            </div>
            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              Active & Shareable
            </span>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider mb-2">
              UPI Payment Destination
            </p>
            {hasUpi ? (
              <div className="flex items-center gap-2.5">
                {qrVerified ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <QrCode className="w-5 h-5 text-charcoal-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-charcoal-900 truncate">
                    {upiId}
                  </p>
                  {payeeName && (
                    <p className="text-[11px] text-charcoal-500 truncate">{payeeName}</p>
                  )}
                  {qrVerified ? (
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Format verified from QR
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-700 mt-0.5">Manual UPI entry</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-charcoal-400 italic">Not set up yet (can be added later)</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={goBack}
            disabled={isSaving}
            className="px-4 py-3 rounded-xl border border-warm-300 text-charcoal-700 text-xs font-bold hover:bg-warm-100 transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <button
            onClick={handleFinish}
            disabled={isSaving}
            className="btn-action-primary flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold transition-all shadow-card disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Entering Expenso…</span>
              </>
            ) : (
              <>
                <span>Complete Setup & Enter Expenso</span>
                <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal backdrop"
      />

      {/* Modal Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
      >
        <div className="relative w-full sm:max-w-md pointer-events-auto bg-warm-50 border-t sm:border border-warm-200 rounded-t-3xl sm:rounded-3xl shadow-elevated max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-scale-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm-100 shrink-0">
            <div>
              <h2
                id="onboarding-modal-title"
                className="text-base font-black text-charcoal-900 tracking-tight"
              >
                {STEP_LABELS[step]}
              </h2>
              <p className="text-[11px] text-charcoal-400 mt-0.5 font-medium">
                Step {step} of {totalSteps}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-1.5 rounded-xl text-charcoal-500 hover:bg-warm-200 hover:text-charcoal-900 transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="px-5 py-3 border-b border-warm-100 bg-white/50 shrink-0">
            <StepIndicator currentStep={step} totalSteps={totalSteps} />
          </div>

          {/* Step Content */}
          <div className="px-5 py-5 overflow-y-auto flex-1">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingModal;
