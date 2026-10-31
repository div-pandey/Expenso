import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { NavigationTab } from '../../types';
import { BrandWordmark } from '../common/BrandWordmark';
import {
  LayoutDashboard,
  Receipt,
  Scale,
  Users,
  Plus,
  ChevronDown,
  Copy,
  Check,
  Bell,
  LogOut,
  CreditCard,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    setShowLandingPage,
    openAddExpense,
    openBlendModal,
    currentUser,
    currentBlend,
    members,
    suggestedSettlements,
    showToast,
    unreadNotificationsCount,
    openNotificationDrawer,
    logout,
    openPaymentSettings,
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const hasBlendFriends = (currentBlend?.memberCount ?? members.length) >= 2 || members.length >= 2;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentUser.inviteCode);
    setCopiedCode(true);
    showToast(`Copied personal invite code: ${currentUser.inviteCode}`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'balances',
      label: 'Balances',
      icon: <Scale className="w-5 h-5" />,
    },
    {
      id: 'group',
      label: 'Blend',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50 text-charcoal-900 flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-warm-50/95 backdrop-blur-md border-b-2 border-warm-200/80 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-6">
          {/* Section 1: Brand Logo & Blend Switcher (Left-aligned) */}
          <div className="flex items-center gap-2 sm:gap-3.5 justify-start min-w-0 shrink-0">
            <div
              onClick={() => {
                setActiveTab('home');
                setShowLandingPage(true);
              }}
              className="cursor-pointer hover:opacity-90 active:scale-95 transition-all shrink-0 flex items-center h-10 sm:h-11"
              title="View Expenso Overview / Landing Page"
            >
              <BrandWordmark size="md" showSubtitle={false} />
            </div>

            {/* Active Blend Selector Pill */}
            {currentBlend && (
              <button
                onClick={openBlendModal}
                className="flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-warm-100 hover:bg-warm-200/80 border border-warm-200 text-xs sm:text-sm font-bold text-charcoal-800 transition-all shadow-subtle min-w-0 max-w-[120px] sm:max-w-[150px] md:max-w-[170px] lg:max-w-[210px]"
                title={`Active Blend: ${currentBlend.name} (Click to switch or manage)`}
              >
                <span className="truncate">{currentBlend.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-500 shrink-0" />
              </button>
            )}
          </div>

          {/* Section 2: Desktop Navigation Links (Clean, No-Overlap Center Pill) */}
          <div className="hidden md:flex items-center justify-center shrink-0">
            <nav className="flex items-center gap-0.5 sm:gap-1 bg-warm-100/90 p-1 sm:p-1.5 rounded-2xl border border-warm-200/80 shadow-subtle h-10 sm:h-11">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`h-8 sm:h-9 flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white text-charcoal-900 shadow-subtle'
                        : 'text-charcoal-500 hover:text-charcoal-800 hover:bg-white/50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.id === 'balances' && suggestedSettlements.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Section 3: User Profile, Actions & Notifications (Right-aligned, Generous Spacing) */}
          <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 justify-end shrink-0">
            {/* Notification Bell */}
            <button
              onClick={openNotificationDrawer}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center hover:bg-warm-100 active:scale-95 transition-all duration-200 group shrink-0 relative border border-transparent hover:border-warm-200"
              title="Notifications"
            >
              <Bell className={`w-4.5 h-4.5 sm:w-5 sm:h-5 text-charcoal-600 transition-transform duration-300 group-hover:rotate-12 ${unreadNotificationsCount > 0 ? 'text-brand-700 animate-bell' : ''}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-700 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-subtle animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Quick Personal Invite Code badge (Only visible on ultra-wide screens to prevent crowding) */}
            <button
              onClick={handleCopyCode}
              className="hidden 2xl:flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-brand-200 text-xs text-charcoal-700 hover:bg-brand-50 hover:border-brand-300 hover:shadow-card active:scale-95 transition-all duration-200 shadow-subtle group whitespace-nowrap shrink-0"
              title="Click to copy your personal 6-character code"
            >
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Code:</span>
              <span className="font-mono font-black text-brand-800 tracking-wider">
                {currentUser.inviteCode}
              </span>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pop-in" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-charcoal-400 shrink-0 group-hover:scale-110 transition-transform duration-200" />
              )}
            </button>

            {/* Desktop Add Expense / Create Blend Button */}
            {hasBlendFriends ? (
              <button
                onClick={openAddExpense}
                className="btn-action-primary group hidden sm:flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3] shrink-0 group-hover:rotate-90 transition-transform duration-300" />
                <span className="whitespace-nowrap">Add Expense</span>
              </button>
            ) : (
              <button
                onClick={openBlendModal}
                className="btn-action-primary group hidden sm:flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 bg-brand-700 hover:bg-brand-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-card whitespace-nowrap shrink-0"
              >
                <Users className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-300" />
                <span className="hidden xl:inline whitespace-nowrap">Create / Join Blend</span>
                <span className="xl:hidden whitespace-nowrap">Join Blend</span>
              </button>
            )}

            {/* Current User Avatar & Account Switcher Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowAccountMenu(prev => !prev)}
                className="h-9 sm:h-10 flex items-center gap-1 sm:gap-1.5 p-0.5 rounded-xl hover:bg-warm-100 transition-colors shrink-0"
                title={`Signed in as ${currentUser.fullName} (${currentUser.email})`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 shadow-subtle ${currentUser.avatarColor}`}
                >
                  {currentUser.initials}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-400 hidden sm:block shrink-0" />
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] bg-white border border-warm-200 rounded-2xl shadow-elevated p-3 z-50 animate-pop-in space-y-2 text-xs"
                  onClick={() => setShowAccountMenu(false)}
                >
                  <div className="pb-2 border-b border-warm-100">
                    <p className="font-bold text-charcoal-900">{currentUser.fullName}</p>
                    <p className="text-[11px] text-charcoal-400 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-charcoal-500 font-semibold">Your Code:</span>
                      <span className="font-mono font-bold text-brand-800">{currentUser.inviteCode}</span>
                    </div>
                  </div>

                  {/* Payment Settings */}
                  <button
                    onClick={openPaymentSettings}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-charcoal-700 hover:bg-warm-50 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-brand-700" />
                    <span>Payment Settings (UPI)</span>
                  </button>

                  <div className="pt-2 border-t border-warm-100 flex items-center justify-between">
                    <button
                      onClick={openBlendModal}
                      className="text-[11px] font-bold text-brand-700 hover:underline"
                    >
                      Manage Blends &rarr;
                    </button>
                    <button
                      onClick={logout}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-8 lg:px-12 py-5 sm:py-8 lg:py-10 pb-28 md:pb-16">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-warm-200 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-modal"
      >
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {navItems.map((item, idx) => {
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                {/* Floating Add Expense / Create Blend CTA — conditional */}
                {idx === 2 && (
                  hasBlendFriends ? (
                    <button
                      onClick={openAddExpense}
                      className="-mt-7 w-12 h-12 rounded-full bg-brand-700 hover:bg-brand-800 active:scale-90 hover:scale-105 hover:shadow-modal text-white flex items-center justify-center shadow-elevated border-2 border-white transition-all duration-200 group"
                      aria-label="Add new commute expense"
                    >
                      <Plus className="w-6 h-6 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  ) : (
                    <button
                      onClick={openBlendModal}
                      className="-mt-7 w-12 h-12 rounded-full bg-brand-700 hover:bg-brand-800 active:scale-90 hover:scale-105 hover:shadow-modal text-white flex items-center justify-center shadow-elevated border-2 border-white transition-all duration-200 group"
                      aria-label="Create or join a Blend"
                    >
                      <Users className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    </button>
                  )
                )}

                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    isActive ? 'text-brand-800 font-bold' : 'text-charcoal-400 hover:text-charcoal-700'
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {item.id === 'balances' && suggestedSettlements.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
