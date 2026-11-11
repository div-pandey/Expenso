import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  CreditCard,
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
  2: 'Your Invite Code',
  3: 'UPI Payment Setup',
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
              className={`flex items-center justify-center rounded-full font-bold transition-all text-xs
                ${isActive ? 'w-8 h-8 bg-brand-700 text-white shadow-sm ring-2 ring-brand-700/20' : ''}
                ${isDone ? 'w-7 h-7 bg-emerald-600 text-white shadow-sm' : ''}
                ${!isActive && !isDone ? 'w-7 h-7 bg-warm-200 text-charcoal-400' : ''}
              `}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                step
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`h-0.5 flex-1 max-w-[32px] transition-colors ${
                  step < currentStep ? 'bg-emerald-600' : 'bg-warm-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Main Full-Screen Onboarding Component ────────────────────────────────────

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    onboardingOptions,
    closeOnboarding,
    updatePaymentMethod,
    registerUser,
    setShowLandingPage,
    showToast,
    openLogin,
    logout,
  } = useApp();

  const [step, setStep] = useState<Step>(() => onboardingOptions?.startStep || 1);

  useEffect(() => {
    if (onboardingOptions?.startStep) {
      setStep(onboardingOptions.startStep);
    }
  }, [onboardingOptions?.startStep]);

  // Step 1 – Account Registration
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Step 3 – UPI Setup (COMPULSORY)
  const [upiMode, setUpiMode] = useState<'qr' | 'manual'>('qr');
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

  const totalSteps: number = 4;

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as Step);
  const goBack = () => {
    if (step === 1) {
      closeOnboarding();
    } else if (step === 2 && onboardingOptions?.oauthProvider) {
      logout();
      closeOnboarding();
    } else {
      setStep((s) => Math.max(s - 1, 1) as Step);
    }
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

    if (!password) {
      setProfileError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setProfileError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setProfileError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsRegistering(true);
    try {
      const newUser = await registerUser(fullName.trim(), trimmedEmail, password);
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
        setUpiError(result.error ?? 'Could not decode QR. Try a clearer image or enter your UPI ID manually.');
        setQrVerified(false);
      }
    } finally {
      setQrDecoding(false);
    }
    e.target.value = '';
  };

  const handleUseSeedUpi = () => {
    const name = fullName.trim() || currentUser.fullName || 'Student';
    const cleanHandle = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'expenso';
    const sampleUpi = `${cleanHandle}@oksbi`;
    setUpiId(sampleUpi);
    setPayeeName(name);
    setQrPayload(`upi://pay?pa=${sampleUpi}&pn=${encodeURIComponent(name)}&cu=INR&tn=Expenso`);
    setQrVerified(true);
    setUpiError('');
    setQrPreviewUrl(null);
  };

  const handleUpiStepNext = () => {
    setUpiError('');
    const trimmedId = upiId.trim();

    if (!trimmedId) {
      setUpiError('UPI setup is compulsory. Please enter your UPI ID or upload a payment QR.');
      return;
    }

    if (!isValidUpiId(trimmedId)) {
      setUpiError('Invalid UPI ID format. Example: yourname@okhdfcbank or 9876543210@paytm');
      return;
    }

    setUpiId(trimmedId);
    goNext();
  };

  // ── Step 4: Finish Setup ───────────────────────────────────────────────────

  const handleFinish = async () => {
    if (!upiId.trim()) {
      setUpiError('UPI setup is compulsory. Please complete step 3.');
      setStep(3);
      return;
    }

    setIsSaving(true);
    try {
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
      setShowLandingPage(false);
      closeOnboarding();
      showToast(`Welcome to Expenso, ${fullName.trim() || currentUser.fullName}!`);
    } catch {
      showToast('Failed to save payment details. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render Step 1: Create Account ──────────────────────────────────────────

  const renderStep1 = () => (
    <form onSubmit={handleRegisterNext} className="space-y-4 max-w-sm mx-auto w-full">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-700" />
          <span>Quick 30-Second Signup</span>
        </div>
        <h3 className="text-xl font-black text-charcoal-900 tracking-tight">
          Create your Expenso Account
        </h3>
        <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
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
          required
          autoFocus
          className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (profileError) setProfileError('');
          }}
          placeholder="e.g. name@campus.edu"
          required
          className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <Lock className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (profileError) setProfileError('');
            }}
            placeholder="At least 6 characters"
            required
            className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
          <Lock className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-brand-700" />
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (profileError) setProfileError('');
            }}
            placeholder="Re-enter password"
            required
            className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors cursor-pointer"
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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
        className="btn-action-primary group relative overflow-hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm transition-all duration-150 active:scale-[0.99] shadow-card disabled:opacity-50 cursor-pointer"
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

  // ── Render Step 2: Invite Code ─────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-5 max-w-sm mx-auto w-full">
      {/* User greeting */}
      <div className="flex flex-col items-center gap-2.5 pt-1 text-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-subtle ${currentUser.avatarColor}`}
        >
          {currentUser.initials}
        </div>
        <div>
          <h3 className="text-lg font-black text-charcoal-900">
            Account Created, {currentUser.fullName}!
          </h3>
          <p className="text-xs text-charcoal-500 mt-0.5 font-medium">{currentUser.email}</p>
        </div>
      </div>

      {/* Personal 6-char Invite Code Card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/40 border border-brand-200 p-5 text-center space-y-3 shadow-subtle">
        <p className="text-[11px] font-bold text-brand-800 uppercase tracking-wider">
          Your Personal 6-Character Invite Code
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-brand-900 bg-white/90 px-5 py-2 rounded-2xl border border-brand-200 shadow-sm">
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
            className="btn-action-secondary p-3 rounded-2xl bg-white hover:bg-warm-100 border border-brand-300 text-brand-800 transition-all shadow-subtle cursor-pointer"
            title="Copy Invite Code"
          >
            {copiedCode ? (
              <Check className="w-5 h-5 text-emerald-600 animate-pop-in" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-charcoal-600 max-w-xs mx-auto leading-relaxed">
          Share this unique personal code with your commute friends so they can add you to their daily ride Blends.
        </p>
      </div>

      {/* Next Step Info */}
      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Next: Compulsory UPI Payment Setup</span>
        </p>
        <p className="text-emerald-800 leading-relaxed text-[11px]">
          To ensure verified balance settlements and allow friends to repay you with 1-click on mobile, you must configure your UPI ID next.
        </p>
      </div>

      {/* Single Action Button: Must Proceed to UPI */}
      <div className="pt-2">
        <button
          onClick={goNext}
          className="btn-action-primary w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold transition-all shadow-card cursor-pointer"
        >
          <span>Continue to UPI Setup (Compulsory)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── Render Step 3: UPI Setup (COMPULSORY) ───────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-4 max-w-sm mx-auto w-full">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Mandatory Step for Settlements</span>
        </div>
        <h3 className="text-xl font-black text-charcoal-900">UPI Payment Setup</h3>
        <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
          Provide your UPI details so friends can pay you back instantly via Google Pay, PhonePe, Paytm, or BHIM.
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
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-brand-300 bg-brand-50 text-brand-800 text-xs font-bold hover:bg-brand-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-700" />
            <span>Use Verified Test Student QR ({currentUser.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'}@oksbi)</span>
          </button>

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2.5 px-4 py-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              qrDecoding
                ? 'border-brand-400 bg-brand-50/50'
                : qrVerified
                ? 'border-emerald-500 bg-emerald-50/40'
                : upiError
                ? 'border-red-300 bg-red-50/40'
                : 'border-warm-300 bg-white hover:border-brand-400 hover:bg-brand-50/20'
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
                  <p className="text-xs text-charcoal-500">Tap to upload a clearer image</p>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center text-charcoal-500 shadow-subtle">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-charcoal-800">Tap to upload UPI QR screenshot</p>
                  <p className="text-[11px] text-charcoal-400 mt-0.5">PNG, JPG, or WebP up to 5 MB</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Decoded Payee feedback */}
          {qrVerified && upiId && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 animate-pop-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold truncate">Payee: {payeeName}</p>
                <p className="font-mono text-[11px] text-emerald-700 truncate">{upiId}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Mode */}
      {upiMode === 'manual' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
              UPI ID (VPA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                if (upiError) setUpiError('');
              }}
              placeholder="e.g. 9876543210@paytm or name@upi"
              className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
              Payee Display Name
            </label>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder={fullName || currentUser.fullName}
              className="w-full px-3.5 py-3 rounded-xl border border-warm-300 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-colors font-medium shadow-subtle"
            />
          </div>
        </div>
      )}

      {upiError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700 leading-relaxed">{upiError}</p>
        </div>
      )}

      {/* Action Buttons: Backward and Compulsory Forward */}
      <div className="flex gap-2.5 pt-2">
        <button
          onClick={goBack}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-warm-300 text-charcoal-700 text-xs font-bold hover:bg-warm-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleUpiStepNext}
          disabled={qrDecoding || !upiId.trim()}
          className="btn-action-primary flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-card disabled:opacity-50 cursor-pointer"
        >
          <span>Continue to Final Step</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // ── Render Step 4: Review & Finish ─────────────────────────────────────────

  const renderStep4 = () => (
    <div className="space-y-4 max-w-sm mx-auto w-full">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold mb-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
          <span>Ready to Launch</span>
        </div>
        <h3 className="text-xl font-black text-charcoal-900">Review & Finish Setup</h3>
        <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
          Verify your commute profile and payment settlement credentials.
        </p>
      </div>

      <div className="rounded-2xl border border-warm-200 bg-white p-4 space-y-3.5 shadow-subtle">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-subtle ${currentUser.avatarColor}`}
          >
            {currentUser.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-charcoal-900 truncate">
              {fullName || currentUser.fullName}
            </p>
            <p className="text-[11px] text-charcoal-500 truncate">{email || currentUser.email}</p>
          </div>
        </div>

        {/* Invite Code */}
        <div className="border-t border-warm-100 pt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
              Personal Invite Code
            </p>
            <p className="font-mono text-base font-black text-brand-900 mt-0.5">
              {currentUser.inviteCode}
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold">
            Active
          </span>
        </div>

        {/* UPI Method */}
        <div className="border-t border-warm-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-1">
            Verified UPI Method
          </p>
          <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-bold text-charcoal-900 truncate">{upiId}</p>
              <p className="text-[11px] text-charcoal-500 truncate">{payeeName}</p>
            </div>
            <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 pt-2">
        <button
          onClick={goBack}
          disabled={isSaving}
          className="px-4 py-3 rounded-xl border border-warm-300 text-charcoal-700 text-xs font-bold hover:bg-warm-100 transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleFinish}
          disabled={isSaving}
          className="btn-action-primary flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold transition-all shadow-card disabled:opacity-50 whitespace-nowrap cursor-pointer"
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

  return (
    <div
      className="fixed inset-0 z-50 bg-warm-50 flex flex-col min-h-screen text-charcoal-900 overflow-y-auto selection:bg-brand-100 selection:text-brand-900"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
      }}
    >
      <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-5 py-2">
        {/* Full-Screen Top Navigation Bar */}
        <div>
          <div className="flex items-center justify-between py-2 border-b border-warm-200/80 shrink-0">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="p-1.5 -ml-1 rounded-xl text-charcoal-600 hover:bg-warm-200 hover:text-charcoal-900 transition-colors cursor-pointer"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-base font-black text-charcoal-900 tracking-tight">
                  {STEP_LABELS[step]}
                </h2>
                <p className="text-[11px] text-charcoal-500 font-medium">
                  Step {step} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Expenso Brand Icon Badge */}
            <div className="w-8 h-8 rounded-xl bg-[#12543F] flex items-center justify-center p-1.5 shadow-subtle shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-full h-full">
                <path
                  d="M9 10h14M9 16h10M9 22h14M13 6v20"
                  stroke="white"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Full-Screen Step Indicator */}
          <div className="py-3 border-b border-warm-200/60 shrink-0">
            <StepIndicator currentStep={step} totalSteps={totalSteps} />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 py-5 flex flex-col justify-center">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Bottom subtle safety notice */}
        <div className="text-center pt-2 pb-1 text-[11px] text-charcoal-400">
          <span>Expenso Commute Safety • Strict Payer Ownership</span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
