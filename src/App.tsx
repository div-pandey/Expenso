import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/public/LandingPage';
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
  } = useApp();

  return (
    <>
      {showLandingPage ? (
        <LandingPage
          onGetStarted={openOnboarding}
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
