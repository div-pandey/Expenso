import { isSupabaseConfigured, supabase } from './supabase';
import { sandboxBackend } from './sandboxBackend';
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

export const backendService = {
  isCloudConfigured(): boolean {
    return isSupabaseConfigured;
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
    // 1. Create the user in the reliable local sandbox backend immediately
    const localUser = sandboxBackend.registerUser(fullName, email);

    // 2. If Supabase cloud is configured, register in Supabase without throwing if confirmation email is pending
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: 'TemporaryPassword123!',
          options: { data: { full_name: fullName.trim() } }
        });
      } catch (err) {
        console.warn('Supabase auth signup background notice:', err);
      }
    }

    return localUser;
  },

  async findUserByInviteCode(code: string): Promise<UserProfile | null> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return null;

    // 1. Check local sandbox first (instant and reliable for demo & registered users in session)
    const localUser = sandboxBackend.findUserByInviteCode(cleanCode);
    if (localUser) {
      return localUser;
    }

    // 2. Check Supabase cloud profiles if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('invite_code', cleanCode)
          .maybeSingle();
        if (!error && data) {
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
      } catch (err) {
        console.warn('Supabase findUserByInviteCode lookup fallback:', err);
      }
    }

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
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: blend, error } = await supabase
            .from('blends')
            .insert({ name: name.trim(), created_by: user.id })
            .select()
            .single();
          if (error || !blend) throw error;

          // Add creator to blend_members
          await supabase.from('blend_members').insert({
            blend_id: blend.id,
            user_id: user.id,
            role: 'admin',
          });

          // If friend code provided, add friend
          if (friendInviteCode) {
            const friend = await this.findUserByInviteCode(friendInviteCode);
            if (friend && friend.id !== user.id) {
              await supabase.from('blend_members').insert({
                blend_id: blend.id,
                user_id: friend.id,
                role: 'member',
              });
            }
          }

          return {
            id: blend.id,
            name: blend.name,
            createdBy: blend.created_by,
            createdAt: blend.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase createBlend fallback to sandbox:', err);
      }
    }
    return sandboxBackend.createBlend(name, friendInviteCode);
  },

  async joinBlendWithFriendCode(friendInviteCode: string, blendId?: string): Promise<{ blend: Blend; friend: UserProfile }> {
    if (isSupabaseConfigured && supabase && (await this.hasCloudAuthSession())) {
      try {
        const friend = await this.findUserByInviteCode(friendInviteCode);
        if (friend) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (!blendId) {
              // Find existing blend or create shared one
              const { data: blends } = await supabase
                .from('blend_members')
                .select('blend:blends(*)')
                .eq('user_id', friend.id);
              const firstBlend = blends?.[0]?.blend as unknown as { id: string } | undefined;
              if (firstBlend && firstBlend.id) {
                blendId = firstBlend.id;
              } else {
                const created = await this.createBlend(`${friend.fullName} & Friend Blend`);
                blendId = created.id;
              }
            }

            await supabase.from('blend_members').upsert({
              blend_id: blendId,
              user_id: user.id,
              role: 'member',
            });

            const { data: b } = await supabase.from('blends').select('*').eq('id', blendId).single();
            if (b) {
              return {
                blend: {
                  id: b.id,
                  name: b.name,
                  createdBy: b.created_by,
                  createdAt: b.created_at,
                },
                friend,
              };
            }
          }
        }
      } catch (err) {
        console.warn('Supabase joinBlend fallback to sandbox:', err);
      }
    }
    return sandboxBackend.joinBlendWithFriendCode(friendInviteCode, blendId);
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
