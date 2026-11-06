import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  UserProfile,
  Blend,
  BlendMember,
  Member,
  Expense,
  Settlement,
  NavigationTab,
  PeriodFilter,
  SuggestedSettlement,
  MemberBalanceSummary,
  UserPaymentMethod,
  InAppNotification,
} from '../types';
import { backendService } from '../services/backendService';
import { sandboxBackend } from '../services/sandboxBackend';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  calculateMemberBalances,
  calculateSuggestedSettlements,
  calculateTotalSpend,
} from '../utils/calculations';
import { filterExpensesByPeriod } from '../utils/dates';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AppContextType {
  currentUser: UserProfile;
  currentBlend: Blend | null;
  userBlends: Blend[];
  blendMembers: BlendMember[];
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  isCloudConfigured: boolean;
  allDemoUsers: UserProfile[];
  isLoggedIn: boolean;

  activeTab: NavigationTab;
  periodFilter: PeriodFilter;
  toast: ToastState | null;

  // Modals
  isAddExpenseOpen: boolean;
  isRecordSettlementOpen: boolean;
  isBlendModalOpen: boolean;
  settlementPreset: { fromId?: string; toId?: string; amountPaise?: number } | null;
  viewingExpense: Expense | null;
  editingExpense: Expense | null;

  // Computed
  balances: Record<string, MemberBalanceSummary>;
  suggestedSettlements: SuggestedSettlement[];
  totalGroupSpendPaise: number;
  periodExpenses: Expense[];
  periodSpendPaise: number;
  currentUserBalance: MemberBalanceSummary;

  // Navigation & Actions
  setActiveTab: (tab: NavigationTab) => void;
  setPeriodFilter: (period: PeriodFilter) => void;
  openAddExpense: () => void;
  closeAddExpense: () => void;
  openRecordSettlement: (preset?: { fromId?: string; toId?: string; amountPaise?: number }) => void;
  closeRecordSettlement: () => void;
  openBlendModal: () => void;
  closeBlendModal: () => void;
  openExpenseDetails: (expense: Expense) => void;
  closeExpenseDetails: () => void;
  openEditExpense: (expense: Expense) => void;
  closeEditExpense: () => void;

  // Multi-user & Blend actions
  isBlendAdmin: boolean;
  switchAccount: (userId: string) => Promise<void>;
  switchBlend: (blendId: string) => Promise<void>;
  createBlend: (name: string, friendInviteCodes?: string[]) => Promise<void>;
  joinBlendWithFriendCode: (friendInviteCode: string) => Promise<void>;
  updateBlendName: (name: string) => Promise<void>;
  updateBlendDetails: (updates: { name?: string; icon?: string }) => Promise<void>;
  deleteBlend: (blendId?: string) => Promise<void>;
  removeMemberFromBlend: (memberUserId: string) => Promise<void>;
  addMemberToBlend: (friendInviteCode: string) => Promise<void>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; name?: string; isBlend?: boolean; error?: string }>;

  // Financial actions
  addExpense: (data: {
    description: string;
    amountPaise: number;
    category: Expense['category'];
    participantIds: string[];
    date: string;
    notes?: string;
  }) => Promise<void>;
  updateExpense: (
    id: string,
    data: {
      description: string;
      amountPaise: number;
      category: Expense['category'];
      participantIds: string[];
      date: string;
      notes?: string;
    }
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  recordSettlement: (data: {
    fromMemberId: string;
    toMemberId: string;
    amountPaise: number;
    date: string;
    notes?: string;
  }) => Promise<void>;
  updateSettlement: (
    id: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
    }
  ) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;

  // Visitors, Landing Page & Onboarding
  showLandingPage: boolean;
  setShowLandingPage: (show: boolean) => void;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (emailOrUserId: string, password?: string) => Promise<void>;
  registerUser: (fullName: string, email: string, password?: string) => Promise<UserProfile>;
  logout: () => void;

  // In-App Notifications
  notifications: InAppNotification[];
  unreadNotificationsCount: number;
  isNotificationDrawerOpen: boolean;
  openNotificationDrawer: () => void;
  closeNotificationDrawer: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Proof Review Modal
  reviewingSettlement: Settlement | null;
  openProofReview: (settlement: Settlement) => void;
  closeProofReview: () => void;

  // Payment Settings Modal
  isPaymentSettingsOpen: boolean;
  openPaymentSettings: () => void;
  closePaymentSettings: () => void;
  updatePaymentMethod: (method: UserPaymentMethod) => Promise<void>;

  // Verified Settlement Lifecycle Actions
  initiateSettlement: (data: {
    toMemberId: string;
    amountPaise: number;
    notes?: string;
  }) => Promise<Settlement>;
  submitSettlementProof: (
    settlementId: string,
    proofImageUrl: string,
    notes?: string
  ) => Promise<void>;
  confirmSettlement: (settlementId: string, decisionNotes?: string) => Promise<void>;
  rejectSettlement: (settlementId: string, reason: string) => Promise<void>;
  cancelSettlement: (settlementId: string) => Promise<void>;

  handleResetDemoData: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACTIVE_BLEND_STORAGE_KEY = 'expenso_active_blend_id';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => sandboxBackend.getCurrentUser());
  const [userBlends, setUserBlends] = useState<Blend[]>([]);
  const [currentBlend, setCurrentBlend] = useState<Blend | null>(null);
  const [blendMembers, setBlendMembers] = useState<BlendMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [allDemoUsers, setAllDemoUsers] = useState<UserProfile[]>(() => backendService.getAllDemoUsers());

  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Public Landing Page & Onboarding auth persistence
  const AUTH_STORAGE_KEY = 'expenso_auth_status';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const authStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        return authStatus === 'logged_in';
      }
    } catch {
      // In case of restricted environment
    }
    return false;
  });

  const [showLandingPage, setShowLandingPageState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const authStatus = localStorage.getItem(AUTH_STORAGE_KEY);
        // Default to public landing page unless user is actively logged in
        return authStatus !== 'logged_in';
      }
    } catch {
      // In case of restricted environment
    }
    return true;
  });

  const setShowLandingPage = useCallback((show: boolean) => {
    setShowLandingPageState(show);
  }, []);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // In-App Notifications
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Proof Review & Payment Settings
  const [reviewingSettlement, setReviewingSettlement] = useState<Settlement | null>(null);
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [isBlendModalOpen, setIsBlendModalOpen] = useState(false);
  const [settlementPreset, setSettlementPreset] = useState<{ fromId?: string; toId?: string; amountPaise?: number } | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 3500);
  }, []);

  // Load user data and blends
  const reloadData = useCallback(async (targetBlendId?: string) => {
    try {
      const user = await backendService.getCurrentUser();
      setCurrentUser(user);
      setAllDemoUsers(backendService.getAllDemoUsers());

      const blends = await backendService.getUserBlends();
      setUserBlends(blends);

      const savedBlendId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_BLEND_STORAGE_KEY) : null;
      const preferredId = targetBlendId || savedBlendId || currentBlend?.id;

      let activeB = blends.find(b => b.id === preferredId) || blends[0] || null;
      setCurrentBlend(activeB);

      if (activeB) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_BLEND_STORAGE_KEY, activeB.id);
        }
        const [membersData, expensesData, settlementsData, notifsData] = await Promise.all([
          backendService.getBlendMembers(activeB.id),
          backendService.getBlendExpenses(activeB.id),
          backendService.getBlendSettlements(activeB.id),
          backendService.getNotifications(user.id),
        ]);
        setBlendMembers(membersData);
        setExpenses(expensesData);
        setSettlements(settlementsData);
        setNotifications(notifsData);
      } else {
        setBlendMembers([]);
        setExpenses([]);
        setSettlements([]);
        setNotifications([]);
      }
    } catch (err: unknown) {
      console.error('Failed to load blend data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      showToast(errorMessage, 'error');
    }
  }, [currentBlend?.id, showToast]);

  useEffect(() => {
    reloadData();
  }, []); // Run on initial mount

  // Supabase Realtime channel setup when cloud backend is configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentBlend) return;

    const channel = supabase
      .channel(`realtime_blend_${currentBlend.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `blend_id=eq.${currentBlend.id}` },
        () => {
          reloadData(currentBlend.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `blend_id=eq.${currentBlend.id}` },
        () => {
          reloadData(currentBlend.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blend_members', filter: `blend_id=eq.${currentBlend.id}` },
        () => {
          reloadData(currentBlend.id);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentBlend?.id, reloadData]);

  // Realtime & Cross-tab broadcast listener for instant sync
  useEffect(() => {
    const handleSync = (event?: { type: string; payload?: unknown }) => {
      const p = event?.payload as {
        blendId?: string;
        blend?: { id: string };
        expense?: { blendId?: string };
        settlement?: { blendId?: string };
      } | undefined;
      const targetId = p?.blendId || p?.blend?.id || p?.expense?.blendId || p?.settlement?.blendId || currentBlend?.id;
      reloadData(targetId);
    };
    backendService.onSync(handleSync);
    return () => {
      backendService.offSync(handleSync);
    };
  }, [currentBlend?.id, reloadData]);

  // Derived Members list for views & calculations
  const members: Member[] = useMemo(() => {
    return blendMembers.map(bm => ({
      id: bm.profile.id,
      name: bm.profile.fullName,
      initials: bm.profile.initials,
      avatarColor: bm.profile.avatarColor,
      isCurrentUser: bm.profile.id === currentUser.id,
      phone: bm.profile.phone,
      inviteCode: bm.profile.inviteCode,
      paymentMethod: bm.profile.paymentMethod,
      role: bm.role,
    }));
  }, [blendMembers, currentUser.id]);

  const isBlendAdmin = useMemo(() => {
    if (!currentBlend) return false;
    if (currentBlend.createdBy === currentUser.id) return true;
    return blendMembers.some(bm => bm.userId === currentUser.id && bm.role === 'admin');
  }, [currentBlend, currentUser.id, blendMembers]);

  // Financial calculations
  const balances = useMemo(() => {
    return calculateMemberBalances(members, expenses, settlements);
  }, [members, expenses, settlements]);

  const suggestedSettlements = useMemo(() => {
    return calculateSuggestedSettlements(balances);
  }, [balances]);

  const totalGroupSpendPaise = useMemo(() => {
    return calculateTotalSpend(expenses);
  }, [expenses]);

  const periodExpenses = useMemo(() => {
    return filterExpensesByPeriod(expenses, periodFilter);
  }, [expenses, periodFilter]);

  const periodSpendPaise = useMemo(() => {
    return calculateTotalSpend(periodExpenses);
  }, [periodExpenses]);

  const currentUserBalance = useMemo(() => {
    return balances[currentUser.id] || {
      memberId: currentUser.id,
      totalPaidPaise: 0,
      totalSharePaise: 0,
      repaymentsSentPaise: 0,
      repaymentsReceivedPaise: 0,
      netBalancePaise: 0,
    };
  }, [balances, currentUser.id]);

  // --- Actions ---

  const switchAccount = useCallback(async (userId: string) => {
    try {
      const user = backendService.switchDemoUser(userId);
      setCurrentUser(user);
      setIsLoggedIn(true);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, 'logged_in');
        }
      } catch (e) {
        console.warn('Could not persist auth status to localStorage', e);
      }
      showToast(`Switched account to ${user.fullName}`);
      await reloadData();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to switch account', 'error');
    }
  }, [reloadData, showToast]);

  const switchBlend = useCallback(async (blendId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_BLEND_STORAGE_KEY, blendId);
    }
    await reloadData(blendId);
    showToast('Switched Blend');
  }, [reloadData, showToast]);

  const createBlend = useCallback(async (name: string, friendInviteCodes?: string[]) => {
    try {
      const newBlend = await backendService.createBlend(name, friendInviteCodes);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_BLEND_STORAGE_KEY, newBlend.id);
      }
      setIsBlendModalOpen(false);
      showToast(`Created Blend "${newBlend.name}"! Code: ${newBlend.blendCode}`);
      await reloadData(newBlend.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create Blend';
      showToast(msg, 'error');
      throw new Error(msg); // re-throw so BlendModal can show inline error
    }
  }, [reloadData, showToast]);

  const joinBlendWithFriendCode = useCallback(async (code: string) => {
    try {
      const { blend, friend } = await backendService.joinBlendWithFriendCode(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_BLEND_STORAGE_KEY, blend.id);
      }
      setIsBlendModalOpen(false);
      if (friend) {
        showToast(`Connected with ${friend.fullName}! Joined "${blend.name}"`);
      } else {
        showToast(`Joined "${blend.name}" successfully!`);
      }
      await reloadData(blend.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid code';
      showToast(msg, 'error');
      throw new Error(msg); // re-throw so BlendModal can show inline error
    }
  }, [reloadData, showToast]);

  const validateInviteCode = useCallback(async (code: string): Promise<{
    valid: boolean;
    name?: string;
    isBlend?: boolean;
    error?: string;
  }> => {
    const clean = code.trim().toUpperCase();
    if (!clean || clean.length !== 6) return { valid: false, error: 'Code must be exactly 6 characters' };
    try {
      const target = await backendService.findCodeTarget(clean);
      if (!target) return { valid: false, error: `No user or Blend found with code "${clean}". Check the code and try again.` };
      if (target.type === 'user' && target.user) {
        // Compare against the React state currentUser to avoid self-connection
        if (target.user.id === currentUser.id) return { valid: false, error: "You cannot enter your own invitation code." };
        return { valid: true, name: target.user.fullName, isBlend: false };
      } else if (target.type === 'blend' && target.blend) {
        return { valid: true, name: target.blend.name, isBlend: true };
      }
      return { valid: false, error: `No user or Blend found with code "${clean}". Check the code and try again.` };
    } catch {
      return { valid: false, error: 'Could not validate code. Please try again.' };
    }
  }, [currentUser.id]);

  const updateBlendName = useCallback(async (name: string) => {
    if (!currentBlend || !name.trim()) return;
    try {
      await backendService.updateBlendName(currentBlend.id, name.trim());
      showToast('Blend name updated');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update Blend name', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const updateBlendDetails = useCallback(async (updates: { name?: string; icon?: string }) => {
    if (!currentBlend) return;
    try {
      const updated = await backendService.updateBlendDetails(currentBlend.id, updates);
      setCurrentBlend(updated);
      showToast('Blend updated successfully');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update Blend';
      showToast(msg, 'error');
      throw e;
    }
  }, [currentBlend, reloadData, showToast]);

  const deleteBlend = useCallback(async (blendIdToDelete?: string) => {
    const targetId = blendIdToDelete || currentBlend?.id;
    if (!targetId) return;
    try {
      await backendService.deleteBlend(targetId);
      showToast('Blend deleted successfully');
      if (typeof window !== 'undefined' && localStorage.getItem(ACTIVE_BLEND_STORAGE_KEY) === targetId) {
        localStorage.removeItem(ACTIVE_BLEND_STORAGE_KEY);
      }
      const updatedBlends = await backendService.getUserBlends(currentUser.id);
      setUserBlends(updatedBlends);
      const nextBlend = updatedBlends[0] || null;
      setCurrentBlend(nextBlend);
      if (nextBlend) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_BLEND_STORAGE_KEY, nextBlend.id);
        }
        await reloadData(nextBlend.id);
      } else {
        await reloadData();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete Blend';
      showToast(msg, 'error');
      throw e;
    }
  }, [currentBlend?.id, currentUser.id, reloadData, showToast]);

  const removeMemberFromBlend = useCallback(async (memberUserId: string) => {
    if (!currentBlend) return;
    try {
      await backendService.removeMemberFromBlend(currentBlend.id, memberUserId);
      showToast('Member removed from blend');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to remove member';
      showToast(msg, 'error');
      throw e;
    }
  }, [currentBlend, reloadData, showToast]);

  const addMemberToBlend = useCallback(async (friendInviteCode: string) => {
    if (!currentBlend) return;
    try {
      const newMember = await backendService.addMemberToBlend(currentBlend.id, friendInviteCode);
      showToast(`Added ${newMember.profile.fullName} to ${currentBlend.name}!`);
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add member';
      showToast(msg, 'error');
      throw e;
    }
  }, [currentBlend, reloadData, showToast]);

  // CRITICAL RULE: Authenticated user is the ONLY payer
  const addExpense = useCallback(async (data: {
    description: string;
    amountPaise: number;
    category: Expense['category'];
    participantIds: string[];
    date: string;
    notes?: string;
  }) => {
    if (!currentBlend) return;
    try {
      await backendService.createExpense(currentBlend.id, data);
      setIsAddExpenseOpen(false);
      showToast('Expense recorded successfully');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to record expense', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const updateExpense = useCallback(async (
    id: string,
    data: {
      description: string;
      amountPaise: number;
      category: Expense['category'];
      participantIds: string[];
      date: string;
      notes?: string;
    }
  ) => {
    if (!currentBlend) return;
    try {
      await backendService.updateExpense(id, data);
      setEditingExpense(null);
      setViewingExpense(null);
      showToast('Expense updated');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update expense', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!currentBlend) return;
    try {
      await backendService.deleteExpense(id);
      setViewingExpense(null);
      setEditingExpense(null);
      showToast('Expense removed', 'info');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to delete expense', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const recordSettlement = useCallback(async (data: {
    fromMemberId: string;
    toMemberId: string;
    amountPaise: number;
    date: string;
    notes?: string;
  }) => {
    if (!currentBlend) return;
    if (data.fromMemberId === data.toMemberId) {
      showToast('Payer and receiver cannot be the same person', 'error');
      return;
    }
    if (data.amountPaise <= 0) {
      showToast('Repayment amount must be greater than zero', 'error');
      return;
    }
    try {
      await backendService.createSettlement(currentBlend.id, data);
      setIsRecordSettlementOpen(false);
      setSettlementPreset(null);
      showToast('Repayment logged');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to log repayment', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const updateSettlement = useCallback(async (
    id: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
    }
  ) => {
    if (!currentBlend) return;
    try {
      await backendService.updateSettlement(id, data);
      showToast('Repayment updated');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update repayment', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const deleteSettlement = useCallback(async (id: string) => {
    if (!currentBlend) return;
    try {
      await backendService.deleteSettlement(id);
      showToast('Repayment deleted');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to delete repayment', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const handleResetDemoData = useCallback(() => {
    backendService.resetDemoData();
    reloadData();
    showToast('Reset to demo data');
  }, [reloadData, showToast]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const login = useCallback(async (identifier: string, password?: string) => {
    try {
      let user: UserProfile;
      if (identifier.includes('@')) {
        // Sign in via registered email with password
        user = await backendService.loginUser(identifier, password);
      } else {
        // Sign in via userId
        user = backendService.switchDemoUser(identifier);
      }
      setCurrentUser(user);
      setIsLoggedIn(true);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, 'logged_in');
        }
      } catch (e) {
        console.warn('Could not persist auth status to localStorage', e);
      }
      setShowLandingPageState(false);
      setIsLoginOpen(false);
      showToast(`Welcome back, ${user.fullName}!`);
      await reloadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to sign in';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  }, [reloadData, showToast]);

  const registerUser = useCallback(async (fullName: string, email: string, password?: string): Promise<UserProfile> => {
    try {
      const user = await backendService.registerUser(fullName, email, password);
      setCurrentUser(user);
      setIsLoggedIn(true);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, 'logged_in');
        }
      } catch (e) {
        console.warn('Could not persist auth status to localStorage', e);
      }
      setShowLandingPageState(false);
      showToast(`Account created! Welcome, ${user.fullName}`);
      await reloadData();
      return user;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to register account';
      showToast(msg, 'error');
      throw e;
    }
  }, [reloadData, showToast]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, 'logged_out');
      }
    } catch (e) {
      console.warn('Could not persist auth status to localStorage', e);
    }
    setShowLandingPageState(true);
    setIsNotificationDrawerOpen(false);
    setIsPaymentSettingsOpen(false);
    setReviewingSettlement(null);
    showToast('Signed out successfully', 'info');
  }, [showToast]);

  const updatePaymentMethod = useCallback(async (method: UserPaymentMethod) => {
    try {
      await backendService.updateUserPaymentMethod(currentUser.id, method);
      setCurrentUser(prev => ({ ...prev, paymentMethod: method, isOnboarded: true }));
      showToast('UPI payment details saved & verified');
      setIsPaymentSettingsOpen(false);
      await reloadData(currentBlend?.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update payment details', 'error');
    }
  }, [currentUser.id, currentBlend?.id, reloadData, showToast]);

  const initiateSettlement = useCallback(async (data: {
    toMemberId: string;
    amountPaise: number;
    notes?: string;
  }): Promise<Settlement> => {
    if (!currentBlend) throw new Error('No active Blend');
    if (data.toMemberId === currentUser.id) {
      const err = new Error('You cannot settle with yourself');
      showToast(err.message, 'error');
      throw err;
    }
    if (data.amountPaise <= 0) {
      const err = new Error('Settlement amount must be greater than zero');
      showToast(err.message, 'error');
      throw err;
    }
    try {
      const s = await backendService.initiateSettlement(currentBlend.id, data);
      await reloadData(currentBlend.id);
      return s;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to initiate settlement';
      showToast(msg, 'error');
      throw e;
    }
  }, [currentBlend, currentUser.id, reloadData, showToast]);

  const submitSettlementProof = useCallback(async (
    settlementId: string,
    proofImageUrl: string,
    notes?: string
  ) => {
    if (!currentBlend) return;
    try {
      await backendService.submitSettlementProof(settlementId, proofImageUrl, notes);
      showToast('Payment proof submitted! Recipient notified to confirm.');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to submit proof', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const confirmSettlement = useCallback(async (settlementId: string, decisionNotes?: string) => {
    if (!currentBlend) return;
    try {
      await backendService.confirmSettlement(settlementId, decisionNotes);
      setReviewingSettlement(null);
      showToast('Payment verified! Debt cleared from balances.');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to verify payment', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const rejectSettlement = useCallback(async (settlementId: string, reason: string) => {
    if (!currentBlend) return;
    try {
      await backendService.rejectSettlement(settlementId, reason);
      setReviewingSettlement(null);
      showToast('Settlement marked as not received. Debt remains outstanding.', 'info');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update settlement', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const cancelSettlement = useCallback(async (settlementId: string) => {
    if (!currentBlend) return;
    try {
      await backendService.cancelSettlement(settlementId);
      showToast('Settlement request cancelled');
      await reloadData(currentBlend.id);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to cancel settlement', 'error');
    }
  }, [currentBlend, reloadData, showToast]);

  const markNotificationRead = useCallback((id: string) => {
    backendService.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    backendService.markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [currentUser.id]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentBlend,
        userBlends,
        blendMembers,
        members,
        expenses,
        settlements,
        isCloudConfigured: isSupabaseConfigured,
        allDemoUsers,
        isLoggedIn,
        activeTab,
        periodFilter,
        toast,
        isAddExpenseOpen,
        isRecordSettlementOpen,
        isBlendModalOpen,
        settlementPreset,
        viewingExpense,
        editingExpense,
        balances,
        suggestedSettlements,
        totalGroupSpendPaise,
        periodExpenses,
        periodSpendPaise,
        currentUserBalance,
        setActiveTab,
        setPeriodFilter,
        openAddExpense: () => setIsAddExpenseOpen(true),
        closeAddExpense: () => setIsAddExpenseOpen(false),
        openRecordSettlement: preset => {
          setSettlementPreset(preset || null);
          setIsRecordSettlementOpen(true);
        },
        closeRecordSettlement: () => {
          setIsRecordSettlementOpen(false);
          setSettlementPreset(null);
        },
        openBlendModal: () => setIsBlendModalOpen(true),
        closeBlendModal: () => setIsBlendModalOpen(false),
        openExpenseDetails: exp => setViewingExpense(exp),
        closeExpenseDetails: () => setViewingExpense(null),
        openEditExpense: exp => setEditingExpense(exp),
        closeEditExpense: () => setEditingExpense(null),
        isBlendAdmin,
        switchAccount,
        switchBlend,
        createBlend,
        joinBlendWithFriendCode,
        updateBlendName,
        updateBlendDetails,
        deleteBlend,
        removeMemberFromBlend,
        addMemberToBlend,
        validateInviteCode,
        addExpense,
        updateExpense,
        deleteExpense,
        recordSettlement,
        updateSettlement,
        deleteSettlement,
        handleResetDemoData,
        showToast,

        // Public Landing Page & Onboarding
        showLandingPage,
        setShowLandingPage,
        isOnboardingOpen,
        openOnboarding: () => setIsOnboardingOpen(true),
        closeOnboarding: () => setIsOnboardingOpen(false),
        isLoginOpen,
        openLogin: () => setIsLoginOpen(true),
        closeLogin: () => setIsLoginOpen(false),
        login,
        registerUser,
        logout,

        // Notifications
        notifications,
        unreadNotificationsCount,
        isNotificationDrawerOpen,
        openNotificationDrawer: () => setIsNotificationDrawerOpen(true),
        closeNotificationDrawer: () => setIsNotificationDrawerOpen(false),
        markNotificationRead,
        markAllNotificationsRead,

        // Proof Review Modal
        reviewingSettlement,
        openProofReview: (s: Settlement) => setReviewingSettlement(s),
        closeProofReview: () => setReviewingSettlement(null),

        // Payment Settings
        isPaymentSettingsOpen,
        openPaymentSettings: () => setIsPaymentSettingsOpen(true),
        closePaymentSettings: () => setIsPaymentSettingsOpen(false),
        updatePaymentMethod,

        // Settlement Lifecycle
        initiateSettlement,
        submitSettlementProof,
        confirmSettlement,
        rejectSettlement,
        cancelSettlement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
