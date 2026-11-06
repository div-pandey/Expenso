import { isSupabaseConfigured, supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { sandboxBackend } from './sandboxBackend';
import { normalizeInviteCode } from '../utils/inviteCodes';
import { generateUUID } from '../utils/uuid';
import { hashPassword } from '../utils/crypto';
import type {
  UserProfile,
  Blend,
  BlendMember,
  Expense,
  Settlement,
  SettlementStatus,
  TransportCategory,
  UserPaymentMethod,
  InAppNotification,
  NotificationType,
} from '../types';

// ─── Realtime & Cross-Tab Sync Infrastructure ───────────────────────────────

type SyncListener = (event: { type: string; payload?: unknown }) => void;
const syncListeners = new Set<SyncListener>();

export function onSync(listener: SyncListener): void {
  syncListeners.add(listener);
}

export function offSync(listener: SyncListener): void {
  syncListeners.delete(listener);
}

function notifySyncListeners(event: { type: string; payload?: unknown }): void {
  syncListeners.forEach(fn => {
    try {
      fn(event);
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
}

// 1. Cross-Tab Channel for immediate same-browser synchronization
const INTERNAL_BROADCAST_CHANNEL = 'expenso_tab_sync_v1';
let internalChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    internalChannel = new BroadcastChannel(INTERNAL_BROADCAST_CHANNEL);
    internalChannel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'USER_SYNC' && payload?.user) {
        sandboxBackend.addUser(payload.user);
        notifySyncListeners({ type: 'USER_SYNC', payload });
      } else if (type === 'BLEND_SYNC' && payload?.blend) {
        sandboxBackend.addBlend(payload.blend, payload.members);
        notifySyncListeners({ type: 'BLEND_SYNC', payload });
      } else if (type === 'EXPENSE_SYNC' && payload?.expense) {
        sandboxBackend.addExpense(payload.expense);
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'EXPENSE_DELETED' && payload?.expenseId) {
        sandboxBackend.deleteExpenseLocally(payload.expenseId);
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'SETTLEMENT_SYNC' && payload?.settlement) {
        sandboxBackend.addSettlement(payload.settlement);
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'SETTLEMENT_DELETED' && payload?.settlementId) {
        sandboxBackend.deleteSettlementLocally(payload.settlementId);
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'NOTIFICATION_SYNC' && payload?.notification) {
        sandboxBackend.addNotification(payload.notification);
        notifySyncListeners({ type: 'NOTIFICATION_SYNC', payload });
      } else if (type === 'DELETE_BLEND' && payload?.blendId) {
        sandboxBackend.forceDeleteBlend(payload.blendId);
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'QUERY_BLEND_DATA' && payload?.blendId) {
        const expenses = sandboxBackend.getAllExpensesForBlend(payload.blendId);
        const settlements = sandboxBackend.getAllSettlementsForBlend(payload.blendId);
        if (expenses.length > 0 || settlements.length > 0) {
          internalChannel?.postMessage({
            type: 'BLEND_DATA_RESPONSE',
            payload: { blendId: payload.blendId, expenses, settlements },
          });
        }
      } else if (type === 'BLEND_DATA_RESPONSE' && payload?.blendId) {
        let changed = false;
        if (Array.isArray(payload.expenses)) {
          for (const exp of payload.expenses) {
            if (!sandboxBackend.getExpenseById(exp.id)) {
              sandboxBackend.addExpense(exp);
              changed = true;
            }
          }
        }
        if (Array.isArray(payload.settlements)) {
          for (const set of payload.settlements) {
            if (!sandboxBackend.getSettlementById(set.id)) {
              sandboxBackend.addSettlement(set);
              changed = true;
            }
          }
        }
        if (changed) {
          notifySyncListeners({ type: 'RELOAD_DATA', payload: { blendId: payload.blendId } });
        }
      } else if (type === 'USER_PAYMENT_METHOD_SYNC' && payload?.userId && payload?.paymentMethod) {
        const u = sandboxBackend.findUserById(payload.userId);
        if (u) {
          u.paymentMethod = payload.paymentMethod;
          sandboxBackend.addUser(u);
        }
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      } else if (type === 'RELOAD_DATA') {
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel initialization note:', e);
  }
}

// 2. Global Realtime Channel for cross-browser, incognito, and cross-device sync
const GLOBAL_REALTIME_CHANNEL = 'expenso_global_sync';
let realtimeChannel: RealtimeChannel | null = null;

if (isSupabaseConfigured && supabase) {
  try {
    realtimeChannel = supabase.channel(GLOBAL_REALTIME_CHANNEL);
    realtimeChannel
      .on('broadcast', { event: 'USER_SYNC' }, ({ payload }) => {
        if (payload?.user) {
          sandboxBackend.addUser(payload.user);
          notifySyncListeners({ type: 'USER_SYNC', payload });
        }
      })
      .on('broadcast', { event: 'BLEND_SYNC' }, ({ payload }) => {
        if (payload?.blend) {
          sandboxBackend.addBlend(payload.blend, payload.members);
          notifySyncListeners({ type: 'BLEND_SYNC', payload });
        }
      })
      .on('broadcast', { event: 'EXPENSE_SYNC' }, ({ payload }) => {
        if (payload?.expense) {
          sandboxBackend.addExpense(payload.expense);
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'EXPENSE_DELETED' }, ({ payload }) => {
        if (payload?.expenseId) {
          sandboxBackend.deleteExpenseLocally(payload.expenseId);
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'SETTLEMENT_SYNC' }, ({ payload }) => {
        if (payload?.settlement) {
          sandboxBackend.addSettlement(payload.settlement);
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'SETTLEMENT_DELETED' }, ({ payload }) => {
        if (payload?.settlementId) {
          sandboxBackend.deleteSettlementLocally(payload.settlementId);
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'NOTIFICATION_SYNC' }, ({ payload }) => {
        if (payload?.notification) {
          sandboxBackend.addNotification(payload.notification);
          notifySyncListeners({ type: 'NOTIFICATION_SYNC', payload });
        }
      })
      .on('broadcast', { event: 'DELETE_BLEND' }, ({ payload }) => {
        if (payload?.blendId) {
          sandboxBackend.forceDeleteBlend(payload.blendId);
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'USER_PAYMENT_METHOD_SYNC' }, ({ payload }) => {
        if (payload?.userId && payload?.paymentMethod) {
          const u = sandboxBackend.findUserById(payload.userId);
          if (u) {
            u.paymentMethod = payload.paymentMethod;
            sandboxBackend.addUser(u);
          }
          notifySyncListeners({ type: 'RELOAD_DATA', payload });
        }
      })
      .on('broadcast', { event: 'RELOAD_DATA' }, ({ payload }) => {
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      })
      .on('broadcast', { event: 'QUERY_INVITE_CODE' }, ({ payload }) => {
        if (payload?.code) {
          const user = sandboxBackend.findUserByInviteCode(payload.code);
          const blend = sandboxBackend.findBlendByCode(payload.code);
          const validBlend = blend && !sandboxBackend.isBlendDeleted(blend.id) ? blend : undefined;
          if (user || validBlend) {
            realtimeChannel?.send({
              type: 'broadcast',
              event: 'CODE_RESPONSE',
              payload: { code: payload.code, user, blend: validBlend },
            });
          }
        }
      })
      .on('broadcast', { event: 'QUERY_BLEND_DATA' }, ({ payload }) => {
        if (payload?.blendId) {
          const expenses = sandboxBackend.getAllExpensesForBlend(payload.blendId);
          const settlements = sandboxBackend.getAllSettlementsForBlend(payload.blendId);
          if (expenses.length > 0 || settlements.length > 0) {
            realtimeChannel?.send({
              type: 'broadcast',
              event: 'BLEND_DATA_RESPONSE',
              payload: { blendId: payload.blendId, expenses, settlements },
            });
          }
        }
      })
      .on('broadcast', { event: 'BLEND_DATA_RESPONSE' }, ({ payload }) => {
        if (payload?.blendId) {
          let changed = false;
          if (Array.isArray(payload.expenses)) {
            for (const exp of payload.expenses) {
              if (!sandboxBackend.getExpenseById(exp.id)) {
                sandboxBackend.addExpense(exp);
                changed = true;
              }
            }
          }
          if (Array.isArray(payload.settlements)) {
            for (const set of payload.settlements) {
              if (!sandboxBackend.getSettlementById(set.id)) {
                sandboxBackend.addSettlement(set);
                changed = true;
              }
            }
          }
          if (changed) {
            notifySyncListeners({ type: 'RELOAD_DATA', payload: { blendId: payload.blendId } });
          }
        }
      })
      .subscribe();
  } catch (e) {
    console.warn('Realtime channel initialization note:', e);
  }
}

// Helper to ask active peers if they own a specific code
async function queryPeerCode(code: string): Promise<{ user?: UserProfile; blend?: Blend } | null> {
  if (!realtimeChannel) return null;
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1500);

    const onResponse = ({ payload }: { payload?: { code: string; user?: UserProfile; blend?: Blend } }) => {
      if (payload?.code === code && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ user: payload.user, blend: payload.blend });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (realtimeChannel as any)?.on('broadcast', { event: 'CODE_RESPONSE' }, onResponse);

    realtimeChannel?.send({
      type: 'broadcast',
      event: 'QUERY_INVITE_CODE',
      payload: { code },
    }).catch(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });
  });
}

// Helper to broadcast query to peers for all blend data
async function queryPeerBlendData(blendId: string): Promise<void> {
  if (internalChannel) {
    try {
      internalChannel.postMessage({
        type: 'QUERY_BLEND_DATA',
        payload: { blendId },
      });
    } catch {}
  }
  if (realtimeChannel) {
    try {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'QUERY_BLEND_DATA',
        payload: { blendId },
      });
    } catch {}
  }
}

export const backendService = {
  isCloudConfigured(): boolean {
    return isSupabaseConfigured;
  },

  onSync(listener: SyncListener): void {
    onSync(listener);
  },

  offSync(listener: SyncListener): void {
    offSync(listener);
  },

  async hasCloudAuthSession(): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return Boolean(session?.user);
    } catch {
      return false;
    }
  },

  // Auth & Profile
  async getCurrentUser(): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (data && !error) {
            return {
              id: data.id,
              email: data.email,
              fullName: data.full_name,
              initials: data.initials,
              avatarColor: data.avatar_color,
              inviteCode: data.invite_code,
              phone: data.phone,
              createdAt: data.created_at,
            };
          }
        }
      } catch (e) {
        console.warn('Supabase auth check error, falling back to sandbox:', e);
      }
    }
    return sandboxBackend.getCurrentUser();
  },

  getAllDemoUsers(): UserProfile[] {
    return sandboxBackend.getAllDemoUsers();
  },

  switchDemoUser(userId: string): UserProfile {
    return sandboxBackend.switchActiveUser(userId);
  },

  async loginUser(email: string, password?: string): Promise<UserProfile> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      throw new Error('Please enter your email address.');
    }

    const passwordHash = password ? await hashPassword(password) : undefined;

    // 1. Check local sandbox first
    try {
      const localUser = sandboxBackend.loginUser(trimmedEmail, passwordHash);
      return localUser;
    } catch (err: unknown) {
      // If password was incorrect, rethrow immediately!
      if (err instanceof Error && err.message.includes('Incorrect password')) {
        throw err;
      }
      // If user not found locally, proceed to cloud check
    }

    // 2. Check Supabase profiles by email
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', trimmedEmail)
          .maybeSingle();

        if (!error && data) {
          // If stored hash exists and input hash doesn't match, reject!
          if (data.password_hash && passwordHash && data.password_hash !== passwordHash) {
            throw new Error('Incorrect password. Please try again.');
          }

          const cloudUser: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            initials: data.initials,
            avatarColor: data.avatar_color,
            inviteCode: data.invite_code,
            phone: data.phone,
            passwordHash: data.password_hash || passwordHash,
            createdAt: data.created_at,
          };
          sandboxBackend.addUser(cloudUser);
          sandboxBackend.switchActiveUser(cloudUser.id);
          return cloudUser;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('Incorrect password')) {
          throw err;
        }
        console.warn('Supabase loginUser lookup note:', err);
      }
    }

    throw new Error('No account found with this email. Please check your email or create a new account.');
  },

  async registerUser(fullName: string, email: string, password?: string): Promise<UserProfile> {
    const passwordHash = password ? await hashPassword(password) : undefined;

    // 1. Create the user in reliable local sandbox backend immediately
    const localUser = sandboxBackend.registerUser(fullName, email, passwordHash);

    // 2. Broadcast immediately to other tabs in this browser
    if (internalChannel) {
      try {
        internalChannel.postMessage({
          type: 'USER_SYNC',
          payload: { user: localUser },
        });
      } catch {}
    }

    // 3. Broadcast to Supabase Realtime channel across devices/incognito
    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'USER_SYNC',
          payload: { user: localUser },
        });
      } catch {}
    }

    // 4. Background cloud sync to Supabase PostgreSQL profiles & starter blend
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      try {
        const profilePayload: Record<string, unknown> = {
          id: localUser.id,
          email: localUser.email,
          full_name: localUser.fullName,
          initials: localUser.initials,
          avatar_color: localUser.avatarColor,
          invite_code: localUser.inviteCode,
          phone: localUser.phone || null,
        };
        if (passwordHash) {
          profilePayload.password_hash = passwordHash;
        }

        client
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
          .then(async ({ error }) => {
            // If column password_hash doesn't exist yet in Supabase, retry without it
            if (error && (error.code === '42703' || error.message?.includes('password_hash'))) {
              delete profilePayload.password_hash;
              await client.from('profiles').upsert(profilePayload, { onConflict: 'id' }).then(undefined, () => {});
            } else if (error) {
              console.warn('Supabase profile direct upsert note:', error.message);
              return;
            }
            // Also sync the starter blend so the user's blend code is immediately discoverable
            const starterBlends = sandboxBackend.getUserBlends(localUser.id);
            for (const b of starterBlends) {
              if (b.blendCode) {
                await client
                  .from('blends')
                  .upsert({
                    id: b.id,
                    name: b.name,
                    blend_code: b.blendCode,
                    created_by: localUser.id,
                  }, { onConflict: 'id' })
                  .then(undefined, () => {});

                await client
                  .from('blend_members')
                  .upsert({
                    blend_id: b.id,
                    user_id: localUser.id,
                    role: 'admin',
                  }, { onConflict: 'blend_id,user_id' })
                  .then(undefined, () => {});
              }
            }
          })
          .then(undefined, () => {});
      } catch (e) {
        console.warn('Cloud sync error during registration:', e);
      }
    }

    return localUser;
  },

  async findUserByInviteCode(code: string): Promise<UserProfile | null> {
    const cleanCode = normalizeInviteCode(code);
    if (!cleanCode) return null;

    // 1. Check local sandbox first (instant and reliable for demo & registered users in session)
    const localUser = sandboxBackend.findUserByInviteCode(cleanCode);
    if (localUser) {
      return localUser;
    }

    // 2. Check Supabase cloud profiles if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .ilike('invite_code', cleanCode)
          .maybeSingle();

        // 2-second timeout to prevent any hanging network requests
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Lookup timeout') }), 2000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (!error && data) {
          const cloudUser: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            initials: data.initials,
            avatarColor: data.avatar_color,
            inviteCode: data.invite_code,
            phone: data.phone,
            createdAt: data.created_at,
          };
          // CRITICAL: Cache this discovered friend into sandboxBackend!
          sandboxBackend.addUser(cloudUser);
          return cloudUser;
        }
      } catch (err) {
        console.warn('Supabase findUserByInviteCode lookup fallback:', err);
      }
    }

    // 3. Ask active peer sessions via Supabase Realtime broadcast
    if (realtimeChannel) {
      try {
        const peerResult = await queryPeerCode(cleanCode);
        if (peerResult?.user) {
          sandboxBackend.addUser(peerResult.user);
          return peerResult.user;
        }
      } catch {
        // Peer lookup optional
      }
    }

    return null;
  },

  async findBlendByCode(code: string): Promise<Blend | null> {
    const cleanCode = normalizeInviteCode(code);
    if (!cleanCode) return null;

    // 1. Check local sandbox
    const localBlend = sandboxBackend.findBlendByCode(cleanCode);
    if (localBlend) return localBlend;

    // 2. Check Supabase cloud blends
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('blends')
          .select('*, blend_members(*, profile:profiles(*))')
          .ilike('blend_code', cleanCode)
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Lookup timeout') }), 2000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (!error && data) {
          if (sandboxBackend.isBlendDeleted(data.id)) {
            return null;
          }
          const membersList: { blendId: string; userId: string; role: 'admin' | 'member'; joinedAt: string }[] = [];
          if (Array.isArray(data.blend_members)) {
            for (const bm of data.blend_members) {
              membersList.push({
                blendId: data.id,
                userId: bm.user_id,
                role: bm.role || 'member',
                joinedAt: bm.joined_at || new Date().toISOString(),
              });
              if (bm.profile) {
                sandboxBackend.addUser({
                  id: bm.profile.id,
                  email: bm.profile.email,
                  fullName: bm.profile.full_name,
                  initials: bm.profile.initials,
                  avatarColor: bm.profile.avatar_color,
                  inviteCode: bm.profile.invite_code,
                  phone: bm.profile.phone,
                  createdAt: bm.profile.created_at,
                });
              }
            }
          }

          const rawData = data as Record<string, unknown>;
          const cloudBlend: Blend = {
            id: data.id,
            name: data.name,
            createdBy: data.created_by,
            createdAt: data.created_at,
            blendCode: data.blend_code || cleanCode,
            memberCount: membersList.length || data.blend_members?.length || 1,
            icon: (typeof rawData.icon === 'string' ? rawData.icon : undefined) || (localBlend as Blend | null)?.icon,
          };
          sandboxBackend.addBlend(cloudBlend, membersList.length > 0 ? membersList : undefined);
          return cloudBlend;
        }
      } catch (err) {
        console.warn('Supabase findBlendByCode lookup error:', err);
      }
    }

    // 3. Ask peers
    if (realtimeChannel) {
      try {
        const peerResult = await queryPeerCode(cleanCode);
        if (peerResult?.blend) {
          if (sandboxBackend.isBlendDeleted(peerResult.blend.id)) {
            return null;
          }
          sandboxBackend.addBlend(peerResult.blend);
          return peerResult.blend;
        }
      } catch {}
    }

    return null;
  },

  async findCodeTarget(code: string): Promise<{
    type: 'user' | 'blend';
    user?: UserProfile;
    blend?: Blend;
  } | null> {
    const cleanCode = normalizeInviteCode(code);
    if (!cleanCode || cleanCode.length !== 6) return null;

    // Check user first
    const user = await this.findUserByInviteCode(cleanCode);
    if (user) return { type: 'user', user };

    // Check blend next
    const blend = await this.findBlendByCode(cleanCode);
    if (blend) return { type: 'blend', blend };

    return null;
  },

  async findUserById(userId: string): Promise<UserProfile | null> {
    const local = sandboxBackend.findUserById(userId);
    if (local && local.paymentMethod) return local;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          let paymentMethod = local?.paymentMethod;
          try {
            const { data: pm } = await supabase
              .from('payment_methods')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            if (pm) {
              paymentMethod = {
                userId: pm.user_id,
                payeeName: pm.payee_name,
                upiId: pm.upi_id,
                qrPayload: pm.qr_payload || undefined,
                qrFormatVerified: pm.qr_format_verified,
                currency: pm.currency || 'INR',
                createdAt: pm.created_at,
                updatedAt: pm.updated_at,
              };
            }
          } catch {}

          const u: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            initials: data.initials,
            avatarColor: data.avatar_color,
            inviteCode: data.invite_code,
            phone: data.phone,
            paymentMethod,
            createdAt: data.created_at,
          };
          sandboxBackend.addUser(u);
          return u;
        }
      } catch {}
    }
    return local || null;
  },

  async findBlendById(blendId: string): Promise<Blend | null> {
    const local = sandboxBackend.findBlendById(blendId);
    if (local) return local;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('blends')
          .select('*')
          .eq('id', blendId)
          .maybeSingle();
        if (!error && data) {
          const raw = data as Record<string, unknown>;
          const b: Blend = {
            id: data.id,
            name: data.name,
            createdBy: data.created_by,
            createdAt: data.created_at,
            blendCode: data.blend_code,
            icon: typeof raw.icon === 'string' ? raw.icon : undefined,
          };
          sandboxBackend.addBlend(b);
          return b;
        }
      } catch {}
    }
    return null;
  },

  // Blends
  async getUserBlends(userId?: string): Promise<Blend[]> {
    const currentUserId = userId || sandboxBackend.getActiveUserId();
    const localBlends = sandboxBackend.getUserBlends(currentUserId);
    const blendsMap = new Map<string, Blend>();
    for (const b of localBlends) {
      blendsMap.set(b.id, b);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: memberRows, error: mErr } = await supabase
          .from('blend_members')
          .select('blend_id')
          .eq('user_id', currentUserId);

        if (!mErr && memberRows && memberRows.length > 0) {
          const blendIds = memberRows.map(r => r.blend_id);
          const { data: blendsData, error: bErr } = await supabase
            .from('blends')
            .select('*, blend_members(count)')
            .in('id', blendIds)
            .order('created_at', { ascending: false });

          if (!bErr && blendsData && blendsData.length > 0) {
            for (const b of blendsData) {
              const local = localBlends.find(l => l.id === b.id);
              const rawB = b as Record<string, unknown>;
              const cb: Blend = {
                id: b.id,
                name: b.name,
                createdBy: b.created_by,
                createdAt: b.created_at,
                memberCount: b.blend_members?.[0]?.count || 1,
                blendCode: b.blend_code,
                icon: (typeof rawB.icon === 'string' ? rawB.icon : undefined) || local?.icon,
              };
              sandboxBackend.addBlend(cb, [{
                blendId: cb.id,
                userId: currentUserId,
                role: cb.createdBy === currentUserId ? 'admin' : 'member',
                joinedAt: cb.createdAt,
              }]);
              blendsMap.set(cb.id, cb);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase getUserBlends note:', err);
      }
    }
    return Array.from(blendsMap.values());
  },

  async getBlendMembers(blendId: string): Promise<BlendMember[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('blend_members')
          .select('*, profile:profiles(*)')
          .eq('blend_id', blendId);
        if (!error && data && data.length > 0) {
          const memberUserIds = data.map(bm => bm.user_id);
          let pmMap = new Map<string, any>();
          try {
            const { data: pmData } = await supabase
              .from('payment_methods')
              .select('*')
              .in('user_id', memberUserIds);
            if (pmData && pmData.length > 0) {
              pmMap = new Map(pmData.map(p => [p.user_id, p]));
            }
          } catch {}

          const memberList: { blendId: string; userId: string; role: 'admin' | 'member'; joinedAt: string }[] = [];
          for (const bm of data) {
            memberList.push({
              blendId: bm.blend_id,
              userId: bm.user_id,
              role: bm.role || 'member',
              joinedAt: bm.joined_at || new Date().toISOString(),
            });
            const pm = pmMap.get(bm.user_id);
            const paymentMethod: UserPaymentMethod | undefined = pm ? {
              userId: pm.user_id,
              payeeName: pm.payee_name,
              upiId: pm.upi_id,
              qrPayload: pm.qr_payload || undefined,
              qrFormatVerified: pm.qr_format_verified,
              currency: pm.currency || 'INR',
              createdAt: pm.created_at,
              updatedAt: pm.updated_at,
            } : undefined;

            if (bm.profile) {
              sandboxBackend.addUser({
                id: bm.profile.id,
                email: bm.profile.email,
                fullName: bm.profile.full_name,
                initials: bm.profile.initials,
                avatarColor: bm.profile.avatar_color,
                inviteCode: bm.profile.invite_code,
                phone: bm.profile.phone,
                paymentMethod,
                createdAt: bm.profile.created_at,
              });
            }
          }
          sandboxBackend.addBlendMembers(blendId, memberList);

          return data.map(bm => {
            const pm = pmMap.get(bm.user_id);
            const paymentMethod: UserPaymentMethod | undefined = pm ? {
              userId: pm.user_id,
              payeeName: pm.payee_name,
              upiId: pm.upi_id,
              qrPayload: pm.qr_payload || undefined,
              qrFormatVerified: pm.qr_format_verified,
              currency: pm.currency || 'INR',
              createdAt: pm.created_at,
              updatedAt: pm.updated_at,
            } : undefined;

            return {
              id: bm.id,
              blendId: bm.blend_id,
              userId: bm.user_id,
              role: bm.role as 'admin' | 'member',
              joinedAt: bm.joined_at,
              profile: {
                id: bm.profile?.id || bm.user_id,
                email: bm.profile?.email || '',
                fullName: bm.profile?.full_name || 'Member',
                initials: bm.profile?.initials || 'M',
                avatarColor: bm.profile?.avatar_color || 'bg-brand-600 text-white',
                inviteCode: bm.profile?.invite_code || '',
                phone: bm.profile?.phone || undefined,
                paymentMethod,
                createdAt: bm.profile?.created_at || bm.joined_at,
              },
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getBlendMembers fallback note:', err);
      }
    }
    return sandboxBackend.getBlendMembers(blendId);
  },

  async createBlend(name: string, friendInviteCodes?: string[]): Promise<Blend> {
    const cleanFriendCodes = friendInviteCodes
      ? friendInviteCodes.map(c => normalizeInviteCode(c)).filter(Boolean)
      : [];

    // Warm cache for all friend codes
    for (const code of cleanFriendCodes) {
      await this.findUserByInviteCode(code);
    }

    const newBlend = sandboxBackend.createBlend(name, cleanFriendCodes.length > 0 ? cleanFriendCodes : undefined);
    const currentUser = sandboxBackend.getCurrentUser();

    // Await cloud sync to Supabase profiles, blends, and blend_members so it's guaranteed present
    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Ensure creator profile exists in profiles table first to satisfy foreign key constraint!
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.fullName,
          initials: currentUser.initials,
          avatar_color: currentUser.avatarColor,
          invite_code: currentUser.inviteCode,
          phone: currentUser.phone || null,
        }, { onConflict: 'id' });

        // 2. Upsert the blend
        await supabase.from('blends').upsert({
          id: newBlend.id,
          name: newBlend.name,
          blend_code: newBlend.blendCode,
          created_by: newBlend.createdBy,
          created_at: newBlend.createdAt,
        }, { onConflict: 'id' });

        // 3. Add creator as admin
        await supabase.from('blend_members').upsert({
          blend_id: newBlend.id,
          user_id: newBlend.createdBy,
          role: 'admin',
        }, { onConflict: 'blend_id,user_id' });

        // 4. For each friend code, add friend to members in cloud and send notification
        for (const code of cleanFriendCodes) {
          const friend = await this.findUserByInviteCode(code);
          if (friend && friend.id !== newBlend.createdBy) {
            await supabase.from('profiles').upsert({
              id: friend.id,
              email: friend.email,
              full_name: friend.fullName,
              initials: friend.initials,
              avatar_color: friend.avatarColor,
              invite_code: friend.inviteCode,
              phone: friend.phone || null,
            }, { onConflict: 'id' });

            await supabase.from('blend_members').upsert({
              blend_id: newBlend.id,
              user_id: friend.id,
              role: 'member',
            }, { onConflict: 'blend_id,user_id' });

            // Sync friend's in-app notification to Supabase
            const friendNotifs = sandboxBackend.getNotifications(friend.id);
            const friendNotif = friendNotifs.find(n => n.blendId === newBlend.id && n.type === 'blend_invite');

            if (supabase && friendNotif) {
              try {
                await supabase.from('in_app_notifications').upsert({
                  id: friendNotif.id,
                  user_id: friendNotif.userId,
                  blend_id: friendNotif.blendId,
                  type: friendNotif.type,
                  title: friendNotif.title,
                  message: friendNotif.message,
                  actor_id: friendNotif.actorId,
                  is_read: friendNotif.isRead,
                  is_handled: friendNotif.isHandled,
                  created_at: friendNotif.createdAt,
                }, { onConflict: 'id' });
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('Supabase createBlend error:', err);
      }
    }

    // Gather full members list and profiles for rich instant sync across tabs and devices
    const blendMembers = sandboxBackend.getBlendMembers(newBlend.id);
    const memberList = blendMembers.map(m => ({
      blendId: m.blendId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
    const profileList = blendMembers.map(m => m.profile);
    const syncPayload = { blend: newBlend, members: memberList, profiles: profileList };

    // Broadcast new blend to other tabs and network
    if (internalChannel) {
      try {
        internalChannel.postMessage({
          type: 'BLEND_SYNC',
          payload: syncPayload,
        });
        internalChannel.postMessage({
          type: 'RELOAD_DATA',
          payload: { blendId: newBlend.id },
        });
      } catch {}
    }

    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'BLEND_SYNC',
          payload: syncPayload,
        });
        realtimeChannel.send({
          type: 'broadcast',
          event: 'RELOAD_DATA',
          payload: { blendId: newBlend.id },
        });
      } catch {}
    }

    return newBlend;
  },

  async joinBlendWithFriendCode(code: string, blendId?: string): Promise<{ blend: Blend; friend?: UserProfile }> {
    const cleanCode = normalizeInviteCode(code);

    // 1. Discover target code (friend or blend) across sandbox, cloud, and peers
    const target = await this.findCodeTarget(cleanCode);
    if (!target) {
      throw new Error(`No user or Blend found with code "${cleanCode}". Check and try again.`);
    }

    // 2. Perform join in local sandbox
    const result = sandboxBackend.joinBlendWithFriendCode(cleanCode, blendId);
    const currentUser = sandboxBackend.getCurrentUser();

    // 3. Resolve blend owner for notifications & cloud persistence
    const blendOwnerId = result.blend.createdBy;
    const blendOwner = (blendOwnerId !== currentUser.id ? await this.findUserById(blendOwnerId) : null) || result.friend || null;
    const now = new Date().toISOString();
    const ownerName = blendOwner?.fullName || 'friend';

    // 4. Create in-app notifications:
    // (A) For the joiner: "You joined [Owner]'s blend"
    const joinerNotif: InAppNotification = {
      id: generateUUID(),
      userId: currentUser.id,
      blendId: result.blend.id,
      type: 'blend_invite' as NotificationType,
      title: 'Joined a Blend',
      message: `You joined ${ownerName}'s blend "${result.blend.name}".`,
      actorId: blendOwner?.id || currentUser.id,
      isRead: false,
      isHandled: true,
      createdAt: now,
    };
    sandboxBackend.addNotification(joinerNotif);

    // (B) For the blend owner: "[Joiner] joined your blend"
    let ownerNotif: InAppNotification | null = null;
    if (blendOwner && blendOwner.id !== currentUser.id) {
      ownerNotif = {
        id: generateUUID(),
        userId: blendOwner.id,
        blendId: result.blend.id,
        type: 'blend_invite' as NotificationType,
        title: 'New Member Joined',
        message: `${currentUser.fullName} joined your blend "${result.blend.name}".`,
        actorId: currentUser.id,
        isRead: false,
        isHandled: false,
        createdAt: now,
      };
      sandboxBackend.addNotification(ownerNotif);
    }

    // 5. Persist profiles, blend, membership, and notifications to Supabase cloud
    if (isSupabaseConfigured && supabase) {
      try {
        // Ensure joiner profile is in cloud
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.fullName,
          initials: currentUser.initials,
          avatar_color: currentUser.avatarColor,
          invite_code: currentUser.inviteCode,
          phone: currentUser.phone || null,
        }, { onConflict: 'id' });

        // Ensure owner profile is in cloud
        if (blendOwner) {
          await supabase.from('profiles').upsert({
            id: blendOwner.id,
            email: blendOwner.email,
            full_name: blendOwner.fullName,
            initials: blendOwner.initials,
            avatar_color: blendOwner.avatarColor,
            invite_code: blendOwner.inviteCode,
            phone: blendOwner.phone || null,
          }, { onConflict: 'id' });
        }

        // Upsert blend
        await supabase.from('blends').upsert({
          id: result.blend.id,
          name: result.blend.name,
          blend_code: result.blend.blendCode,
          created_by: result.blend.createdBy,
          created_at: result.blend.createdAt,
        }, { onConflict: 'id' });

        // Upsert joiner as member
        await supabase.from('blend_members').upsert({
          blend_id: result.blend.id,
          user_id: currentUser.id,
          role: 'member',
        }, { onConflict: 'blend_id,user_id' });

        // Upsert owner as admin
        if (blendOwner) {
          await supabase.from('blend_members').upsert({
            blend_id: result.blend.id,
            user_id: blendOwner.id,
            role: 'admin',
          }, { onConflict: 'blend_id,user_id' });
        }

        // Upsert joiner notification to cloud
        await supabase.from('in_app_notifications').upsert({
          id: joinerNotif.id,
          user_id: joinerNotif.userId,
          blend_id: joinerNotif.blendId,
          type: joinerNotif.type,
          title: joinerNotif.title,
          message: joinerNotif.message,
          actor_id: joinerNotif.actorId,
          is_read: false,
          is_handled: true,
          created_at: joinerNotif.createdAt,
        }, { onConflict: 'id' });

        // Upsert owner notification to cloud
        if (ownerNotif) {
          await supabase.from('in_app_notifications').upsert({
            id: ownerNotif.id,
            user_id: ownerNotif.userId,
            blend_id: ownerNotif.blendId,
            type: ownerNotif.type,
            title: ownerNotif.title,
            message: ownerNotif.message,
            actor_id: ownerNotif.actorId,
            is_read: false,
            is_handled: false,
            created_at: ownerNotif.createdAt,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Supabase join sync note:', err);
      }
    }

    // 6. Gather all current members & profiles for rich cross-device and cross-tab sync
    const blendMembers = sandboxBackend.getBlendMembers(result.blend.id);
    const memberList = blendMembers.map(m => ({
      blendId: m.blendId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
    const profileList = blendMembers.map(m => m.profile);
    const syncPayload = { blend: result.blend, members: memberList, profiles: profileList };

    // 7. Broadcast across tabs and network
    if (internalChannel) {
      try {
        internalChannel.postMessage({
          type: 'BLEND_SYNC',
          payload: syncPayload,
        });
        internalChannel.postMessage({
          type: 'NOTIFICATION_SYNC',
          payload: { notification: joinerNotif },
        });
        if (ownerNotif) {
          internalChannel.postMessage({
            type: 'NOTIFICATION_SYNC',
            payload: { notification: ownerNotif },
          });
        }
        internalChannel.postMessage({
          type: 'RELOAD_DATA',
          payload: { blendId: result.blend.id },
        });
      } catch {}
    }

    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'BLEND_SYNC',
          payload: syncPayload,
        });
        if (ownerNotif) {
          realtimeChannel.send({
            type: 'broadcast',
            event: 'NOTIFICATION_SYNC',
            payload: { notification: ownerNotif },
          });
        }
        realtimeChannel.send({
          type: 'broadcast',
          event: 'RELOAD_DATA',
          payload: { blendId: result.blend.id },
        });
      } catch {}
    }

    // Ingest all existing expenses and settlements for this blend immediately
    try {
      await this.getBlendExpenses(result.blend.id);
      await this.getBlendSettlements(result.blend.id);
    } catch {}

    return result;
  },

  async updateBlendDetails(blendId: string, updates: { name?: string; icon?: string }): Promise<Blend> {
    const updated = sandboxBackend.updateBlendDetails(blendId, updates);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name.trim();
        if (updates.icon !== undefined) payload.icon = updates.icon.trim() || null;

        const { error } = await supabase.from('blends').update(payload).eq('id', blendId);
        if (error && updates.icon !== undefined) {
          if (updates.name !== undefined) {
            await supabase.from('blends').update({ name: updates.name.trim() }).eq('id', blendId);
          }
        }
      } catch (err) {
        console.warn('Supabase updateBlendDetails error:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'BLEND_SYNC', payload: { blend: updated } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'BLEND_SYNC', payload: { blend: updated } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }

    return updated;
  },

  async updateBlendName(blendId: string, name: string): Promise<void> {
    await this.updateBlendDetails(blendId, { name });
  },

  async deleteBlend(blendId: string): Promise<void> {
    sandboxBackend.deleteBlend(blendId);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('in_app_notifications').delete().eq('blend_id', blendId);
        await supabase.from('settlements').delete().eq('blend_id', blendId);
        await supabase.from('expenses').delete().eq('blend_id', blendId);
        await supabase.from('blend_members').delete().eq('blend_id', blendId);
        await supabase.from('blends').delete().eq('id', blendId);
      } catch (err) {
        console.warn('Supabase deleteBlend error:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'DELETE_BLEND', payload: { blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'DELETE_BLEND', payload: { blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
  },

  async removeMemberFromBlend(blendId: string, memberUserId: string): Promise<void> {
    sandboxBackend.removeMemberFromBlend(blendId, memberUserId);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('blend_members')
          .delete()
          .eq('blend_id', blendId)
          .eq('user_id', memberUserId);

        const notifs = sandboxBackend.getNotifications(memberUserId);
        const latestNotif = notifs.find(n => n.blendId === blendId && n.title === 'Removed from Blend');
        if (latestNotif) {
          await supabase.from('in_app_notifications').upsert({
            id: latestNotif.id,
            user_id: latestNotif.userId,
            blend_id: latestNotif.blendId,
            type: latestNotif.type,
            title: latestNotif.title,
            message: latestNotif.message,
            actor_id: latestNotif.actorId,
            is_read: latestNotif.isRead,
            is_handled: latestNotif.isHandled,
            created_at: latestNotif.createdAt,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Supabase removeMemberFromBlend error:', err);
      }
    }

    if (internalChannel) {
      try { internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } }); } catch {}
    }
    if (realtimeChannel) {
      try { realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } }); } catch {}
    }
  },

  async addMemberToBlend(blendId: string, friendInviteCode: string): Promise<BlendMember> {
    const cleanCode = normalizeInviteCode(friendInviteCode);
    await this.findUserByInviteCode(cleanCode);

    const newMember = sandboxBackend.addMemberToBlend(blendId, cleanCode);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: newMember.profile.id,
          email: newMember.profile.email,
          full_name: newMember.profile.fullName,
          initials: newMember.profile.initials,
          avatar_color: newMember.profile.avatarColor,
          invite_code: newMember.profile.inviteCode,
          phone: newMember.profile.phone || null,
        }, { onConflict: 'id' });

        await supabase.from('blend_members').upsert({
          blend_id: blendId,
          user_id: newMember.userId,
          role: 'member',
        }, { onConflict: 'blend_id,user_id' });

        const notifs = sandboxBackend.getNotifications(newMember.userId);
        const latestNotif = notifs.find(n => n.blendId === blendId && n.title === 'Added to a Blend');
        if (latestNotif) {
          await supabase.from('in_app_notifications').upsert({
            id: latestNotif.id,
            user_id: latestNotif.userId,
            blend_id: latestNotif.blendId,
            type: latestNotif.type,
            title: latestNotif.title,
            message: latestNotif.message,
            actor_id: latestNotif.actorId,
            is_read: latestNotif.isRead,
            is_handled: latestNotif.isHandled,
            created_at: latestNotif.createdAt,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Supabase addMemberToBlend error:', err);
      }
    }

    if (internalChannel) {
      try { internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } }); } catch {}
    }
    if (realtimeChannel) {
      try { realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } }); } catch {}
    }

    try {
      await this.getBlendExpenses(blendId);
      await this.getBlendSettlements(blendId);
    } catch {}

    return newMember;
  },

  // Sync an expense and its prerequisites to Supabase cloud
  async syncExpenseToCloud(expense: Expense): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Ensure creator profile exists
      const creator = await this.findUserById(expense.createdBy);
      if (creator) {
        await supabase.from('profiles').upsert({
          id: creator.id,
          email: creator.email,
          full_name: creator.fullName,
          initials: creator.initials,
          avatar_color: creator.avatarColor,
          invite_code: creator.inviteCode,
          phone: creator.phone || null,
        }, { onConflict: 'id' });
      }

      // 2. Ensure blend exists
      const blend = await this.findBlendById(expense.blendId);
      if (blend) {
        await supabase.from('blends').upsert({
          id: blend.id,
          name: blend.name,
          blend_code: blend.blendCode,
          icon: blend.icon || null,
          created_by: blend.createdBy,
          created_at: blend.createdAt,
        }, { onConflict: 'id' });
      }

      // 3. Ensure creator membership exists
      await supabase.from('blend_members').upsert({
        blend_id: expense.blendId,
        user_id: expense.createdBy,
        role: 'admin',
      }, { onConflict: 'blend_id,user_id' });

      // 4. Ensure participants profiles and memberships exist
      for (const pid of expense.participantIds) {
        const pUser = await this.findUserById(pid);
        if (pUser) {
          await supabase.from('profiles').upsert({
            id: pUser.id,
            email: pUser.email,
            full_name: pUser.fullName,
            initials: pUser.initials,
            avatar_color: pUser.avatarColor,
            invite_code: pUser.inviteCode,
            phone: pUser.phone || null,
          }, { onConflict: 'id' });

          await supabase.from('blend_members').upsert({
            blend_id: expense.blendId,
            user_id: pUser.id,
            role: 'member',
          }, { onConflict: 'blend_id,user_id' });
        }
      }

      // 5. Ensure safe non-empty description
      const safeDescription = expense.description?.trim() || `${expense.category.toUpperCase()} Ride`;

      // 6. Upsert expense
      const { error: expErr } = await supabase.from('expenses').upsert({
        id: expense.id,
        blend_id: expense.blendId,
        created_by: expense.createdBy,
        payer_id: expense.payerId,
        amount_paise: expense.amountPaise,
        category: expense.category,
        description: safeDescription,
        date: expense.date,
        notes: expense.notes || null,
        created_at: expense.createdAt,
        updated_at: expense.updatedAt,
      }, { onConflict: 'id' });

      if (!expErr) {
        const splitsPayload = Object.entries(expense.shares).map(([uid, share]) => ({
          expense_id: expense.id,
          user_id: uid,
          share_paise: share,
        }));
        if (splitsPayload.length > 0) {
          await supabase.from('expense_splits').upsert(splitsPayload, { onConflict: 'expense_id,user_id' });
        }
      } else {
        console.warn('Supabase syncExpenseToCloud upsert error:', expErr);
      }
    } catch (err) {
      console.warn('syncExpenseToCloud note:', err);
    }
  },

  // Sync a settlement and its prerequisites to Supabase cloud
  async syncSettlementToCloud(settlement: Settlement): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const fromUser = await this.findUserById(settlement.fromMemberId);
      if (fromUser) {
        await supabase.from('profiles').upsert({
          id: fromUser.id,
          email: fromUser.email,
          full_name: fromUser.fullName,
          initials: fromUser.initials,
          avatar_color: fromUser.avatarColor,
          invite_code: fromUser.inviteCode,
          phone: fromUser.phone || null,
        }, { onConflict: 'id' });
      }

      const toUser = await this.findUserById(settlement.toMemberId);
      if (toUser) {
        await supabase.from('profiles').upsert({
          id: toUser.id,
          email: toUser.email,
          full_name: toUser.fullName,
          initials: toUser.initials,
          avatar_color: toUser.avatarColor,
          invite_code: toUser.inviteCode,
          phone: toUser.phone || null,
        }, { onConflict: 'id' });
      }

      const blend = await this.findBlendById(settlement.blendId);
      if (blend) {
        await supabase.from('blends').upsert({
          id: blend.id,
          name: blend.name,
          blend_code: blend.blendCode,
          icon: blend.icon || null,
          created_by: blend.createdBy,
          created_at: blend.createdAt,
        }, { onConflict: 'id' });
      }

      await supabase.from('settlements').upsert({
        id: settlement.id,
        blend_id: settlement.blendId,
        created_by: settlement.createdBy,
        from_user_id: settlement.fromMemberId,
        to_user_id: settlement.toMemberId,
        amount_paise: settlement.amountPaise,
        date: settlement.date,
        notes: settlement.notes || null,
        status: settlement.status,
        proof_image_url: settlement.proofImageUrl || null,
        decision_notes: settlement.decisionNotes || null,
        confirmed_at: settlement.confirmedAt || null,
        rejected_at: settlement.rejectedAt || null,
        created_at: settlement.createdAt,
        updated_at: settlement.updatedAt,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('syncSettlementToCloud note:', err);
    }
  },

  // Expenses with Payer Enforcement & Bidirectional Auto-Reconciliation
  async getBlendExpenses(blendId: string): Promise<Expense[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, expense_splits(*)')
          .eq('blend_id', blendId)
          .order('date', { ascending: false });

        const cloudExpenseIds = new Set<string>();

        if (!error && data && Array.isArray(data)) {
          for (const exp of data) {
            cloudExpenseIds.add(exp.id);
            const shares: Record<string, number> = {};
            const participantIds: string[] = [];
            for (const s of exp.expense_splits || []) {
              shares[s.user_id] = Number(s.share_paise);
              participantIds.push(s.user_id);
            }
            const mappedExp: Expense = {
              id: exp.id,
              blendId: exp.blend_id,
              createdBy: exp.created_by,
              payerId: exp.payer_id,
              amountPaise: Number(exp.amount_paise),
              category: exp.category as TransportCategory,
              description: exp.description,
              participantIds,
              shares,
              date: exp.date,
              notes: exp.notes || undefined,
              createdAt: exp.created_at,
              updatedAt: exp.updated_at,
            };
            sandboxBackend.addExpense(mappedExp);
          }
        }

        // AUTO-RECONCILIATION: Upload any local expenses for this blend that are missing from cloud
        try {
          const localExpenses = sandboxBackend.getAllExpensesForBlend(blendId);
          for (const localExp of localExpenses) {
            if (!cloudExpenseIds.has(localExp.id)) {
              await this.syncExpenseToCloud(localExp);
            }
          }
        } catch (syncErr) {
          console.warn('Local-to-cloud expense auto-reconcile note:', syncErr);
        }
      } catch (err) {
        console.warn('Supabase getBlendExpenses fallback to sandbox:', err);
      }
    }

    // Query active peers for peer-cached data
    queryPeerBlendData(blendId).catch(() => {});

    return sandboxBackend.getBlendExpenses(blendId);
  },

  async createExpense(
    blendId: string,
    data: {
      amountPaise: number;
      category: TransportCategory;
      description: string;
      participantIds: string[];
      date: string;
      notes?: string;
      forgedPayerId?: string;
    }
  ): Promise<Expense> {
    const expense = sandboxBackend.createExpense(blendId, data);
    await this.syncExpenseToCloud(expense);

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'EXPENSE_SYNC', payload: { expense, blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'EXPENSE_SYNC', payload: { expense, blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }

    return expense;
  },

  async updateExpense(
    expenseId: string,
    data: {
      amountPaise: number;
      category: TransportCategory;
      description: string;
      participantIds: string[];
      date: string;
      notes?: string;
    }
  ): Promise<Expense> {
    const updated = sandboxBackend.updateExpense(expenseId, data);
    await this.syncExpenseToCloud(updated);

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'EXPENSE_SYNC', payload: { expense: updated, blendId: updated.blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: updated.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'EXPENSE_SYNC', payload: { expense: updated, blendId: updated.blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: updated.blendId } });
      } catch {}
    }

    return updated;
  },

  async deleteExpense(expenseId: string): Promise<void> {
    const expense = sandboxBackend.getExpenseById(expenseId);
    const blendId = expense?.blendId;
    sandboxBackend.deleteExpense(expenseId);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
        await supabase.from('expenses').delete().eq('id', expenseId);
      } catch (err) {
        console.warn('Supabase deleteExpense sync note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'EXPENSE_DELETED', payload: { expenseId, blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'EXPENSE_DELETED', payload: { expenseId, blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
  },

  // Settlements with Bidirectional Auto-Reconciliation
  async getBlendSettlements(blendId: string): Promise<Settlement[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('settlements')
          .select('*')
          .eq('blend_id', blendId)
          .order('date', { ascending: false });

        const cloudSettlementIds = new Set<string>();

        if (!error && data && Array.isArray(data)) {
          for (const s of data) {
            cloudSettlementIds.add(s.id);
            const mapped: Settlement = {
              id: s.id,
              blendId: s.blend_id,
              createdBy: s.created_by,
              fromMemberId: s.from_user_id,
              toMemberId: s.to_user_id,
              amountPaise: Number(s.amount_paise),
              date: s.date,
              notes: s.notes || undefined,
              status: (s.status || 'confirmed') as import('../types').SettlementStatus,
              proofImageUrl: s.proof_image_url || undefined,
              confirmedAt: s.confirmed_at || undefined,
              rejectedAt: s.rejected_at || undefined,
              decisionNotes: s.decision_notes || undefined,
              createdAt: s.created_at,
            };
            sandboxBackend.addSettlement(mapped);
          }
        }

        // AUTO-RECONCILIATION: Upload any local settlements for this blend that are missing from cloud
        try {
          const localSettlements = sandboxBackend.getAllSettlementsForBlend(blendId);
          for (const localSet of localSettlements) {
            if (!cloudSettlementIds.has(localSet.id)) {
              await this.syncSettlementToCloud(localSet);
            }
          }
        } catch (syncErr) {
          console.warn('Local-to-cloud settlement auto-reconcile note:', syncErr);
        }
      } catch (err) {
        console.warn('Supabase getBlendSettlements fallback to sandbox:', err);
      }
    }
    return sandboxBackend.getBlendSettlements(blendId);
  },

  async createSettlement(
    blendId: string,
    data: {
      fromMemberId: string;
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
      status?: SettlementStatus;
      proofImageUrl?: string;
    }
  ): Promise<Settlement> {
    if (data.fromMemberId === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }
    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    const s = sandboxBackend.createSettlement(blendId, data);
    await this.syncSettlementToCloud(s);

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s, blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s, blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }

    return s;
  },

  async updateSettlement(
    settlementId: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date: string;
      notes?: string;
    }
  ): Promise<Settlement> {
    const s = sandboxBackend.updateSettlement(settlementId, data);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settlements')
          .update({
            to_user_id: data.toMemberId,
            amount_paise: data.amountPaise,
            date: data.date,
            notes: data.notes?.trim() || null,
          })
          .eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase updateSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }

    return s;
  },

  async deleteSettlement(settlementId: string): Promise<void> {
    const s = sandboxBackend.getSettlementById(settlementId);
    const blendId = s?.blendId;
    sandboxBackend.deleteSettlement(settlementId);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('settlements').delete().eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase deleteSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_DELETED', payload: { settlementId, blendId } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_DELETED', payload: { settlementId, blendId } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
  },

  async initiateSettlement(
    blendId: string,
    data: {
      toMemberId: string;
      amountPaise: number;
      date?: string;
      notes?: string;
    }
  ): Promise<Settlement> {
    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }
    const currentSandboxUser = sandboxBackend.getCurrentUser();
    if (currentSandboxUser && currentSandboxUser.id === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }

    const s = sandboxBackend.initiateSettlement(blendId, data);
    const currentUser = sandboxBackend.getCurrentUser();

    if (isSupabaseConfigured && supabase) {
      try {
        for (const uid of [s.fromMemberId, s.toMemberId]) {
          const u = sandboxBackend.findUserById(uid);
          if (u) {
            await supabase.from('profiles').upsert({
              id: u.id,
              email: u.email,
              full_name: u.fullName,
              initials: u.initials,
              avatar_color: u.avatarColor,
              invite_code: u.inviteCode,
              phone: u.phone || null,
            }, { onConflict: 'id' });
          }
        }

        await supabase.from('settlements').upsert({
          id: s.id,
          blend_id: blendId,
          created_by: currentUser.id,
          from_user_id: s.fromMemberId,
          to_user_id: s.toMemberId,
          amount_paise: s.amountPaise,
          date: s.date || new Date().toISOString(),
          notes: s.notes || null,
          status: 'pending_payment',
          created_at: s.createdAt,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase initiateSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId } });
      } catch {}
    }

    return s;
  },

  async submitSettlementProof(
    settlementId: string,
    proofImageUrl: string,
    notes?: string
  ): Promise<Settlement> {
    const s = sandboxBackend.submitSettlementProof(settlementId, proofImageUrl, notes);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settlements')
          .update({
            proof_image_url: proofImageUrl,
            status: 'proof_submitted',
            notes: notes ? notes.trim() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase submitSettlementProof note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }

    return s;
  },

  async confirmSettlement(
    settlementId: string,
    decisionNotes?: string
  ): Promise<Settlement> {
    const s = sandboxBackend.confirmSettlement(settlementId, decisionNotes);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settlements')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            decision_notes: decisionNotes?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase confirmSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }

    return s;
  },

  async rejectSettlement(
    settlementId: string,
    reason: string
  ): Promise<Settlement> {
    const s = sandboxBackend.rejectSettlement(settlementId, reason);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settlements')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            decision_notes: reason.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase rejectSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }

    return s;
  },

  async cancelSettlement(settlementId: string): Promise<Settlement> {
    const s = sandboxBackend.cancelSettlement(settlementId);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('settlements')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlementId);
      } catch (err) {
        console.warn('Supabase cancelSettlement note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'SETTLEMENT_SYNC', payload: { settlement: s } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: { blendId: s.blendId } });
      } catch {}
    }

    return s;
  },

  async updateUserPaymentMethod(userId: string, paymentMethod: UserPaymentMethod): Promise<void> {
    sandboxBackend.updateUserPaymentMethod(userId, paymentMethod);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payment_methods').upsert({
          user_id: userId,
          payee_name: paymentMethod.payeeName,
          upi_id: paymentMethod.upiId,
          qr_payload: paymentMethod.qrPayload || null,
          qr_format_verified: paymentMethod.qrFormatVerified ?? true,
          currency: paymentMethod.currency || 'INR',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Supabase updateUserPaymentMethod note:', err);
      }
    }

    if (internalChannel) {
      try {
        internalChannel.postMessage({ type: 'USER_PAYMENT_METHOD_SYNC', payload: { userId, paymentMethod } });
        internalChannel.postMessage({ type: 'RELOAD_DATA', payload: {} });
      } catch {}
    }
    if (realtimeChannel) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'USER_PAYMENT_METHOD_SYNC', payload: { userId, paymentMethod } });
        realtimeChannel.send({ type: 'broadcast', event: 'RELOAD_DATA', payload: {} });
      } catch {}
    }
  },

  async getUserPaymentMethod(userId: string): Promise<UserPaymentMethod | undefined> {
    return sandboxBackend.getUserPaymentMethod(userId);
  },

  async getNotifications(userId: string): Promise<InAppNotification[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('in_app_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          for (const n of data) {
            sandboxBackend.addNotification({
              id: n.id,
              userId: n.user_id,
              blendId: n.blend_id || undefined,
              type: n.type as NotificationType,
              title: n.title,
              message: n.message,
              settlementId: n.settlement_id || undefined,
              amountPaise: n.amount_paise ? Number(n.amount_paise) : undefined,
              actorId: n.actor_id || undefined,
              proofImageUrl: n.proof_image_url || undefined,
              isRead: Boolean(n.is_read),
              isHandled: Boolean(n.is_handled),
              createdAt: n.created_at,
            });
          }
        }
      } catch (e) {
        console.warn('Supabase getNotifications note:', e);
      }
    }
    return sandboxBackend.getNotifications(userId);
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    sandboxBackend.markNotificationRead(notificationId);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('in_app_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .then(undefined, () => {});
    }
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    sandboxBackend.markAllNotificationsRead(userId);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('in_app_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .then(undefined, () => {});
    }
  },

  resetDemoData(): void {
    sandboxBackend.resetDemoData();
  },
};
