import React, { useState, useEffect, useRef } from 'react';
import { BrandWordmark, ExpensoLogo } from '../common/BrandWordmark';
import { TransportIcon } from '../common/TransportIcon';
import type { TransportCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Monitor,
  Globe,
  Download,
  Receipt,
  FileSpreadsheet,
  Keyboard,
  Lock,
  Check,
  X,
  ChevronDown,
  Zap,
  ExternalLink,
  Layers,
  RefreshCw,
  Eye,
  Train,
  Bus,
  Navigation,
  Coffee,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onExploreDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onExploreDemo,
}) => {
  const { isLoggedIn, setShowLandingPage } = useApp();
  const [activeScenario, setActiveScenario] = useState<'metro_hop' | 'cab_pool' | 'chai_bus'>('metro_hop');
  const [activeGalleryTab, setActiveGalleryTab] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live Interactive Commute Splitter Playground State
  const [calcPreset, setCalcPreset] = useState<'auto' | 'metro' | 'cab' | 'custom'>('metro');
  const [calcAmount, setCalcAmount] = useState<number>(160);
  const [calcCommuters, setCalcCommuters] = useState<number>(4);
  const [calcSettled, setCalcSettled] = useState<boolean>(false);

  // Sticky Smart Header visibility state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // At top of the page, always keep header visible
      if (currentScrollY <= 25) {
        setIsHeaderVisible(true);
      } else if (delta > 4) {
        setIsHeaderVisible(false);
      } else if (delta < -4) {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(prev => (prev === index ? null : index));
  };

  // Gallery Showcase Data with real screenshots
  const showcaseTabs = [
    {
      id: 'dashboard',
      label: 'Home Dashboard',
      icon: Layers,
      title: 'Net Balance Hero & Period Commute Spend',
      description:
        'Live summary of who owes whom in your Blend. One-tap toggles between Today, This Week, This Month, and All Time commute spends, so you always know where transit money goes.',
      image: '/gallery/01_dashboard_showcase.png',
      badge: 'Live Dashboard',
      highlights: [
        'Instant Net Balance hero with INR integer paise precision',
        'Spend filters: Today, This Week, This Month, All Time',
        'Quick 6-character friend code invite bar',
      ],
    },
    {
      id: 'zero-circular',
      label: 'Zero Circular Debts',
      icon: Zap,
      title: 'Greedy Balance Resolution Engine',
      description:
        'Stop chaotic circular debts. If Rahul owes Aman ₹40 and Aman owes Divyansh ₹40, Expenso collapses the cycle into a single transfer. Net balances across every group always sum to exactly ₹0.00.',
      image: '/gallery/02_zero_circular_debts_showcase.png',
      badge: 'Mathematical Engine',
      highlights: [
        'Greedy graph simplification eliminates redundant repayments',
        'Debtor filtering: debtors only see who they actually owe',
        'Pure lenders see a reassuring "You don\'t owe anything!"',
      ],
    },
    {
      id: 'ai-verification',
      label: 'Gemini AI Verification',
      icon: ShieldCheck,
      title: 'Automated Receipt Inspection via Google Gemini AI',
      description:
        'When a friend uploads a UPI payment screenshot, Google Gemini AI Vision automatically reads the image to verify the payee name, amount transferred, and bank UTR reference before recipient approval.',
      image: '/gallery/03_upi_settlement_ai_verification_showcase.png',
      badge: 'Google Gemini AI',
      highlights: [
        'Inspects UPI UTR / Transaction Reference number automatically',
        'Cross-verifies payee name and transferred amount in paise',
        'Debt only clears after recipient taps "Received" inside Expenso',
      ],
    },
    {
      id: 'rapid-logging',
      label: '10s Logging & CSV Export',
      icon: FileSpreadsheet,
      title: '10-Second Ride Logging + Direct CSV Export',
      description:
        'Record auto, metro, cab, and snack expenses in seconds right at the turnstile. Need a monthly hostel budget report? Export all filtered rides and settlements to CSV in 1 click.',
      image: '/gallery/04_rapid_logging_and_csv_export_showcase.png',
      badge: 'Speed & Budgeting',
      highlights: [
        'Fast 10-second entry with immutable payer locking',
        'Export full activity history to CSV for Excel / Google Sheets',
        'Keyboard shortcuts: Ctrl+N (New Ride), Ctrl+S (Settle Up)',
      ],
    },
    {
      id: 'cross-device',
      label: 'Cross-Device Sync',
      icon: RefreshCw,
      title: 'Instant Multi-Device Realtime Sync',
      description:
        'Log a ride on your Android phone, review it on your Windows desktop, and check balances in any web browser. Powered by Supabase Realtime broadcast channels and 100% offline sandbox support.',
      image: '/gallery/05_cross_device_sync_showcase.png',
      badge: 'Android • Windows • Web',
      highlights: [
        'Simultaneous sync across Android (.apk), Windows (.exe), and Web',
        'In-app push notifications for new rides & settlement proofs',
        'Full offline sandbox mode for campus travel without network',
      ],
    },
  ];

  const scenarios: Record<string, {
    title: string;
    description: string;
    rides: { category: TransportCategory; name: string; paidBy: string; amount: number; split: string }[];
    netMath: { debtor: string; creditor: string; amount: number; detail: string }[];
    totalSpend: number;
  }> = {
    metro_hop: {
      title: 'Daily Metro + Auto Hop',
      description: 'Morning rush to North Campus via 3 separate transit legs',
      rides: [
        { category: 'erickshaw', name: '3 E-Rickshaws to Metro Gate', paidBy: 'Divyansh', amount: 90, split: '3 ways (₹30 each)' },
        { category: 'metro', name: 'Yellow Line Metro Tokens', paidBy: 'Rahul', amount: 120, split: '3 ways (₹40 each)' },
        { category: 'auto', name: 'Shared Auto to Faculty Gate', paidBy: 'Aman', amount: 60, split: '3 ways (₹20 each)' },
      ],
      netMath: [
        { debtor: 'Rahul', creditor: 'Divyansh', amount: 10, detail: 'Net settlement after auto & metro' },
        { debtor: 'Aman', creditor: 'Divyansh', amount: 20, detail: 'Net settlement after auto & metro' },
      ],
      totalSpend: 270,
    },
    cab_pool: {
      title: 'Late Night Lab Cab Pool',
      description: 'Heading back together when the metro closes at 11:00 PM',
      rides: [
        { category: 'cab', name: 'Uber XL from Tech Campus', paidBy: 'Divyansh', amount: 360, split: '3 ways (₹120 each)' },
        { category: 'other', name: 'Mid-ride Chai & Snacks', paidBy: 'Rahul', amount: 90, split: '3 ways (₹30 each)' },
      ],
      netMath: [
        { debtor: 'Rahul', creditor: 'Divyansh', amount: 90, detail: '₹120 cab share minus ₹30 chai' },
        { debtor: 'Aman', creditor: 'Divyansh', amount: 150, detail: 'Full share of cab (₹120) + chai (₹30)' },
      ],
      totalSpend: 450,
    },
    chai_bus: {
      title: 'Inter-College Bus & Snacks',
      description: 'Attending a joint festival or hackathon in another campus',
      rides: [
        { category: 'bus', name: 'City Bus Passes (3 tickets)', paidBy: 'Aman', amount: 75, split: '3 ways (₹25 each)' },
        { category: 'other', name: 'Cutting Chai & Maggi Break', paidBy: 'Rahul', amount: 150, split: '3 ways (₹50 each)' },
        { category: 'auto', name: 'Auto back to Metro Station', paidBy: 'Divyansh', amount: 60, split: '3 ways (₹20 each)' },
      ],
      netMath: [
        { debtor: 'Divyansh', creditor: 'Rahul', amount: 25, detail: 'Settles food & transport gap' },
        { debtor: 'Aman', creditor: 'Rahul', amount: 20, detail: 'Settles food & transport gap' },
      ],
      totalSpend: 285,
    },
  };

  const faqs = [
    {
      q: 'Which platforms does Expenso support?',
      a: 'Expenso is available as a native Android App (.apk), a native Windows Desktop App (.exe setup installer & standalone portable), and an instant Web App that runs in any modern browser. All platforms share the same account, blends, and real-time live sync.',
    },
    {
      q: 'How do I install the Android APK on my phone?',
      a: 'Download expenso.apk directly from this website. Tap the downloaded file on your phone. If prompted with "Install unknown apps", tap Settings -> Allow from this source, then tap Install. Expenso runs with full native performance and offline caching.',
    },
    {
      q: 'How does the Windows Desktop App work?',
      a: 'The Windows edition is available as an installer wizard (Expenso-Setup.exe) or a standalone executable (Expenso.exe). Built with high-DPI C# and Microsoft WebView2, it includes Windows tray integration, keyboard shortcuts (Ctrl+N, Ctrl+S), Ctrl+V screenshot clipboard pasting, and zero browser chrome.',
    },
    {
      q: 'How does Gemini AI Payment Verification work?',
      a: 'When a friend settles a debt and uploads a payment confirmation screenshot, Google Gemini AI Vision scans the image client-side to verify the recipient name, transferred amount, and the bank UTR / transaction ID. Outstanding debts only clear when the recipient reviews the proof and taps "Received".',
    },
    {
      q: 'Does Expenso connect to my bank account or ask for my UPI PIN?',
      a: 'Never. Expenso is not a payment gateway and never asks for bank account numbers, net banking passwords, or UPI PINs. When paying via UPI, Expenso deep-links directly into your official UPI apps (Google Pay, PhonePe, Paytm, BHIM) where authentication is handled by your bank.',
    },
    {
      q: 'Can I export my ride and repayment history to CSV for budgeting?',
      a: 'Yes! Inside the Activity tab, click "Export CSV" to download a clean, formatted spreadsheet of all filtered rides, repayments, split shares, and notes for hostel accounting and monthly expense tracking.',
    },
    {
      q: 'Can I test Expenso offline without setting up an account or cloud backend?',
      a: 'Yes! Expenso features a built-in multi-account Sandbox mode that runs 100% offline. You can test four pre-configured campus profiles (Divyansh, Rahul, Aman, Priya), create mock rides, test balance math, and verify repayments without any network connection.',
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50 text-charcoal-900 font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Sticky Smart Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-warm-50/95 backdrop-blur-md border-b-2 border-warm-200/80 transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? 'translate-y-0 shadow-sm' : '-translate-y-full'
        }`}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-18 sm:h-20 flex items-center justify-between gap-4">
          {/* Section 1: Logo & Brand Wordmark (Farthest Left Corner) */}
          <div
            onClick={() => {
              if (isLoggedIn) {
                setShowLandingPage(false);
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="cursor-pointer hover:opacity-90 active:scale-95 transition-all flex items-center gap-3 shrink-0"
            title={isLoggedIn ? 'Return to Expenso Dashboard' : 'Expenso Home'}
          >
            <BrandWordmark size="md" />
          </div>

          {/* Section 2: Centered Navigation Links with Generous Spacing */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4 2xl:gap-6 text-xs xl:text-sm font-bold text-charcoal-600">
            <button
              onClick={() => scrollToSection('downloads')}
              className="whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-brand-800 hover:text-brand-900 hover:bg-brand-50/90 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-brand-700 shrink-0" />
              <span>Get Apps</span>
            </button>
            <button
              onClick={() => scrollToSection('showcase')}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl hover:text-charcoal-900 hover:bg-warm-100 transition-all cursor-pointer"
            >
              App Gallery
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl hover:text-charcoal-900 hover:bg-warm-100 transition-all cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('scenarios')}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl hover:text-charcoal-900 hover:bg-warm-100 transition-all cursor-pointer"
            >
              Commute Simulator
            </button>
            <button
              onClick={() => scrollToSection('comparison')}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl hover:text-charcoal-900 hover:bg-warm-100 transition-all cursor-pointer"
            >
              Why Expenso
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl hover:text-charcoal-900 hover:bg-warm-100 transition-all cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Section 3: Header Action Buttons (Farthest Right Corner) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {isLoggedIn ? (
              <button
                onClick={() => setShowLandingPage(false)}
                className="btn-action-primary group relative overflow-hidden flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="relative z-10">Dashboard</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
                <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="whitespace-nowrap shrink-0 text-xs sm:text-sm font-bold text-charcoal-700 hover:text-charcoal-900 px-3.5 sm:px-4 py-2.5 rounded-xl hover:bg-warm-100 active:scale-95 transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-action-primary group relative overflow-hidden flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-28 lg:pt-32 pb-14 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Hero Copy */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-charcoal-900 tracking-tight leading-[1.12]">
              Your rides. Your crew. <br className="hidden sm:inline" />
              <span className="text-brand-700">Zero money confusion.</span>
            </h1>

            <p className="text-sm sm:text-base text-charcoal-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Track shared autos, metros, cabs, and chai in 10 seconds. Built for college friends with integer paise precision, zero circular debts, Gemini AI payment verification, and 1-tap CSV budgeting.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              {isLoggedIn ? (
                <button
                  onClick={() => setShowLandingPage(false)}
                  className="btn-action-primary group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-xl shadow-elevated"
                >
                  <span className="relative z-10">Open My Dashboard</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1.5 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                </button>
              ) : (
                <button
                  onClick={onGetStarted}
                  className="btn-action-primary group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-xl shadow-elevated"
                >
                  <Globe className="w-4 h-4 text-emerald-300" />
                  <span className="relative z-10">Launch Web App</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1.5 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                </button>
              )}

              <button
                onClick={() => scrollToSection('downloads')}
                className="btn-action-secondary group w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-warm-100 text-charcoal-800 text-sm font-bold rounded-xl border border-warm-300 shadow-subtle flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-brand-700" />
                <span>Download Android & Windows</span>
              </button>
            </div>

            {/* Platform Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-charcoal-600 font-semibold">
              <span className="text-[11px] uppercase tracking-wider text-charcoal-400 font-bold">Available On:</span>
              <a href="/downloads/expenso.apk" download className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-warm-100 border border-warm-200 rounded-lg text-charcoal-800 shadow-xs transition-colors">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android APK (5.3 MB)</span>
              </a>
              <a href="/downloads/Expenso-Setup.exe" download className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-warm-100 border border-warm-200 rounded-lg text-charcoal-800 shadow-xs transition-colors">
                <Monitor className="w-3.5 h-3.5 text-sky-600" />
                <span>Windows EXE (1.9 MB)</span>
              </a>
              <button
                onClick={() => {
                  if (onExploreDemo) onExploreDemo();
                  else setShowLandingPage(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-warm-100 border border-warm-200 rounded-lg text-charcoal-800 shadow-xs transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-purple-600" />
                <span>Web App (Browser)</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-2 text-xs text-charcoal-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Free & No Ads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Gemini AI Receipt Proofs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Circular Debts</span>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Interactive Live Commute Splitter Playground */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-3xl border border-warm-200/90 shadow-card hover:shadow-elevated transition-shadow p-6 sm:p-7 space-y-5">
              {/* Playground Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ExpensoLogo size="sm" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-700 font-extrabold block">
                      Interactive Demo
                    </span>
                    <h3 className="font-extrabold text-sm text-charcoal-900 tracking-tight">
                      Live Commute Splitter
                    </h3>
                  </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Instant Math
                </span>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider block">
                  Select Typical Ride
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCalcPreset('auto');
                      setCalcAmount(90);
                      setCalcCommuters(3);
                    }}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                      calcPreset === 'auto'
                        ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                        : 'bg-warm-50/80 border-warm-200 text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900'
                    }`}
                  >
                    <span className="text-[11px]">Auto Pool</span>
                    <span className="font-mono text-xs text-brand-700">₹90</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCalcPreset('metro');
                      setCalcAmount(160);
                      setCalcCommuters(4);
                    }}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                      calcPreset === 'metro'
                        ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                        : 'bg-warm-50/80 border-warm-200 text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900'
                    }`}
                  >
                    <span className="text-[11px]">Metro Route</span>
                    <span className="font-mono text-xs text-brand-700">₹160</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCalcPreset('cab');
                      setCalcAmount(320);
                      setCalcCommuters(4);
                    }}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                      calcPreset === 'cab'
                        ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                        : 'bg-warm-50/80 border-warm-200 text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900'
                    }`}
                  >
                    <span className="text-[11px]">Late Cab</span>
                    <span className="font-mono text-xs text-brand-700">₹320</span>
                  </button>
                </div>
              </div>

              {/* Commuters Counter & Amount adjustment */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-warm-50/90 rounded-2xl border border-warm-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                    Fare Amount
                  </span>
                  <div className="flex items-center gap-1 font-mono font-black text-lg text-charcoal-900">
                    <span>₹</span>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={calcAmount}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 0);
                        setCalcAmount(val);
                        setCalcPreset('custom');
                      }}
                      className="w-full bg-transparent font-mono font-black text-lg text-charcoal-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-warm-50/90 rounded-2xl border border-warm-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">
                    Commuters
                  </span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCalcCommuters((c) => Math.max(2, c - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-warm-200 text-charcoal-700 hover:bg-warm-100 flex items-center justify-center font-bold text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-black text-sm sm:text-base text-charcoal-900">
                      {calcCommuters} riders
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalcCommuters((c) => Math.min(8, c + 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-warm-200 text-charcoal-700 hover:bg-warm-100 flex items-center justify-center font-bold text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Result Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-charcoal-500 uppercase tracking-wider text-[11px]">
                    Individual Share
                  </span>
                  <span className="font-mono text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-brand-200">
                    Paise-Perfect
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-charcoal-900 font-mono tracking-tight">
                      ₹{Math.floor(calcAmount / calcCommuters)}
                      {calcAmount % calcCommuters > 0 ? `–₹${Math.floor(calcAmount / calcCommuters) + 1}` : '.00'}
                    </span>
                    <span className="text-xs font-semibold text-charcoal-500">
                      / commuter
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-brand-700">
                    {calcCommuters}x equal split
                  </span>
                </div>

                <p className="text-[11px] text-charcoal-600 pt-1 leading-relaxed">
                  {calcAmount % calcCommuters === 0
                    ? `Exact ₹${(calcAmount / calcCommuters).toFixed(2)} per person with ₹0.00 rounding discrepancy.`
                    : `Even distribution: remainder ₹${calcAmount % calcCommuters} distributed across ${calcAmount % calcCommuters} members.`}
                </p>
              </div>

              {/* Interactive Simulation Action */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCalcSettled(true);
                    setTimeout(() => setCalcSettled(false), 2400);
                  }}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-subtle cursor-pointer ${
                    calcSettled
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-brand-700 hover:bg-brand-800 text-white'
                  }`}
                >
                  {calcSettled ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>All {calcCommuters - 1} Debts Settled in 1 Direct Transfer!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-white" />
                      <span>Simulate 1-Tap UPI Settlement</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[11px] text-charcoal-400 px-1">
                  <span>Zero circular debts</span>
                  <button
                    onClick={onGetStarted}
                    className="font-bold text-brand-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Start Real Pool</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Official Downloads Section */}
      <section id="downloads" className="py-16 sm:py-24 bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
              Download Expenso for your devices
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Install native mobile and desktop apps with offline caching, high performance, and real-time live synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* 1. Android Mobile App */}
            <div className="p-6 rounded-3xl bg-warm-50 border-2 border-warm-200 shadow-card flex flex-col justify-between hover:border-brand-400 transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-warm-300 text-brand-800 flex items-center justify-center shadow-subtle">
                    <Smartphone className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-charcoal-900">Android App</h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">Package: <code className="font-mono text-[11px]">expenso.apk</code></p>
                </div>

                <ul className="space-y-2 text-xs text-charcoal-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Native Capacitor container & fast launch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Direct UPI app handoff (GPay, PhonePe, Paytm)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>In-app notifications for split shares</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Touch-optimized for fast metro ride logging</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-3">
                <a
                  href="/downloads/expenso.apk"
                  download="expenso.apk"
                  className="btn-action-primary group w-full py-3.5 px-4 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-subtle flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Download APK (5.3 MB)</span>
                </a>
                <p className="text-[10px] text-charcoal-400 text-center">
                  Android 8.0 or higher · Tap file to install
                </p>
              </div>
            </div>

            {/* 2. Windows Desktop App */}
            <div className="p-6 rounded-3xl bg-warm-50 border-2 border-brand-300 shadow-card flex flex-col justify-between ring-2 ring-brand-500/10 hover:border-brand-500 transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-warm-300 text-brand-800 flex items-center justify-center shadow-subtle">
                    <Monitor className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-charcoal-900">Windows Desktop App</h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">Setup Wizard + Standalone Portable EXE</p>
                </div>

                <ul className="space-y-2 text-xs text-charcoal-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Native C# + Microsoft WebView2 executable</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>System tray icon with quick ride actions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Clipboard paste (Ctrl+V) for screenshot proofs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Keyboard shortcuts: Ctrl+N, Ctrl+S, Ctrl+B, F1</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>1-click CSV Export for student budgeting</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-2">
                <a
                  href="/downloads/Expenso-Setup.exe"
                  download="Expenso-Setup.exe"
                  className="btn-action-primary group w-full py-3.5 px-4 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-subtle flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Download Setup Wizard (1.9 MB)</span>
                </a>
                <div className="text-center">
                  <a
                    href="/downloads/Expenso.exe"
                    download="Expenso.exe"
                    className="text-[11px] font-bold text-charcoal-600 hover:text-brand-700 inline-flex items-center gap-1"
                  >
                    <span>Or download Portable Expenso.exe (1.1 MB)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* 3. Instant Web App */}
            <div className="p-6 rounded-3xl bg-warm-50 border-2 border-warm-200 shadow-card flex flex-col justify-between hover:border-brand-400 transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-warm-300 text-brand-800 flex items-center justify-center shadow-subtle">
                    <Globe className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-charcoal-900">Instant Web App</h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">Runs in Chrome, Safari, Firefox & Edge</p>
                </div>

                <ul className="space-y-2 text-xs text-charcoal-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Instant access from any device or tablet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>Offline Sandbox mode with demo profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Google & GitHub 1-click fast sign-in</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Live Supabase cloud sync across team</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-3">
                <button
                  onClick={() => {
                    if (isLoggedIn) setShowLandingPage(false);
                    else onGetStarted();
                  }}
                  className="btn-action-primary group w-full py-3.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-subtle flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>Launch Web App</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[10px] text-charcoal-400 text-center">
                  Runs directly in your browser with zero installation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Picture Showcase Gallery */}
      <section id="showcase" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
            See Expenso in action
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Explore actual app screens from the live desktop and mobile versions.
          </p>
        </div>

        {/* Tab selection buttons */}
        <div className="flex overflow-x-auto no-scrollbar justify-start sm:justify-center gap-2 pb-4 mb-8">
          {showcaseTabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeGalleryTab === idx;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveGalleryTab(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-700 text-white shadow-card scale-102'
                    : 'bg-white text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900 border border-warm-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-700'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Showcase Display Card */}
        <div className="bg-white rounded-3xl border-2 border-warm-200 shadow-elevated overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
            {/* Left Content / Annotations */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full">
                {showcaseTabs[activeGalleryTab].badge}
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                {showcaseTabs[activeGalleryTab].title}
              </h3>

              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                {showcaseTabs[activeGalleryTab].description}
              </p>

              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-bold text-charcoal-400 uppercase tracking-widest">Key Highlights</p>
                {showcaseTabs[activeGalleryTab].highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-charcoal-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={onGetStarted}
                  className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-subtle flex items-center gap-1.5 transition-all"
                >
                  <span>Try It in Web App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href="#downloads"
                  className="px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-charcoal-800 text-xs font-bold rounded-xl transition-all"
                >
                  Get Native Apps
                </a>
              </div>
            </div>

            {/* Right Visual Screenshot */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border-2 border-warm-200 shadow-card overflow-hidden bg-warm-100 relative group">
                <img
                  src={showcaseTabs[activeGalleryTab].image}
                  alt={showcaseTabs[activeGalleryTab].title}
                  className="w-full h-auto object-cover transform transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 pointer-events-none">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Screenshot</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section id="features" className="py-16 sm:py-24 bg-warm-100/60 border-y border-warm-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
              Powerful features you won&apos;t find in generic splitters
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Every detail is designed around college friends traveling together on autos, metros, cabs, and transit chai.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Gemini AI Payment Verification */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">01</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Verification</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Google Gemini AI Verification
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Gemini Vision AI inspects uploaded payment screenshots to extract UTR numbers, amounts, and recipient details so no one can fake a payment.
              </p>
            </div>

            {/* Feature 2: Zero Circular Debts */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">02</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Algorithm</span>
                </div>
                <Zap className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Zero Circular Debts
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Our greedy net balance resolution engine cancels out circular transfers. In a group of 5, 10 chaotic rides collapse into just 2 simple payments.
              </p>
            </div>

            {/* Feature 3: Strict Creator Ownership */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">03</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Integrity</span>
                </div>
                <Lock className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Strict Payer Immutability
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                You can only log rides you personally paid for. No one can forge bills in your name, enforced by schema-level PostgreSQL check constraints.
              </p>
            </div>

            {/* Feature 4: 1-Tap CSV Budget Export */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">04</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Export</span>
                </div>
                <FileSpreadsheet className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                One-Tap CSV Export
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Export all filtered transit rides and repayments into standard CSV files for monthly hostel budget records or personal tracking in Excel.
              </p>
            </div>

            {/* Feature 5: Native Desktop Convenience */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">05</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Desktop</span>
                </div>
                <Keyboard className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Ctrl+V Paste & Shortcuts
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Desktop users can press Ctrl+V to paste payment screenshots directly from Snipping Tool or WhatsApp, plus Ctrl+N for new rides and F1 for cheat sheet.
              </p>
            </div>

            {/* Feature 6: Dynamic Commute Periods */}
            <div className="p-7 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-4 group">
              <div className="flex items-center justify-between pb-3 border-b border-warm-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">06</span>
                  <span className="text-warm-300">/</span>
                  <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">Analytics</span>
                </div>
                <Receipt className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h3 className="font-extrabold text-base text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Dynamic Commute Periods
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Default view displays Today&apos;s journey spend, with 1-tap switches to This Week, This Month, or All Time to keep student spending under control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Commute Scenarios Section */}
      <section id="scenarios" className="py-16 sm:py-24 bg-white border-b border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
              See how Expenso solves real campus rides
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Pick a typical college commute routine below and see how multiple micro-transactions collapse into clean, simplified settlements.
            </p>
          </div>

          {/* Scenario Tab Buttons */}
          <div className="flex overflow-x-auto no-scrollbar sm:justify-center gap-1.5 sm:gap-2 p-1.5 bg-warm-100 rounded-2xl max-w-xl mx-auto mb-8 border border-warm-200">
            <button
              onClick={() => setActiveScenario('metro_hop')}
              className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                activeScenario === 'metro_hop'
                  ? 'bg-white text-charcoal-900 shadow-card -translate-y-0.5'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
              }`}
            >
              Metro + Auto Hop
            </button>
            <button
              onClick={() => setActiveScenario('cab_pool')}
              className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                activeScenario === 'cab_pool'
                  ? 'bg-white text-charcoal-900 shadow-card -translate-y-0.5'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
              }`}
            >
              Late Night Cab
            </button>
            <button
              onClick={() => setActiveScenario('chai_bus')}
              className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-95 ${
                activeScenario === 'chai_bus'
                  ? 'bg-white text-charcoal-900 shadow-card -translate-y-0.5'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/40'
              }`}
            >
              Bus + Chai Break
            </button>
          </div>

          {/* Scenario Card Display */}
          <div className="bg-warm-50 rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-card grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: What Happened */}
            <div className="md:col-span-7 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                  The Journey
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-charcoal-900">
                  {scenarios[activeScenario].title}
                </h3>
                <p className="text-xs text-charcoal-500">
                  {scenarios[activeScenario].description}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {scenarios[activeScenario].rides.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white rounded-xl border border-warm-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <TransportIcon category={r.category} size="sm" />
                      <div>
                        <p className="font-bold text-charcoal-900">{r.name}</p>
                        <p className="text-[11px] text-charcoal-500">
                          Paid by <strong className="text-charcoal-800">{r.paidBy}</strong> · {r.split}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-charcoal-900">₹{r.amount}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-bold text-charcoal-600 px-1">
                <span>Total Combined Journey Spend:</span>
                <span className="text-sm font-black text-charcoal-900">
                  ₹{scenarios[activeScenario].totalSpend}
                </span>
              </div>
            </div>

            {/* Right: The Net Settlement Resolution */}
            <div className="md:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-warm-300 shadow-subtle space-y-4">
              <div className="space-y-1 pb-3 border-b border-warm-100">
                <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Expenso Mathematical Result</span>
                </div>
                <p className="text-[11px] text-charcoal-500">
                  No 6 back-and-forth micro transfers. Everyone is squared in just 2 quick payments:
                </p>
              </div>

              <div className="space-y-2">
                {scenarios[activeScenario].netMath.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-brand-50/70 border border-brand-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="text-charcoal-700">
                        <strong className="text-charcoal-900">{m.debtor}</strong> pays{' '}
                        <strong className="text-brand-800">{m.creditor}</strong>
                      </p>
                      <p className="text-[10px] text-charcoal-500 mt-0.5">{m.detail}</p>
                    </div>
                    <span className="text-base font-black text-brand-900">₹{m.amount}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={onGetStarted}
                  className="btn-action-primary group w-full py-3 px-4 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-1.5"
                >
                  <span>Start splitting like this</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Transport Modes Grid */}
      <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-900 tracking-tight">
            Covers every leg of your daily commute
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            From quick cash e-rickshaws to late night surge cabs, tag and categorize your rides in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* Card 1: Auto & E-Rickshaws */}
          <div className="p-6 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-3.5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-warm-100">
                <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">01</span>
                <Zap className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h4 className="font-extrabold text-sm text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Auto & E-Rickshaws
              </h4>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                The quick ₹10–₹30 shared rides people always forget
              </p>
            </div>
          </div>

          {/* Card 2: Metro & Rail */}
          <div className="p-6 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-3.5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-warm-100">
                <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">02</span>
                <Train className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h4 className="font-extrabold text-sm text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Metro & Rail
              </h4>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                Smart card top-ups, tokens & shared multi-tickets
              </p>
            </div>
          </div>

          {/* Card 3: Cabs & Rideshares */}
          <div className="p-6 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-3.5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-warm-100">
                <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">03</span>
                <Navigation className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h4 className="font-extrabold text-sm text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Cabs & Rideshares
              </h4>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                Uber, Ola, Rapido & BluSmart late-night pools
              </p>
            </div>
          </div>

          {/* Card 4: City Buses */}
          <div className="p-6 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-3.5 group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-warm-100">
                <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">04</span>
                <Bus className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h4 className="font-extrabold text-sm text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                City Buses
              </h4>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                DTC, BMTC, BEST & campus shuttle route passes
              </p>
            </div>
          </div>

          {/* Card 5: Chai & Commute Food */}
          <div className="p-6 rounded-3xl bg-white border border-warm-200/90 shadow-card hover:shadow-elevated hover:border-brand-400 transition-all duration-200 space-y-3.5 group flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-warm-100">
                <span className="text-xs font-mono font-extrabold text-brand-700 tracking-wider">05</span>
                <Coffee className="w-4 h-4 text-brand-700/80 group-hover:text-brand-700 transition-colors" />
              </div>
              <h4 className="font-extrabold text-sm text-charcoal-900 tracking-tight group-hover:text-brand-900 transition-colors">
                Chai & Commute Food
              </h4>
              <p className="text-xs text-charcoal-500 leading-relaxed">
                The cutting chai & samosa routine before morning lecture
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Expenso vs Splitwise vs WhatsApp/Excel */}
      <section id="comparison" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-900 tracking-tight">
            Why college commuters choose Expenso
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            See how Expenso stacks up against generic expense apps, WhatsApp notes, and Excel sheets.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-warm-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-warm-100/70 border-b border-warm-200 text-charcoal-800">
                  <th className="py-3.5 px-4 font-bold">Feature</th>
                  <th className="py-3.5 px-4 font-black text-brand-900 bg-brand-50/60 border-x border-brand-200/60">
                    Expenso
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-charcoal-600">Splitwise</th>
                  <th className="py-3.5 px-4 font-semibold text-charcoal-600">WhatsApp / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Platform Availability</td>
                  <td className="py-3 px-4 font-bold text-brand-900 bg-brand-50/30 border-x border-brand-200/40">
                    <Check className="w-4 h-4 inline mr-1 text-emerald-600" /> Web + Android APK + Windows EXE
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Mobile & Web only</td>
                  <td className="py-3 px-4 text-charcoal-600">Manual text messages</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">AI Receipt Verification</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    <ShieldCheck className="w-4 h-4 inline mr-1 text-brand-700" /> Gemini AI Vision (checks UTR & ₹)
                  </td>
                  <td className="py-3 px-4 text-rose-600">
                    <X className="w-4 h-4 inline mr-1" /> None
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Manual squinting at chat</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Logging Speed</td>
                  <td className="py-3 px-4 font-bold text-brand-900 bg-brand-50/30 border-x border-brand-200/40">
                    <Zap className="w-4 h-4 inline mr-1 text-brand-700" /> Under 10 seconds
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">45+ seconds with ads</td>
                  <td className="py-3 px-4 text-charcoal-600">Manual typing & forget</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Circular Debt Elimination</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    <Check className="w-4 h-4 inline mr-1 text-emerald-600" /> Automatic Net Minimizer
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Paywalled or complex</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">
                    <X className="w-4 h-4 inline mr-1" /> Impossible manually
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">CSV Budget Export</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    <FileSpreadsheet className="w-4 h-4 inline mr-1 text-emerald-600" /> 1-Click CSV Export (Free)
                  </td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">
                    <X className="w-4 h-4 inline mr-1" /> Splitwise Pro Paywall
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Manual copy-paste</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Direct UPI Handoff</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    <Check className="w-4 h-4 inline mr-1 text-emerald-600" /> GPay / PhonePe / Paytm deep-link
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Third-party paywall/fees</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">
                    <X className="w-4 h-4 inline mr-1" /> Copy-pasting numbers
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Privacy & Ads</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    100% Free & Zero Ads
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Heavy banner ads & countdowns</td>
                  <td className="py-3 px-4 text-charcoal-600">Ad-free but chaotic</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-charcoal-900">Math Precision</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    Exact Integer Paise (₹0.00 error)
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Floating-point rounding</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">
                    <X className="w-4 h-4 inline mr-1" /> High calculation errors
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Honest Trust & Privacy Disclosure */}
      <section className="py-12 bg-warm-100/80 border-t border-warm-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-warm-300 shadow-subtle flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 text-brand-800 flex items-center justify-center shrink-0 border border-warm-200">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-charcoal-900">
                Honest Security & Privacy Disclosure
              </h3>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                Expenso is not a payment gateway, wallet, or bank. We never ask for or store your UPI PIN, ATM PIN, bank account numbers, or net-banking passwords.
              </p>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                When you upload a UPI QR code, our in-browser engine decodes the standard UPI URI format (<code className="bg-warm-100 px-1 py-0.5 rounded text-[11px] font-mono">upi://pay</code>) entirely on your device. Payments happen securely inside your authorized banking app, and settlement confirmations are validated directly between you and your friends with screenshot proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-900 tracking-tight">
            Everything you need to know about Expenso
          </h2>
          <p className="text-xs text-charcoal-500">
            Got questions? We have honest, straightforward answers.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'border-brand-500/60 bg-gradient-to-b from-white to-brand-50/20 shadow-card ring-1 ring-brand-500/20'
                    : 'border-warm-200 bg-white hover:border-brand-300 hover:shadow-card hover:-translate-y-0.5'
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 group cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`font-bold text-xs sm:text-sm transition-colors duration-200 leading-snug ${
                      isOpen ? 'text-brand-900' : 'text-charcoal-900 group-hover:text-brand-800'
                    }`}
                  >
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isOpen
                        ? 'bg-brand-700 text-white rotate-180 shadow-subtle'
                        : 'bg-warm-100 text-charcoal-500 group-hover:bg-brand-50 group-hover:text-brand-700'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-charcoal-600 leading-relaxed border-t border-warm-100/80">
                      <p className="mt-2.5 leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="py-16 bg-brand-800 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Ready to end daily commute money confusion?
          </h2>
          <p className="text-xs sm:text-sm text-brand-100 max-w-lg mx-auto leading-relaxed">
            Get the native app for Android or Windows, or launch the instant Web App in your browser. Free forever and ad-free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="/downloads/expenso.apk"
              download="expenso.apk"
              className="btn-action-secondary group w-full sm:w-auto px-6 py-3.5 bg-white text-brand-900 hover:bg-warm-100 font-bold text-xs sm:text-sm rounded-xl shadow-elevated flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>Download Android APK</span>
            </a>
            <a
              href="/downloads/Expenso-Setup.exe"
              download="Expenso-Setup.exe"
              className="btn-action-secondary group w-full sm:w-auto px-6 py-3.5 bg-white text-brand-900 hover:bg-warm-100 font-bold text-xs sm:text-sm rounded-xl shadow-elevated flex items-center justify-center gap-2"
            >
              <Monitor className="w-4 h-4 text-sky-700" />
              <span>Download Windows EXE</span>
            </a>
            <button
              onClick={() => {
                if (isLoggedIn) setShowLandingPage(false);
                else onGetStarted();
              }}
              className="btn-action-primary group w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-elevated flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-white" />
              <span>Open Web App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-50 border-t border-warm-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-warm-200">
            <div>
              <div
                onClick={() => {
                  if (isLoggedIn) {
                    setShowLandingPage(false);
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="cursor-pointer inline-block hover:opacity-90 transition-opacity"
                title={isLoggedIn ? 'Return to Expenso Dashboard' : 'Expenso Home'}
              >
                <BrandWordmark size="md" />
              </div>
              <p className="text-xs text-charcoal-500 mt-1 max-w-sm">
                Shared college commute expense manager with Gemini AI verification. Built with love for daily college travel across India.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/downloads/expenso.apk"
                download
                className="px-3.5 py-2 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl text-xs font-bold text-charcoal-700 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android APK</span>
              </a>
              <a
                href="/downloads/Expenso-Setup.exe"
                download
                className="px-3.5 py-2 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl text-xs font-bold text-charcoal-700 flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-sky-600" />
                <span>Windows EXE</span>
              </a>
              <button
                onClick={() => {
                  if (isLoggedIn) setShowLandingPage(false);
                  else onGetStarted();
                }}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-card flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web App</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-400">
            <p>&copy; {new Date().getFullYear()} Expenso. All rights reserved.</p>
            <p>Designed for college friends commuting daily by Metro, Auto, Cab & Bus.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
