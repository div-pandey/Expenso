import type {
  UserProfile,
  Blend,
  BlendMember,
  Expense,
  Settlement,
  TransportCategory,
  UserPaymentMethod,
  InAppNotification,
} from '../types';
import { generateInviteCode, normalizeInviteCode } from '../utils/inviteCodes';
import { calculateEqualShares } from '../utils/calculations';

const SANDBOX_STORAGE_KEY = 'expenso_multiuser_sandbox_v5';

interface SandboxDB {
  users: UserProfile[];
  blends: Blend[];
  blendMembers: { blendId: string; userId: string; role: 'admin' | 'member'; joinedAt: string }[];
  expenses: Expense[];
  settlements: Settlement[];
  notifications: InAppNotification[];
  currentUserId: string;
}

// Seed initial 3 distinct accounts with verified UPI payment methods
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_you',
    email: 'divyansh@campus.edu',
    fullName: 'Divyansh',
    initials: 'DI',
    avatarColor: 'bg-emerald-600 text-white',
    inviteCode: 'DIVY24',
    phone: '+91 98765 43210',
    isOnboarded: true,
    paymentMethod: {
      userId: 'user_you',
      payeeName: 'Divyansh',
      upiId: 'divyansh@oksbi',
      qrPayload: 'upi://pay?pa=divyansh@oksbi&pn=Divyansh&cu=INR&tn=Expenso',
      qrFormatVerified: true,
      currency: 'INR',
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'user_rahul',
    email: 'rahul@campus.edu',
    fullName: 'Rahul Sharma',
    initials: 'RA',
    avatarColor: 'bg-amber-600 text-white',
    inviteCode: 'RAHUL9',
    phone: '+91 98111 22334',
    isOnboarded: true,
    paymentMethod: {
      userId: 'user_rahul',
      payeeName: 'Rahul Sharma',
      upiId: 'rahul.sharma@okhdfcbank',
      qrPayload: 'upi://pay?pa=rahul.sharma@okhdfcbank&pn=Rahul%20Sharma&cu=INR&tn=Expenso',
      qrFormatVerified: true,
      currency: 'INR',
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    createdAt: '2026-10-20T08:00:00.000Z',
  },
  {
    id: 'user_aman',
    email: 'aman@campus.edu',
    fullName: 'Aman Verma',
    initials: 'AM',
    avatarColor: 'bg-sky-600 text-white',
    inviteCode: 'AMAN72',
    phone: '+91 98222 33445',
    isOnboarded: true,
    paymentMethod: {
      userId: 'user_aman',
      payeeName: 'Aman Verma',
      upiId: 'aman.verma@paytm',
      qrPayload: 'upi://pay?pa=aman.verma@paytm&pn=Aman%20Verma&cu=INR&tn=Expenso',
      qrFormatVerified: true,
      currency: 'INR',
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-20T08:00:00.000Z',
    },
    createdAt: '2026-10-20T08:00:00.000Z',
  },
];

const INITIAL_BLEND: Blend = {
  id: 'blend_college_crew',
  name: 'College Crew',
  createdBy: 'user_you',
  createdAt: '2026-10-20T08:00:00.000Z',
  memberCount: 3,
  blendCode: 'CREW99',
};

const INITIAL_MEMBERS = [
  { blendId: 'blend_college_crew', userId: 'user_you', role: 'admin' as const, joinedAt: '2026-10-20T08:00:00.000Z' },
  { blendId: 'blend_college_crew', userId: 'user_rahul', role: 'member' as const, joinedAt: '2026-10-20T08:05:00.000Z' },
  { blendId: 'blend_college_crew', userId: 'user_aman', role: 'member' as const, joinedAt: '2026-10-20T08:10:00.000Z' },
];

const INITIAL_EXPENSES: Expense[] = [];

const INITIAL_SETTLEMENTS: Settlement[] = [];

class SandboxBackendService {
  private db: SandboxDB;

  constructor() {
    this.db = this.loadDB();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === SANDBOX_STORAGE_KEY) {
          this.syncFromStorage();
        }
      });
    }
  }

  private syncFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.users)) {
            for (const su of parsed.users) {
              const idx = this.db.users.findIndex(u => u.id === su.id);
              if (idx >= 0) {
                this.db.users[idx] = { ...this.db.users[idx], ...su };
              } else {
                this.db.users.push(su);
              }
            }
          }
          if (parsed && Array.isArray(parsed.blends)) {
            for (const sb of parsed.blends) {
              const idx = this.db.blends.findIndex(b => b.id === sb.id);
              if (idx >= 0) {
                this.db.blends[idx] = { ...this.db.blends[idx], ...sb };
              } else {
                this.db.blends.push(sb);
              }
            }
          }
          if (parsed && Array.isArray(parsed.blendMembers)) {
            for (const sbm of parsed.blendMembers) {
              const exists = this.db.blendMembers.some(
                bm => bm.blendId === sbm.blendId && bm.userId === sbm.userId
              );
              if (!exists) {
                this.db.blendMembers.push(sbm);
              }
            }
          }
          if (parsed && Array.isArray(parsed.expenses)) {
            for (const se of parsed.expenses) {
              const idx = this.db.expenses.findIndex(e => e.id === se.id);
              if (idx >= 0) {
                this.db.expenses[idx] = { ...this.db.expenses[idx], ...se };
              } else {
                this.db.expenses.push(se);
              }
            }
          }
          if (parsed && Array.isArray(parsed.settlements)) {
            for (const ss of parsed.settlements) {
              const idx = this.db.settlements.findIndex(s => s.id === ss.id);
              if (idx >= 0) {
                this.db.settlements[idx] = { ...this.db.settlements[idx], ...ss };
              } else {
                this.db.settlements.push(ss);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Sandbox sync error:', e);
    }
  }

  private loadDB(): SandboxDB {
    try {
      if (typeof localStorage !== 'undefined') {
        // Clear previous storage keys with fake demo data
        localStorage.removeItem('expenso_multiuser_sandbox_v4');
        localStorage.removeItem('expenso_multiuser_sandbox_v3');
        localStorage.removeItem('expenso_multiuser_sandbox_v2');
        localStorage.removeItem('expenso_multiuser_sandbox_v1');
        localStorage.removeItem('expenso_data_v1');

        const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
              parsed.users = [...INITIAL_USERS];
            } else {
              // Ensure initial demo accounts always exist
              for (const initUser of INITIAL_USERS) {
                if (!parsed.users.some((u: UserProfile) => u.id === initUser.id)) {
                  parsed.users.push(initUser);
                }
              }
            }
            if (!Array.isArray(parsed.blends) || parsed.blends.length === 0) {
              parsed.blends = [{ ...INITIAL_BLEND }];
            } else {
              // Ensure all blends have a 6-character blendCode
              for (const b of parsed.blends) {
                if (!b.blendCode) {
                  b.blendCode = generateInviteCode();
                }
              }
            }
            if (!Array.isArray(parsed.blendMembers) || parsed.blendMembers.length === 0) {
              parsed.blendMembers = [...INITIAL_MEMBERS];
            }
            if (Array.isArray(parsed.expenses)) {
              parsed.expenses = parsed.expenses.filter((e: Expense) => !e.id.startsWith('exp_demo') && !['exp_1', 'exp_2', 'exp_3', 'exp_4', 'exp_5'].includes(e.id));
            } else {
              parsed.expenses = [];
            }
            if (Array.isArray(parsed.settlements)) {
              parsed.settlements = parsed.settlements.filter((s: Settlement) => !s.id.startsWith('set_demo') && s.id !== 'set_1');
            } else {
              parsed.settlements = [];
            }
            if (!Array.isArray(parsed.notifications)) {
              parsed.notifications = [];
            }
            if (!parsed.currentUserId) {
              parsed.currentUserId = parsed.users[0]?.id || 'user_you';
            }
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Sandbox load error, initializing fresh DB', e);
    }

    const defaultDB: SandboxDB = {
      users: [...INITIAL_USERS],
      blends: [{ ...INITIAL_BLEND }],
      blendMembers: [...INITIAL_MEMBERS],
      expenses: [...INITIAL_EXPENSES],
      settlements: [...INITIAL_SETTLEMENTS],
      notifications: [],
      currentUserId: 'user_you',
    };
    this.saveDB(defaultDB);
    return defaultDB;
  }

  private saveDB(db: SandboxDB = this.db): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
        if (raw) {
          try {
            const stored = JSON.parse(raw) as Partial<SandboxDB>;
            if (stored.users && Array.isArray(stored.users)) {
              for (const su of stored.users) {
                if (!db.users.some(u => u.id === su.id)) {
                  db.users.push(su);
                }
              }
            }
            if (stored.blends && Array.isArray(stored.blends)) {
              for (const sb of stored.blends) {
                if (!db.blends.some(b => b.id === sb.id)) {
                  db.blends.push(sb);
                }
              }
            }
            if (stored.blendMembers && Array.isArray(stored.blendMembers)) {
              for (const sbm of stored.blendMembers) {
                if (!db.blendMembers.some(bm => bm.blendId === sbm.blendId && bm.userId === sbm.userId)) {
                  db.blendMembers.push(sbm);
                }
              }
            }
          } catch {
            // ignore parse error
          }
        }
        localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(db));
      }
    } catch (e) {
      console.error('Failed to save sandbox DB', e);
    }
  }

  public resetDemoData(): void {
    this.db = {
      users: [...INITIAL_USERS],
      blends: [{ ...INITIAL_BLEND }],
      blendMembers: [...INITIAL_MEMBERS],
      expenses: [...INITIAL_EXPENSES],
      settlements: [...INITIAL_SETTLEMENTS],
      notifications: [],
      currentUserId: 'user_you',
    };
    this.saveDB();
  }

  // --- Tab-Scoped & Multi-Session Active User Management ---

  public getActiveUserId(): string {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const sessionUser = sessionStorage.getItem('expenso_tab_user_id');
        if (sessionUser && this.db.users.some(u => u.id === sessionUser)) {
          return sessionUser;
        }
      } catch {
        // ignore
      }
    }
    return this.db.currentUserId || this.db.users[0]?.id || 'user_you';
  }

  public setActiveUserId(userId: string): void {
    this.db.currentUserId = userId;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('expenso_tab_user_id', userId);
      } catch {
        // ignore
      }
    }
    this.saveDB();
  }

  // --- Auth & Profile Management ---

  public getCurrentUser(): UserProfile {
    this.syncFromStorage();
    const activeId = this.getActiveUserId();
    const user = this.db.users.find(u => u.id === activeId);
    if (!user) {
      // Fallback to first user
      const fallbackId = this.db.users[0]?.id || 'user_you';
      this.setActiveUserId(fallbackId);
      return this.db.users[0];
    }
    return user;
  }

  public getAllDemoUsers(): UserProfile[] {
    this.syncFromStorage();
    return this.db.users;
  }

  public switchActiveUser(userId: string): UserProfile {
    this.syncFromStorage();
    const user = this.db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    this.setActiveUserId(user.id);
    return user;
  }

  public registerUser(fullName: string, email: string): UserProfile {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.db.users.find(u => u.email === normalizedEmail);
    if (existing) {
      if (fullName.trim()) {
        existing.fullName = fullName.trim();
      }
      this.setActiveUserId(existing.id);
      // Ensure user has at least one starter Blend
      const existingBlends = this.getUserBlends(existing.id);
      if (existingBlends.length === 0) {
        let blendCode = generateInviteCode();
        while (this.db.blends.some(b => b.blendCode === blendCode)) {
          blendCode = generateInviteCode();
        }
        const starterBlend: Blend = {
          id: `blend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: `${existing.fullName}'s Commute Blend`,
          createdBy: existing.id,
          createdAt: new Date().toISOString(),
          memberCount: 1,
          blendCode,
        };
        this.db.blends.push(starterBlend);
        this.db.blendMembers.push({
          blendId: starterBlend.id,
          userId: existing.id,
          role: 'admin',
          joinedAt: new Date().toISOString(),
        });
      }
      this.saveDB();
      return existing;
    }

    // Ensure unique 6-character invite code
    let code = generateInviteCode();
    while (this.db.users.some(u => u.inviteCode === code)) {
      code = generateInviteCode();
    }

    const initials = fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'EX';

    const colors = [
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-sky-600 text-white',
      'bg-purple-600 text-white',
      'bg-rose-600 text-white',
      'bg-teal-600 text-white',
    ];
    const avatarColor = colors[this.db.users.length % colors.length];

    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: normalizedEmail,
      fullName: fullName.trim(),
      initials,
      avatarColor,
      inviteCode: code,
      createdAt: new Date().toISOString(),
      isOnboarded: false,
    };

    this.db.users.push(newUser);
    this.setActiveUserId(newUser.id);

    // Create a starter Commute Blend for the newly registered user with unique 6-character Blend Code
    let starterBlendCode = generateInviteCode();
    while (this.db.blends.some(b => b.blendCode === starterBlendCode)) {
      starterBlendCode = generateInviteCode();
    }
    const starterBlend: Blend = {
      id: `blend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${fullName.trim()}'s Commute Blend`,
      createdBy: newUser.id,
      createdAt: new Date().toISOString(),
      memberCount: 1,
      blendCode: starterBlendCode,
    };
    this.db.blends.push(starterBlend);
    this.db.blendMembers.push({
      blendId: starterBlend.id,
      userId: newUser.id,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    });

    this.saveDB();
    return newUser;
  }

  public loginUser(email: string): UserProfile {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.db.users.find(u => u.email === normalizedEmail);
    if (!user) {
      throw new Error('No account found with this email. Please sign up.');
    }
    this.setActiveUserId(user.id);
    return user;
  }

  public addUser(user: UserProfile): void {
    this.syncFromStorage();
    const idx = this.db.users.findIndex(u => u.id === user.id || u.inviteCode === user.inviteCode);
    if (idx >= 0) {
      this.db.users[idx] = { ...this.db.users[idx], ...user };
    } else {
      this.db.users.push(user);
    }
    this.saveDB();
  }

  public addBlend(blend: Blend, members?: { blendId: string; userId: string; role: 'admin' | 'member'; joinedAt: string }[]): void {
    this.syncFromStorage();
    const idx = this.db.blends.findIndex(b => b.id === blend.id || (blend.blendCode && b.blendCode === blend.blendCode));
    if (idx >= 0) {
      this.db.blends[idx] = { ...this.db.blends[idx], ...blend };
    } else {
      this.db.blends.push(blend);
    }
    if (members && Array.isArray(members)) {
      for (const m of members) {
        if (!this.db.blendMembers.some(bm => bm.blendId === m.blendId && bm.userId === m.userId)) {
          this.db.blendMembers.push(m);
        }
      }
    }
    this.saveDB();
  }

  public findUserByInviteCode(code: string): UserProfile | null {
    const normalized = normalizeInviteCode(code);
    this.syncFromStorage();
    let user = this.db.users.find(u => u.inviteCode === normalized);
    if (!user) {
      user = this.db.users.find(u => u.inviteCode.trim().toUpperCase() === normalized);
    }
    return user || null;
  }

  public findBlendByCode(code: string): Blend | null {
    const normalized = normalizeInviteCode(code);
    this.syncFromStorage();
    let blend = this.db.blends.find(b => b.blendCode === normalized || b.id === normalized);
    if (!blend) {
      blend = this.db.blends.find(b => b.blendCode?.trim().toUpperCase() === normalized);
    }
    return blend || null;
  }

  public findUserOrBlendByCode(code: string): { type: 'user'; user: UserProfile } | { type: 'blend'; blend: Blend } | null {
    const user = this.findUserByInviteCode(code);
    if (user) return { type: 'user', user };
    const blend = this.findBlendByCode(code);
    if (blend) return { type: 'blend', blend };
    return null;
  }

  // --- Blend Management ---

  public getUserBlends(userId: string = this.db.currentUserId): Blend[] {
    this.syncFromStorage();
    const blendIds = this.db.blendMembers
      .filter(bm => bm.userId === userId)
      .map(bm => bm.blendId);

    return this.db.blends
      .filter(b => blendIds.includes(b.id))
      .map(b => ({
        ...b,
        memberCount: this.db.blendMembers.filter(bm => bm.blendId === b.id).length,
      }));
  }

  public getBlendMembers(blendId: string): BlendMember[] {
    this.syncFromStorage();
    const members = this.db.blendMembers.filter(bm => bm.blendId === blendId);
    return members
      .map(bm => {
        const profile = this.db.users.find(u => u.id === bm.userId);
        if (!profile) return null;
        return {
          id: `${bm.blendId}_${bm.userId}`,
          blendId: bm.blendId,
          userId: bm.userId,
          role: bm.role,
          joinedAt: bm.joinedAt,
          profile,
        };
      })
      .filter((bm): bm is BlendMember => bm !== null);
  }

  public createBlend(name: string, friendInviteCode?: string): Blend {
    const currentUser = this.getCurrentUser();
    let code = generateInviteCode();
    while (this.db.blends.some(b => b.blendCode === code)) {
      code = generateInviteCode();
    }

    const newBlend: Blend = {
      id: `blend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      memberCount: 1,
      blendCode: code,
    };

    this.db.blends.push(newBlend);
    // Add current user as admin
    this.db.blendMembers.push({
      blendId: newBlend.id,
      userId: currentUser.id,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    });

    // If friend's invite code provided, connect friend immediately
    if (friendInviteCode) {
      const friend = this.findUserByInviteCode(friendInviteCode);
      if (friend && friend.id !== currentUser.id) {
        this.db.blendMembers.push({
          blendId: newBlend.id,
          userId: friend.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
        newBlend.memberCount = 2;
      }
    }

    this.saveDB();
    return newBlend;
  }

  public joinBlendWithFriendCode(code: string, blendId?: string): { blend: Blend; friend?: UserProfile } {
    const cleanCode = normalizeInviteCode(code);
    const currentUser = this.getCurrentUser();

    // 1. Check if direct Blend Code
    const directBlend = this.findBlendByCode(cleanCode);
    if (directBlend) {
      const alreadyMember = this.db.blendMembers.some(
        bm => bm.blendId === directBlend.id && bm.userId === currentUser.id
      );
      if (!alreadyMember) {
        this.db.blendMembers.push({
          blendId: directBlend.id,
          userId: currentUser.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
      }
      directBlend.memberCount = this.db.blendMembers.filter(bm => bm.blendId === directBlend.id).length;
      this.saveDB();
      const creator = this.db.users.find(u => u.id === directBlend.createdBy);
      return { blend: directBlend, friend: creator };
    }

    // 2. Check if Friend's Personal Invite Code
    const friend = this.findUserByInviteCode(cleanCode);
    if (!friend) {
      throw new Error(`No user or Blend found with code "${cleanCode}". Check and try again.`);
    }

    if (friend.id === currentUser.id) {
      throw new Error('You cannot enter your own invitation code.');
    }

    // Find a blend that the friend belongs to
    let targetBlend: Blend | undefined;
    if (blendId) {
      targetBlend = this.db.blends.find(b => b.id === blendId);
    } else {
      const friendBlendIds = this.db.blendMembers
        .filter(bm => bm.userId === friend.id)
        .map(bm => bm.blendId);
      targetBlend = this.db.blends.find(b => friendBlendIds.includes(b.id));

      // If friend has no blend, create a new shared Blend together!
      if (!targetBlend) {
        let newBlendCode = generateInviteCode();
        while (this.db.blends.some(b => b.blendCode === newBlendCode)) {
          newBlendCode = generateInviteCode();
        }
        targetBlend = {
          id: `blend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: `${friend.fullName} & ${currentUser.fullName} Blend`,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          memberCount: 2,
          blendCode: newBlendCode,
        };
        this.db.blends.push(targetBlend);
        this.db.blendMembers.push({
          blendId: targetBlend.id,
          userId: friend.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
        });
      }
    }

    if (!targetBlend) throw new Error('Could not find target Blend.');

    // Add current user to this blend if not already joined
    const alreadyMember = this.db.blendMembers.some(
      bm => bm.blendId === targetBlend!.id && bm.userId === currentUser.id
    );
    if (!alreadyMember) {
      this.db.blendMembers.push({
        blendId: targetBlend.id,
        userId: currentUser.id,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });
    }
    targetBlend.memberCount = this.db.blendMembers.filter(bm => bm.blendId === targetBlend!.id).length;

    this.saveDB();
    return { blend: targetBlend, friend };
  }

  public updateBlendName(blendId: string, newName: string): void {
    const blend = this.db.blends.find(b => b.id === blendId);
    if (!blend) throw new Error('Blend not found');
    blend.name = newName.trim();
    this.saveDB();
  }

  // --- Expenses & Payer Ownership Rule Enforcement ---

  public getBlendExpenses(blendId: string): Expense[] {
    const currentUser = this.getCurrentUser();
    // Validate membership
    const isMember = this.db.blendMembers.some(
      bm => bm.blendId === blendId && bm.userId === currentUser.id
    );
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this Blend.');
    }

    return this.db.expenses
      .filter(e => e.blendId === blendId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createExpense(
    blendId: string,
    data: {
      amountPaise: number;
      category: TransportCategory;
      description: string;
      participantIds: string[];
      date: string;
      notes?: string;
      forgedPayerId?: string; // used to test/verify that forging payer is strictly blocked!
    }
  ): Expense {
    const currentUser = this.getCurrentUser();

    // 1. Membership check
    const isMember = this.db.blendMembers.some(
      bm => bm.blendId === blendId && bm.userId === currentUser.id
    );
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this Blend.');
    }

    // 2. CRITICAL RULE: Backend enforces that payer MUST be the authenticated user!
    if (data.forgedPayerId && data.forgedPayerId !== currentUser.id) {
      throw new Error('Security Error: You cannot record an expense on behalf of another user. Payer must be the authenticated user.');
    }

    // 3. Validate that all participants belong to this Blend
    const blendMemberIds = this.db.blendMembers
      .filter(bm => bm.blendId === blendId)
      .map(bm => bm.userId);

    for (const pid of data.participantIds) {
      if (!blendMemberIds.includes(pid)) {
        throw new Error(`Participant ${pid} is not a member of this Blend.`);
      }
    }

    if (data.participantIds.length === 0) {
      throw new Error('At least one participant must be selected.');
    }

    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    const shares = calculateEqualShares(data.amountPaise, data.participantIds);

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blendId,
      createdBy: currentUser.id,
      payerId: currentUser.id, // Strictly bound to authenticated user
      amountPaise: data.amountPaise,
      category: data.category,
      description: data.description.trim(),
      participantIds: data.participantIds,
      shares,
      date: data.date,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.expenses.unshift(newExpense);
    this.saveDB();
    return newExpense;
  }

  public updateExpense(
    expenseId: string,
    data: {
      amountPaise: number;
      category: TransportCategory;
      description: string;
      participantIds: string[];
      date: string;
      notes?: string;
    }
  ): Expense {
    const currentUser = this.getCurrentUser();
    const exp = this.db.expenses.find(e => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');

    // CRITICAL: Only creator can edit
    if (exp.createdBy !== currentUser.id) {
      throw new Error('Forbidden: You can only edit expenses that you personally created.');
    }

    const shares = calculateEqualShares(data.amountPaise, data.participantIds);

    exp.amountPaise = data.amountPaise;
    exp.category = data.category;
    exp.description = data.description.trim();
    exp.participantIds = data.participantIds;
    exp.shares = shares;
    exp.date = data.date;
    exp.notes = data.notes?.trim() || undefined;
    exp.updatedAt = new Date().toISOString();

    this.saveDB();
    return exp;
  }

  public deleteExpense(expenseId: string): void {
    const currentUser = this.getCurrentUser();
    const exp = this.db.expenses.find(e => e.id === expenseId);
    if (!exp) throw new Error('Expense not found');

    // CRITICAL: Only creator can delete
    if (exp.createdBy !== currentUser.id) {
      throw new Error('Forbidden: You can only delete expenses that you personally created.');
    }

    this.db.expenses = this.db.expenses.filter(e => e.id !== expenseId);
    this.saveDB();
  }

  // --- Settlements ---

  public getBlendSettlements(blendId: string): Settlement[] {
    const currentUser = this.getCurrentUser();
    const isMember = this.db.blendMembers.some(
      bm => bm.blendId === blendId && bm.userId === currentUser.id
    );
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this Blend.');
    }

    return this.db.settlements
      .filter(s => s.blendId === blendId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createSettlement(
    blendId: string,
    data: {
      fromMemberId: string;
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
    }
  ): Settlement {
    const currentUser = this.getCurrentUser();

    // CRITICAL: Authenticated user must be the sender (no impersonation)
    if (data.fromMemberId !== currentUser.id) {
      throw new Error('Unauthorized: You can only record repayments that you personally made.');
    }

    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    if (data.fromMemberId === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }

    // Validate both belong to the blend
    const blendMemberIds = this.db.blendMembers
      .filter(bm => bm.blendId === blendId)
      .map(bm => bm.userId);

    if (!blendMemberIds.includes(data.fromMemberId) || !blendMemberIds.includes(data.toMemberId)) {
      throw new Error('Both members must belong to this Blend.');
    }

    const newSettlement: Settlement = {
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blendId,
      createdBy: currentUser.id,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId,
      amountPaise: data.amountPaise,
      date: data.date,
      notes: data.notes?.trim() || undefined,
      status: (data as any).status || 'confirmed',
      createdAt: new Date().toISOString(),
    };

    this.db.settlements.unshift(newSettlement);
    this.saveDB();
    return newSettlement;
  }

  public initiateSettlement(
    blendId: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date?: string;
      notes?: string;
    }
  ): Settlement {
    const currentUser = this.getCurrentUser();

    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    if (currentUser.id === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }

    const blendMemberIds = this.db.blendMembers
      .filter(bm => bm.blendId === blendId)
      .map(bm => bm.userId);

    if (!blendMemberIds.includes(currentUser.id) || !blendMemberIds.includes(data.toMemberId)) {
      throw new Error('Both members must belong to this Blend.');
    }

    const newSettlement: Settlement = {
      id: `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      blendId,
      createdBy: currentUser.id,
      fromMemberId: currentUser.id,
      toMemberId: data.toMemberId,
      amountPaise: data.amountPaise,
      date: data.date || new Date().toISOString(),
      notes: data.notes?.trim() || undefined,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    };

    this.db.settlements.unshift(newSettlement);
    this.saveDB();
    return newSettlement;
  }

  public submitSettlementProof(
    settlementId: string,
    proofImageUrl: string,
    notes?: string
  ): Settlement {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Settlement record not found.');

    if (s.fromMemberId !== currentUser.id) {
      throw new Error('Forbidden: Only the sender can submit payment proof.');
    }

    if (s.status === 'confirmed' || s.status === 'cancelled') {
      throw new Error(`Cannot submit proof for a settlement that is already ${s.status}.`);
    }

    s.proofImageUrl = proofImageUrl;
    s.status = 'proof_submitted';
    if (notes) s.notes = notes.trim();
    s.updatedAt = new Date().toISOString();

    // Create notification for recipient
    const sender = currentUser;
    const amountRupees = (s.amountPaise / 100).toFixed(2);

    const notif: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: s.toMemberId,
      blendId: s.blendId,
      type: 'settlement_proof_submitted',
      title: 'Payment Proof Received',
      message: `${sender.fullName} says they sent you ₹${amountRupees}.`,
      settlementId: s.id,
      amountPaise: s.amountPaise,
      actorId: sender.id,
      proofImageUrl,
      isRead: false,
      isHandled: false,
      createdAt: new Date().toISOString(),
    };

    if (!this.db.notifications) this.db.notifications = [];
    this.db.notifications.unshift(notif);

    this.saveDB();
    return s;
  }

  public confirmSettlement(
    settlementId: string,
    decisionNotes?: string
  ): Settlement {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Settlement record not found.');

    // CRITICAL: Only the designated recipient can confirm receipt
    if (s.toMemberId !== currentUser.id) {
      throw new Error('Forbidden: Only the designated recipient can confirm this settlement.');
    }

    if (s.status === 'confirmed') {
      throw new Error('Duplicate Action: This settlement is already confirmed.');
    }

    s.status = 'confirmed';
    s.confirmedAt = new Date().toISOString();
    if (decisionNotes) s.decisionNotes = decisionNotes.trim();
    s.updatedAt = new Date().toISOString();

    // Mark recipient notification as handled
    if (this.db.notifications) {
      for (const n of this.db.notifications) {
        if (n.settlementId === s.id && n.userId === currentUser.id) {
          n.isHandled = true;
          n.isRead = true;
        }
      }

      // Send confirmation notification to sender
      const amountRupees = (s.amountPaise / 100).toFixed(2);
      this.db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: s.fromMemberId,
        blendId: s.blendId,
        type: 'settlement_confirmed',
        title: 'Repayment Confirmed',
        message: `${currentUser.fullName} confirmed receipt of your ₹${amountRupees} payment.`,
        settlementId: s.id,
        amountPaise: s.amountPaise,
        actorId: currentUser.id,
        isRead: false,
        isHandled: true,
        createdAt: new Date().toISOString(),
      });
    }

    this.saveDB();
    return s;
  }

  public rejectSettlement(
    settlementId: string,
    reason: string
  ): Settlement {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Settlement record not found.');

    // CRITICAL: Only the designated recipient can reject receipt
    if (s.toMemberId !== currentUser.id) {
      throw new Error('Forbidden: Only the designated recipient can reject this settlement.');
    }

    s.status = 'rejected';
    s.rejectedAt = new Date().toISOString();
    s.decisionNotes = reason.trim();
    s.updatedAt = new Date().toISOString();

    // Mark recipient notification as handled
    if (this.db.notifications) {
      for (const n of this.db.notifications) {
        if (n.settlementId === s.id && n.userId === currentUser.id) {
          n.isHandled = true;
          n.isRead = true;
        }
      }

      // Notify sender that payment was not received
      const amountRupees = (s.amountPaise / 100).toFixed(2);
      this.db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: s.fromMemberId,
        blendId: s.blendId,
        type: 'settlement_rejected',
        title: 'Payment Disputed / Not Received',
        message: `${currentUser.fullName} indicated they have not received ₹${amountRupees}: "${reason.trim()}"`,
        settlementId: s.id,
        amountPaise: s.amountPaise,
        actorId: currentUser.id,
        isRead: false,
        isHandled: true,
        createdAt: new Date().toISOString(),
      });
    }

    this.saveDB();
    return s;
  }

  public cancelSettlement(settlementId: string): Settlement {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Settlement record not found.');

    if (s.fromMemberId !== currentUser.id && s.createdBy !== currentUser.id) {
      throw new Error('Forbidden: You can only cancel your own pending settlement.');
    }

    if (s.status === 'confirmed') {
      throw new Error('Cannot cancel a settlement that is already confirmed.');
    }

    s.status = 'cancelled';
    s.updatedAt = new Date().toISOString();
    this.saveDB();
    return s;
  }

  // --- Payment Method & Notifications ---

  public updateUserPaymentMethod(userId: string, paymentMethod: UserPaymentMethod): void {
    const currentUser = this.getCurrentUser();
    if (currentUser.id !== userId) {
      throw new Error('Forbidden: You can only update your own payment method.');
    }

    const u = this.db.users.find(usr => usr.id === userId);
    if (!u) throw new Error('User not found.');

    u.paymentMethod = paymentMethod;
    u.isOnboarded = true;

    // Update in blend members as well
    for (const bm of this.db.blendMembers) {
      if (bm.userId === userId) {
        bm.role = bm.role; // keep role
      }
    }

    this.saveDB();
  }

  public getUserPaymentMethod(userId: string): UserPaymentMethod | undefined {
    const u = this.db.users.find(usr => usr.id === userId);
    return u?.paymentMethod;
  }

  public getNotifications(userId: string): InAppNotification[] {
    if (!this.db.notifications) return [];
    return this.db.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markNotificationRead(notificationId: string): void {
    if (!this.db.notifications) return;
    const n = this.db.notifications.find(item => item.id === notificationId);
    if (n) {
      n.isRead = true;
      this.saveDB();
    }
  }

  public markAllNotificationsRead(userId: string): void {
    if (!this.db.notifications) return;
    for (const n of this.db.notifications) {
      if (n.userId === userId) {
        n.isRead = true;
      }
    }
    this.saveDB();
  }

  public updateSettlement(
    settlementId: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
    }
  ): Settlement {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Repayment record not found');

    if (s.createdBy !== currentUser.id) {
      throw new Error('Forbidden: You can only edit repayments that you personally recorded.');
    }

    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    if (s.fromMemberId === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }

    const blendMemberIds = this.db.blendMembers
      .filter(bm => bm.blendId === s.blendId)
      .map(bm => bm.userId);

    if (!blendMemberIds.includes(data.toMemberId)) {
      throw new Error('Recipient must belong to this Blend.');
    }

    s.toMemberId = data.toMemberId;
    s.amountPaise = data.amountPaise;
    s.date = data.date;
    s.notes = data.notes?.trim() || undefined;

    this.saveDB();
    return s;
  }

  public deleteSettlement(settlementId: string): void {
    const currentUser = this.getCurrentUser();
    const s = this.db.settlements.find(item => item.id === settlementId);
    if (!s) throw new Error('Repayment record not found');

    if (s.createdBy !== currentUser.id) {
      throw new Error('Forbidden: You can only delete repayments that you personally recorded.');
    }

    this.db.settlements = this.db.settlements.filter(item => item.id !== settlementId);
    this.saveDB();
  }
}

export const sandboxBackend = new SandboxBackendService();
