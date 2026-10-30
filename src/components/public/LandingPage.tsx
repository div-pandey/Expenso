import React, { useState, useEffect, useRef } from 'react';
import { BrandWordmark, ExpensoLogo } from '../common/BrandWordmark';
import { TransportIcon } from '../common/TransportIcon';
import type { TransportCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Smartphone,
  Lock,
  Check,
  X,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onExploreDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
}) => {
  const { isLoggedIn, setShowLandingPage } = useApp();
  const [activeScenario, setActiveScenario] = useState<'metro_hop' | 'cab_pool' | 'chai_bus'>('metro_hop');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        // Scrolling down the page -> hide header to maximize reading view
        setIsHeaderVisible(false);
      } else if (delta < -4) {
        // Scrolling up even a little -> reveal header for quick navigation
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
      q: 'How is Expenso different from general bill-splitting apps like Splitwise?',
      a: 'Splitwise and generic apps are built for roommates, dinners, and international trips with ads and endless features. Expenso is engineered specifically for fast-paced daily college travel in India: 10-second ride entry at metro escalators, native UPI deep links, zero circular debts, and a screenshot proof verification workflow that stops awkward "did you get it?" messages.',
    },
    {
      q: 'Does Expenso connect to my bank account or ask for my UPI PIN?',
      a: 'Never. Expenso never asks for your bank password, debit card details, or UPI PIN. When you upload a UPI QR, our in-browser engine decodes the standard UPI address client-side. Payments happen directly inside your trusted UPI apps (Google Pay, PhonePe, Paytm).',
    },
    {
      q: 'What if one friend missed the morning ride and only joined for the cab back?',
      a: 'When logging an expense, you can check or uncheck individual members in 1 click. If only two of you took the morning auto, only those two split the ₹60. The third person owes ₹0 for that ride.',
    },
    {
      q: 'How does the screenshot payment verification actually work?',
      a: 'When you tap "Settle Up", Expenso opens your UPI app with the exact amount and recipient details pre-filled. After transferring, attach a payment screenshot. Your debt is not cleared until the recipient checks their bank notification and taps "Received" inside Expenso, preventing false claims.',
    },
    {
      q: 'Can I have multiple groups (e.g. daily metro crew vs hostel carpool)?',
      a: 'Yes! Expenso features "Blends" — private friend groups. You can create one Blend for your daily North Campus metro gang and another for weekend hackathon travel or hostel carpooling.',
    },
    {
      q: 'Is Expenso free for college students?',
      a: 'Expenso is 100% free and completely ad-free. No paywalls, no subscription tiers, and no hidden transaction fees.',
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
        <div className="max-w-7xl mx-auto px-3.5 sm:px-8 lg:px-12 min-h-[60px] sm:min-h-[84px] py-2.5 sm:py-4 flex items-center justify-between">
          <div
            onClick={() => {
              if (isLoggedIn) {
                setShowLandingPage(false);
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            title={isLoggedIn ? 'Return to Expenso Dashboard' : 'Expenso Home'}
          >
            <BrandWordmark size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-charcoal-600">
            <button onClick={() => scrollToSection('scenarios')} className="hover:text-charcoal-900 transition-colors">
              Live Scenarios
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-charcoal-900 transition-colors">
              How it works
            </button>
            <button onClick={() => scrollToSection('comparison')} className="hover:text-charcoal-900 transition-colors">
              Why Expenso
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-charcoal-900 transition-colors">
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {isLoggedIn ? (
              <button
                onClick={() => setShowLandingPage(false)}
                className="btn-action-primary group relative overflow-hidden flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card active:scale-95 transition-all"
              >
                <span className="relative z-10">Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
                <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
              </button>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-xs sm:text-sm font-bold text-charcoal-700 hover:text-charcoal-900 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-warm-100 active:scale-95 transition-all duration-150"
                >
                  Sign In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-action-primary group relative overflow-hidden flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card"
                >
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-40" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 sm:pt-28 lg:pt-32 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-charcoal-900 tracking-tight leading-[1.14]">
              Your rides. Your crew. <br className="hidden sm:inline" />
              <span className="text-brand-700">No money confusion.</span>
            </h1>

            <p className="text-sm sm:text-base text-charcoal-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Track every rickshaw, metro ride, cab, and transit snack with your college friends. Expenso logs rides in 10 seconds, eliminates circular debts, and coordinates verified UPI repayments with screenshot evidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              {isLoggedIn ? (
                <button
                  onClick={() => setShowLandingPage(false)}
                  className="btn-action-primary group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-xl shadow-elevated"
                >
                  <span className="relative z-10">Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1.5 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                </button>
              ) : (
                <button
                  onClick={onGetStarted}
                  className="btn-action-primary group relative overflow-hidden w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold rounded-xl shadow-elevated"
                >
                  <span className="relative z-10">Create free account</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1.5 transition-transform duration-200" />
                  <div className="absolute inset-0 animate-shimmer pointer-events-none" />
                </button>
              )}

              <button
                onClick={() => scrollToSection('scenarios')}
                className="btn-action-secondary group w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-warm-100 text-charcoal-800 text-sm font-bold rounded-xl border border-warm-300 shadow-subtle flex items-center justify-center gap-1.5"
              >
                <span>See commute simulator</span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-400 group-hover:translate-y-0.5 transition-transform duration-200" />
              </button>

            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-3 text-xs text-charcoal-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Free & No Ads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No Bank Passwords Needed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero Circular Debts</span>
              </div>
            </div>
          </div>

          {/* App Preview Mockup */}
          <div className="hidden sm:block lg:col-span-5">
            <div className="w-full relative">

              {/* Floating ambient glow */}
              <div className="absolute -inset-8 bg-brand-700/6 rounded-[48px] blur-3xl pointer-events-none" />

              {/* Main card */}
              <div className="relative bg-[#FAF9F6] rounded-2xl border border-warm-300/80 shadow-elevated overflow-hidden">

                {/* Faux app top-bar */}
                <div className="bg-white border-b border-warm-200 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExpensoLogo size="xs" />
                    <span className="font-black text-xs text-charcoal-900 tracking-tight">Expenso</span>
                  </div>
                  <span className="text-[10px] text-charcoal-400 font-medium">commute tracker</span>
                </div>

                {/* Blend header */}
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mb-1">Blend</p>
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-charcoal-900 text-base">North Campus Crew</h3>
                    <div className="flex -space-x-2">
                      {[
                        { init: 'D', color: 'bg-brand-700' },
                        { init: 'R', color: 'bg-amber-600' },
                        { init: 'A', color: 'bg-sky-600' },
                      ].map(({ init, color }, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white ${color}`}>
                          {init}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-warm-300 flex items-center justify-center text-[9px] font-bold text-charcoal-600">+1</div>
                    </div>
                  </div>
                </div>

                <div className="mx-5 border-t border-warm-200" />

                {/* Today's rides */}
                <div className="px-5 pt-4 pb-3 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Today's Rides</p>
                  {[
                    { category: 'erickshaw' as const, label: 'E-rickshaw to metro gate', sub: 'Divyansh paid', amt: '₹90',  split: '÷3 = ₹30 each', bg: 'bg-amber-50',   border: 'border-amber-200'   },
                    { category: 'metro' as const, label: 'Yellow Line tokens',       sub: 'Rahul paid',    amt: '₹120', split: '÷3 = ₹40 each', bg: 'bg-sky-50',     border: 'border-sky-200'     },
                    { category: 'cab' as const, label: 'Cab back from lab',        sub: 'Aman paid',     amt: '₹150', split: '÷3 = ₹50 each', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.bg} border ${item.border}`}>
                      <TransportIcon category={item.category} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-charcoal-900 truncate">{item.label}</p>
                        <p className="text-[10px] text-charcoal-500 mt-0.5">
                          {item.sub} · <span className="font-semibold text-charcoal-700">{item.split}</span>
                        </p>
                      </div>
                      <span className="text-sm font-black text-charcoal-900 shrink-0">{item.amt}</span>
                    </div>
                  ))}
                </div>

                <div className="mx-5 border-t border-warm-200" />

                {/* Who owes what */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">Who Owes What</p>
                    <span className="text-[9px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">Auto-calculated</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { from: 'Rahul', to: 'Aman', amt: '₹10' },
                      { from: 'Divyansh', to: 'Aman', amt: '₹20' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-warm-200 rounded-xl px-3.5 py-2.5 text-xs">
                        <span className="text-charcoal-700">
                          <span className="font-bold text-charcoal-900">{row.from}</span>
                          <span className="text-charcoal-400 mx-1.5">→</span>
                          <span className="font-bold text-charcoal-900">{row.to}</span>
                        </span>
                        <span className="font-black text-rose-600">{row.amt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* UPI settle footer */}
                <div className="mx-5 mb-5 mt-3 flex items-center justify-between bg-brand-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-brand-200" />
                    <span className="text-xs font-bold text-white">Settle via UPI</span>
                  </div>
                  <button
                    onClick={onGetStarted}
                    className="text-[10px] font-black text-brand-900 bg-white px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    Try it →
                  </button>
                </div>
              </div>

              {/* Floating badge — bottom right */}
              <div className="absolute -bottom-3 -right-3 bg-white border border-warm-300 rounded-xl shadow-card px-3 py-2 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span className="text-xs font-bold text-charcoal-700">Zero circular debts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Commute Scenarios Section */}
      <section id="scenarios" className="py-16 sm:py-24 bg-white border-y border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Interactive Commute Simulator
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
              See how Expenso solves real campus rides
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Pick a typical college commute routine below and see how multiple messy micro-transactions collapse into clean, simplified settlements.
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
            Covers every leg of your daily journey
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            From quick cash e-rickshaws to late night surge cabs, tag and categorize your rides in seconds.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-warm-200 shadow-card text-center space-y-2.5 hover:border-brand-300 transition-colors flex flex-col items-center">
            <TransportIcon category="erickshaw" size="lg" />
            <h4 className="font-bold text-xs text-charcoal-900">Auto & E-Rickshaws</h4>
            <p className="text-[11px] text-charcoal-500">The quick ₹10–₹30 shared rides people always forget</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-warm-200 shadow-card text-center space-y-2.5 hover:border-brand-300 transition-colors flex flex-col items-center">
            <TransportIcon category="metro" size="lg" />
            <h4 className="font-bold text-xs text-charcoal-900">Metro & Rail</h4>
            <p className="text-[11px] text-charcoal-500">Smart card top-ups, tokens & shared multi-tickets</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-warm-200 shadow-card text-center space-y-2.5 hover:border-brand-300 transition-colors flex flex-col items-center">
            <TransportIcon category="cab" size="lg" />
            <h4 className="font-bold text-xs text-charcoal-900">Cabs & Rideshares</h4>
            <p className="text-[11px] text-charcoal-500">Uber, Ola, Rapido & BluSmart late-night pools</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-warm-200 shadow-card text-center space-y-2.5 hover:border-brand-300 transition-colors flex flex-col items-center">
            <TransportIcon category="bus" size="lg" />
            <h4 className="font-bold text-xs text-charcoal-900">City Buses</h4>
            <p className="text-[11px] text-charcoal-500">DTC, BMTC, BEST & campus shuttle route passes</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-warm-200 shadow-card text-center space-y-2.5 hover:border-brand-300 transition-colors col-span-2 sm:col-span-1 flex flex-col items-center">
            <TransportIcon category="other" size="lg" />
            <h4 className="font-bold text-xs text-charcoal-900">Chai & Commute Food</h4>
            <p className="text-[11px] text-charcoal-500">The cutting chai & samosa routine before morning lecture</p>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-y border-warm-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Simple 3-Step Flow
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-charcoal-900 tracking-tight">
              From crowded metros to settled balances in seconds
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500">
              No complicated spreadsheets, no mental calculations, and no awkward &ldquo;did you receive it?&rdquo; messages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200 relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-sm shadow-subtle">
                  1
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Create profile & set up UPI
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Sign up with your college email and upload your UPI QR code. Expenso extracts your verified UPI ID and name client-side so friends can pay you directly with zero mistakes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-warm-200 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span>Format verified client-side</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200 relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-subtle">
                  2
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Form a Blend with friend code
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Every user gets a unique 6-character personal invite code (e.g. <code className="font-mono bg-warm-200 px-1 py-0.5 rounded">DIVY24</code>). Enter your friend&apos;s code to connect instantly without public links.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-warm-200 flex items-center gap-2 text-[11px] font-semibold text-charcoal-600">
                <Smartphone className="w-4 h-4 text-brand-700" />
                <span>6-character personal codes</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-warm-50 border border-warm-200 relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm shadow-subtle">
                  3
                </div>
                <h3 className="text-base font-bold text-charcoal-900">
                  Ride, split & settle with proof
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Log rides in under 10 seconds. Settle debts via UPI apps and submit a payment screenshot. Outstanding debt clears only when the recipient confirms!
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-warm-200 flex items-center gap-2 text-[11px] font-semibold text-brand-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authoritative recipient verification</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Expenso vs Splitwise vs WhatsApp/Excel */}
      <section id="comparison" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Side-By-Side Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-900 tracking-tight">
            Why college commuters choose Expenso
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500">
            See how Expenso stacks up against generic expense apps, WhatsApp notes, and Excel sheets.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-warm-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse text-xs">
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
                  <td className="py-3 px-4 font-bold text-charcoal-900">Screenshot Proof & Confirmation</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-brand-50/30 border-x border-brand-200/40">
                    <Check className="w-4 h-4 inline mr-1 text-emerald-600" /> Recipient approves before clear
                  </td>
                  <td className="py-3 px-4 text-rose-600">
                    <X className="w-4 h-4 inline mr-1" /> Debt clears without verification
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">Chat screenshots get buried</td>
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
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            Frequently Asked Questions
          </span>
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
                {/* Smooth Animated Collapsible Accordion Content */}
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
            Set up your profile, invite your commute friends with your 6-character code, and start recording rides in under 10 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isLoggedIn ? (
              <button
                onClick={() => setShowLandingPage(false)}
                className="btn-action-secondary group w-full sm:w-auto px-6 py-3.5 bg-white text-brand-900 hover:bg-warm-100 font-bold text-xs sm:text-sm rounded-xl shadow-elevated flex items-center justify-center gap-2"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4 text-brand-800 group-hover:translate-x-1.5 transition-transform duration-200" />
              </button>
            ) : (
              <button
                onClick={onGetStarted}
                className="btn-action-secondary group w-full sm:w-auto px-6 py-3.5 bg-white text-brand-900 hover:bg-warm-100 font-bold text-xs sm:text-sm rounded-xl shadow-elevated flex items-center justify-center gap-2"
              >
                <span>Get started free</span>
                <ArrowRight className="w-4 h-4 text-brand-800 group-hover:translate-x-1.5 transition-transform duration-200" />
              </button>
            )}
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
                Shared college commute expense manager. Built with love for daily college travel across India.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <button
                  onClick={() => setShowLandingPage(false)}
                  className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-card transition-all flex items-center gap-1.5"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 text-xs font-bold text-charcoal-700 hover:text-charcoal-900 hover:bg-warm-100 rounded-xl transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={onGetStarted}
                    className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-card transition-all"
                  >
                    Get Started
                  </button>
                </>
              )}
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
