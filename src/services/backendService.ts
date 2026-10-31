import { isSupabaseConfigured, supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { sandboxBackend } from './sandboxBackend';
import { normalizeInviteCode } from '../utils/inviteCodes';
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
      .on('broadcast', { event: 'RELOAD_DATA' }, ({ payload }) => {
        notifySyncListeners({ type: 'RELOAD_DATA', payload });
      })
      .on('broadcast', { event: 'QUERY_INVITE_CODE' }, ({ payload }) => {
        if (payload?.code) {
          const user = sandboxBackend.findUserByInviteCode(payload.code);
          const blend = sandboxBackend.findBlendByCode(payload.code);
          if (user || blend) {
            realtimeChannel?.send({
              type: 'broadcast',
              event: 'CODE_RESPONSE',
              payload: { code: payload.code, user, blend },
            });
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

  async registerUser(fullName: string, email: string): Promise<UserProfile> {
    // 1. Create the user in reliable local sandbox backend immediately
    const localUser = sandboxBackend.registerUser(fullName, email);

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
        client
          .from('profiles')
          .upsert({
            id: localUser.id,
            email: localUser.email,
            full_name: localUser.fullName,
            initials: localUser.initials,
            avatar_color: localUser.avatarColor,
            invite_code: localUser.inviteCode,
            phone: localUser.phone || null,
          }, { onConflict: 'invite_code' })
          .then(async ({ error }) => {
            if (error) {
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
                  })
                  .then(undefined, () => {});

                await client
                  .from('blend_members')
                  .upsert({
                    blend_id: b.id,
                    user_id: localUser.id,
                    role: 'admin',
                  })
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
          .eq('invite_code', cleanCode)
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
          .eq('blend_code', cleanCode)
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Lookup timeout') }), 2000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (!error && data) {
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

          const cloudBlend: Blend = {
            id: data.id,
            name: data.name,
            createdBy: data.created_by,
            createdAt: data.created_at,
            blendCode: data.blend_code || cleanCode,
            memberCount: membersList.length || data.blend_members?.length || 1,
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

  // Blends
  async getUserBlends(): Promise<Blend[]> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data, error } = await supabase
          .from('blends')
          .select('*, blend_members(count)')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map(b => ({
            id: b.id,
            name: b.name,
            createdBy: b.created_by,
            createdAt: b.created_at,
            memberCount: b.blend_members?.[0]?.count || 1,
            blendCode: b.blend_code,
          }));
        }
      } catch (err) {
        console.warn('Supabase getUserBlends fallback to sandbox:', err);
      }
    }
    return sandboxBackend.getUserBlends();
  },

  async getBlendMembers(blendId: string): Promise<BlendMember[]> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data, error } = await supabase
          .from('blend_members')
          .select('*, profile:profiles(*)')
          .eq('blend_id', blendId);
        if (!error && data && data.length > 0) {
          return data.map(bm => ({
            id: bm.id,
            blendId: bm.blend_id,
            userId: bm.user_id,
            role: bm.role,
            joinedAt: bm.joined_at,
            profile: {
              id: bm.profile.id,
              email: bm.profile.email,
              fullName: bm.profile.full_name,
              initials: bm.profile.initials,
              avatarColor: bm.profile.avatar_color,
              inviteCode: bm.profile.invite_code,
              phone: bm.profile.phone,
              createdAt: bm.profile.created_at,
            },
          }));
        }
      } catch (err) {
        console.warn('Supabase getBlendMembers fallback to sandbox:', err);
      }
    }
    return sandboxBackend.getBlendMembers(blendId);
  },

  async createBlend(name: string, friendInviteCode?: string): Promise<Blend> {
    const cleanFriendCode = friendInviteCode ? normalizeInviteCode(friendInviteCode) : undefined;
    if (cleanFriendCode) {
      // Ensure friend is loaded into cache
      await this.findUserByInviteCode(cleanFriendCode);
    }

    const newBlend = sandboxBackend.createBlend(name, cleanFriendCode);

    // Background cloud sync to Supabase blends and blend_members
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      try {
        client
          .from('blends')
          .upsert({
            id: newBlend.id,
            name: newBlend.name,
            blend_code: newBlend.blendCode,
            created_by: newBlend.createdBy,
            created_at: newBlend.createdAt,
          })
          .then(async ({ error }) => {
            if (error) {
              console.warn('Supabase createBlend sync note:', error.message);
              return;
            }
            // Add creator as admin
            await client
              .from('blend_members')
              .upsert({
                blend_id: newBlend.id,
                user_id: newBlend.createdBy,
                role: 'admin',
              })
              .then(undefined, () => {});

            // If friend code provided, add friend to members in cloud
            if (cleanFriendCode) {
              const friend = await this.findUserByInviteCode(cleanFriendCode);
              if (friend && friend.id !== newBlend.createdBy) {
                await client
                  .from('blend_members')
                  .upsert({
                    blend_id: newBlend.id,
                    user_id: friend.id,
                    role: 'member',
                  })
                  .then(undefined, () => {});
              }
            }
          })
          .then(undefined, () => {});
      } catch (err) {
        console.warn('Supabase createBlend error:', err);
      }
    }

    // Broadcast new blend to other tabs and network
    if (internalChannel) {
      try {
        internalChannel.postMessage({
          type: 'BLEND_SYNC',
          payload: { blend: newBlend },
        });
      } catch {}
    }

    if (realtimeChannel) {
      try {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'BLEND_SYNC',
          payload: { blend: newBlend },
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

    // 3. Persist membership to Supabase cloud
    if (isSupabaseConfigured && supabase) {
      try {
        const currentUser = sandboxBackend.getCurrentUser();
        supabase
          .from('blends')
          .upsert({
            id: result.blend.id,
            name: result.blend.name,
            blend_code: result.blend.blendCode,
            created_by: result.blend.createdBy,
            created_at: result.blend.createdAt,
          })
          .then(undefined, () => {});

        supabase
          .from('blend_members')
          .upsert({
            blend_id: result.blend.id,
            user_id: currentUser.id,
            role: 'member',
          })
          .then(undefined, () => {});
      } catch (err) {
        console.warn('Supabase join sync note:', err);
      }
    }

    // 4. Broadcast to tabs and network so other members automatically see the new member
    if (internalChannel) {
      try {
        internalChannel.postMessage({
          type: 'BLEND_SYNC',
          payload: { blend: result.blend },
        });
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
          payload: { blend: result.blend },
        });
        realtimeChannel.send({
          type: 'broadcast',
          event: 'RELOAD_DATA',
          payload: { blendId: result.blend.id },
        });
      } catch {}
    }

    return result;
  },

  async updateBlendName(blendId: string, name: string): Promise<void> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { error } = await supabase
          .from('blends')
          .update({ name: name.trim() })
          .eq('id', blendId);
        if (!error) return;
      } catch (err) {
        console.warn('Supabase updateBlendName fallback to sandbox:', err);
      }
    }
    sandboxBackend.updateBlendName(blendId, name);
  },

  // Expenses with Payer Enforcement
  async getBlendExpenses(blendId: string): Promise<Expense[]> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, expense_splits(*)')
          .eq('blend_id', blendId)
          .order('date', { ascending: false });
        if (!error && data) {
          return data.map(exp => {
            const shares: Record<string, number> = {};
            const participantIds: string[] = [];
            for (const s of exp.expense_splits || []) {
              shares[s.user_id] = Number(s.share_paise);
              participantIds.push(s.user_id);
            }
            return {
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
              notes: exp.notes,
              createdAt: exp.created_at,
              updatedAt: exp.updated_at,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getBlendExpenses fallback to sandbox:', err);
      }
    }
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // CRITICAL: Payer is strictly assigned to authenticated user
          const payerId = user.id;

          const { data: exp, error } = await supabase
            .from('expenses')
            .insert({
              blend_id: blendId,
              created_by: user.id,
              payer_id: payerId,
              amount_paise: data.amountPaise,
              category: data.category,
              description: data.description.trim(),
              date: data.date,
              notes: data.notes?.trim() || null,
            })
            .select()
            .single();
          if (error || !exp) throw error;

          // Insert splits
          const baseShare = Math.floor(data.amountPaise / data.participantIds.length);
          const remainder = data.amountPaise % data.participantIds.length;
          const sortedIds = [...data.participantIds].sort();

          const splitsPayload = sortedIds.map((pid, idx) => ({
            expense_id: exp.id,
            user_id: pid,
            share_paise: baseShare + (idx < remainder ? 1 : 0),
          }));

          await supabase.from('expense_splits').insert(splitsPayload);

          const shares: Record<string, number> = {};
          splitsPayload.forEach(s => {
            shares[s.user_id] = s.share_paise;
          });

          return {
            id: exp.id,
            blendId: exp.blend_id,
            createdBy: exp.created_by,
            payerId: exp.payer_id,
            amountPaise: Number(exp.amount_paise),
            category: exp.category as TransportCategory,
            description: exp.description,
            participantIds: data.participantIds,
            shares,
            date: exp.date,
            notes: exp.notes,
            createdAt: exp.created_at,
            updatedAt: exp.updated_at,
          };
        }
      } catch (err) {
        console.warn('Supabase addExpense fallback to sandbox:', err);
      }
    }
    return sandboxBackend.createExpense(blendId, data);
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
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data: exp, error } = await supabase
          .from('expenses')
          .update({
            amount_paise: data.amountPaise,
            category: data.category,
            description: data.description.trim(),
            date: data.date,
            notes: data.notes?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', expenseId)
          .select()
          .single();
        if (!error && exp) {
          // Re-insert splits
          await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
          const baseShare = Math.floor(data.amountPaise / data.participantIds.length);
          const remainder = data.amountPaise % data.participantIds.length;
          const sortedIds = [...data.participantIds].sort();

          const splitsPayload = sortedIds.map((pid, idx) => ({
            expense_id: expenseId,
            user_id: pid,
            share_paise: baseShare + (idx < remainder ? 1 : 0),
          }));

          await supabase.from('expense_splits').insert(splitsPayload);

          const shares: Record<string, number> = {};
          splitsPayload.forEach(s => {
            shares[s.user_id] = s.share_paise;
          });

          return {
            id: exp.id,
            blendId: exp.blend_id,
            createdBy: exp.created_by,
            payerId: exp.payer_id,
            amountPaise: Number(exp.amount_paise),
            category: exp.category as TransportCategory,
            description: exp.description,
            participantIds: data.participantIds,
            shares,
            date: exp.date,
            notes: exp.notes,
            createdAt: exp.created_at,
            updatedAt: exp.updated_at,
          };
        }
      } catch (err) {
        console.warn('Supabase updateExpense fallback to sandbox:', err);
      }
    }
    return sandboxBackend.updateExpense(expenseId, data);
  },

  async deleteExpense(expenseId: string): Promise<void> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (!error) return;
      } catch (err) {
        console.warn('Supabase deleteExpense fallback to sandbox:', err);
      }
    }
    sandboxBackend.deleteExpense(expenseId);
  },

  // Settlements
  async getBlendSettlements(blendId: string): Promise<Settlement[]> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data, error } = await supabase
          .from('settlements')
          .select('*')
          .eq('blend_id', blendId)
          .order('date', { ascending: false });
        if (!error && data) {
          return data.map(s => ({
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: (s.status || 'confirmed') as import('../types').SettlementStatus,
            proofImageUrl: s.proof_image_url,
            confirmedAt: s.confirmed_at,
            rejectedAt: s.rejected_at,
            decisionNotes: s.decision_notes,
            createdAt: s.created_at,
          }));
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
    }
  ): Promise<Settlement> {
    if (data.fromMemberId === data.toMemberId) {
      throw new Error('Sender and recipient cannot be the same person.');
    }
    if (data.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.');
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .insert({
              blend_id: blendId,
              created_by: user.id,
              from_user_id: data.fromMemberId,
              to_user_id: data.toMemberId,
              amount_paise: data.amountPaise,
              date: data.date,
              notes: data.notes?.trim() || null,
            })
            .select()
            .single();
          if (error || !s) throw error;

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: (s.status || 'confirmed') as import('../types').SettlementStatus,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase createSettlement fallback to sandbox:', err);
      }
    }
    return sandboxBackend.createSettlement(blendId, data);
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .update({
              to_user_id: data.toMemberId,
              amount_paise: data.amountPaise,
              date: data.date,
              notes: data.notes?.trim() || null,
            })
            .eq('id', settlementId)
            .eq('created_by', user.id)
            .select()
            .single();
          if (error || !s) throw error || new Error('Failed to update settlement');

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: (s.status || 'confirmed') as import('../types').SettlementStatus,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase updateSettlement fallback to sandbox:', err);
      }
    }
    return sandboxBackend.updateSettlement(settlementId, data);
  },

  async deleteSettlement(settlementId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('settlements')
            .delete()
            .eq('id', settlementId)
            .eq('created_by', user.id);
          if (error) throw error;
          return;
        }
      } catch (err) {
        console.warn('Supabase deleteSettlement fallback to sandbox:', err);
      }
    }
    sandboxBackend.deleteSettlement(settlementId);
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
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .insert({
              blend_id: blendId,
              created_by: user.id,
              from_user_id: user.id,
              to_user_id: data.toMemberId,
              amount_paise: data.amountPaise,
              date: data.date || new Date().toISOString(),
              notes: data.notes?.trim() || null,
              status: 'pending_payment',
            })
            .select()
            .single();
          if (error || !s) throw error;

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: s.status,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase initiateSettlement fallback to sandbox:', err);
      }
    }
    return sandboxBackend.initiateSettlement(blendId, data);
  },

  async submitSettlementProof(
    settlementId: string,
    proofImageUrl: string,
    notes?: string
  ): Promise<Settlement> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .update({
              proof_image_url: proofImageUrl,
              status: 'proof_submitted',
              notes: notes ? notes.trim() : undefined,
              updated_at: new Date().toISOString(),
            })
            .eq('id', settlementId)
            .eq('from_user_id', user.id)
            .select()
            .single();
          if (error || !s) throw error;

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: s.status,
            proofImageUrl: s.proof_image_url,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase submitSettlementProof fallback to sandbox:', err);
      }
    }
    return sandboxBackend.submitSettlementProof(settlementId, proofImageUrl, notes);
  },

  async confirmSettlement(
    settlementId: string,
    decisionNotes?: string
  ): Promise<Settlement> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
              decision_notes: decisionNotes?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', settlementId)
            .eq('to_user_id', user.id) // Only recipient
            .select()
            .single();
          if (error || !s) throw error;

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: s.status,
            proofImageUrl: s.proof_image_url,
            confirmedAt: s.confirmed_at,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase confirmSettlement fallback to sandbox:', err);
      }
    }
    return sandboxBackend.confirmSettlement(settlementId, decisionNotes);
  },

  async rejectSettlement(
    settlementId: string,
    reason: string
  ): Promise<Settlement> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s, error } = await supabase
            .from('settlements')
            .update({
              status: 'rejected',
              rejected_at: new Date().toISOString(),
              decision_notes: reason.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', settlementId)
            .eq('to_user_id', user.id) // Only recipient
            .select()
            .single();
          if (error || !s) throw error;

          return {
            id: s.id,
            blendId: s.blend_id,
            createdBy: s.created_by,
            fromMemberId: s.from_user_id,
            toMemberId: s.to_user_id,
            amountPaise: Number(s.amount_paise),
            date: s.date,
            notes: s.notes,
            status: s.status,
            proofImageUrl: s.proof_image_url,
            rejectedAt: s.rejected_at,
            createdAt: s.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase rejectSettlement fallback to sandbox:', err);
      }
    }
    return sandboxBackend.rejectSettlement(settlementId, reason);
  },

  async cancelSettlement(settlementId: string): Promise<Settlement> {
    return sandboxBackend.cancelSettlement(settlementId);
  },

  async updateUserPaymentMethod(userId: string, paymentMethod: UserPaymentMethod): Promise<void> {
    sandboxBackend.updateUserPaymentMethod(userId, paymentMethod);
  },

  async getUserPaymentMethod(userId: string): Promise<UserPaymentMethod | undefined> {
    return sandboxBackend.getUserPaymentMethod(userId);
  },

  async getNotifications(userId: string): Promise<InAppNotification[]> {
    return sandboxBackend.getNotifications(userId);
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    sandboxBackend.markNotificationRead(notificationId);
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    sandboxBackend.markAllNotificationsRead(userId);
  },

  resetDemoData(): void {
    sandboxBackend.resetDemoData();
  },
};
