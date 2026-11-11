import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/public/LandingPage';
import { AppLoadingScreen } from './components/common/AppLoadingScreen';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { ActivityView } from './components/activity/ActivityView';
import { BalancesView } from './components/balances/BalancesView';
import { GroupView } from './components/group/GroupView';
import { AddExpenseModal } from './components/forms/AddExpenseModal';
import { EditExpenseModal } from './components/forms/EditExpenseModal';
import { RecordSettlementModal } from './components/forms/RecordSettlementModal';
import { ExpenseDetailsModal } from './components/activity/ExpenseDetailsModal';
import { BlendModal } from './components/forms/BlendModal';
import { Toast } from './components/common/Toast';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { LoginModal } from './components/auth/LoginModal';
import { NotificationPermissionModal } from './components/notifications/NotificationPermissionModal';
import { DesktopShortcutsModal } from './components/desktop/DesktopShortcutsModal';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();
  switch (activeTab) {
    case 'activity': return <ActivityView />;
    case 'balances': return <BalancesView />;
    case 'group': return <GroupView />;
    case 'home':
    default: return <HomeDashboard />;
  }
};

// Lazy-load internal modals
const NotificationDrawer = React.lazy(() =>
  import('./components/notifications/NotificationDrawer')
);
const ProofReviewModal = React.lazy(() =>
  import('./components/settlements/ProofReviewModal').then(m => ({ default: m.ProofReviewModal }))
);
const PaymentSettingsModal = React.lazy(() =>
  import('./components/settings/PaymentSettingsModal').then(m => ({ default: m.PaymentSettingsModal }))
);

const AppInner: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const {
    showLandingPage,
    setShowLandingPage,
    openOnboarding,
    openLogin,
    isNotificationDrawerOpen,
    reviewingSettlement,
    isOnboardingOpen,
    isLoginOpen,
    isPaymentSettingsOpen,
    isNotificationPromptOpen,
    closeNotificationPrompt,
    openAddExpense,
    openRecordSettlement,
    openBlendModal,
    setActiveTab,
    openNotificationDrawer,
  } = useApp();

  useEffect(() => {
    // Initial sleek loading animation
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // F1 or Ctrl+/ for shortcuts cheat sheet
      if (e.key === 'F1' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      if (isInput) return;

      // Ctrl+N: Add Expense
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openAddExpense();
      }
      // Ctrl+S: Settle Up
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openRecordSettlement();
      }
      // Ctrl+B: Blend Switcher
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        openBlendModal();
      }
      // Ctrl+1..4: Quick Tabs
      else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setActiveTab('home');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setActiveTab('activity');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setActiveTab('balances');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '4') {
        e.preventDefault();
        setActiveTab('group');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddExpense, openRecordSettlement, openBlendModal, setActiveTab, openNotificationDrawer]);

  if (isAppLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <>
      {showLandingPage ? (
        <LandingPage
          onGetStarted={() => openOnboarding()}
          onLogin={openLogin}
          onExploreDemo={() => setShowLandingPage(false)}
        />
      ) : (
        <>
          <AppShell>
            <MainContent />
          </AppShell>

          {/* Core global modals (always mounted for speed) */}
          <AddExpenseModal />
          <EditExpenseModal />
          <RecordSettlementModal />
          <ExpenseDetailsModal />
          <BlendModal />

          {/* Heavy modals — lazy loaded */}
          <React.Suspense fallback={null}>
            {isNotificationDrawerOpen && <NotificationDrawer />}
            {!!reviewingSettlement && <ProofReviewModal />}
            {isPaymentSettingsOpen && <PaymentSettingsModal />}
          </React.Suspense>
        </>
      )}

      {/* Global feature modals (preserved during state transitions) */}
      {isOnboardingOpen && <OnboardingModal />}
      {isLoginOpen && <LoginModal />}
      {isNotificationPromptOpen && (
        <NotificationPermissionModal
          isOpen={isNotificationPromptOpen}
          onClose={closeNotificationPrompt}
        />
      )}
      <DesktopShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <Toast />
    </>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default App;
