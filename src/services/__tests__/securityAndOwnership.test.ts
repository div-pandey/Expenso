import { describe, it, expect, beforeEach } from 'vitest';
import { sandboxBackend } from '../sandboxBackend';
import { backendService } from '../backendService';
import { generateInviteCode, isValidInviteCodeFormat } from '../../utils/inviteCodes';
import { calculateMemberBalances } from '../../utils/calculations';
import type { Member } from '../../types';

describe('Security, Payer Ownership & Blend Isolation Engine', () => {
  beforeEach(() => {
    sandboxBackend.resetDemoData();
  });

  describe('Unique Personal Invitation Codes', () => {
    it('generates a 6-character uppercase alphanumeric code', () => {
      const code = generateInviteCode();
      expect(code.length).toBe(6);
      expect(isValidInviteCodeFormat(code)).toBe(true);
    });

    it('generates unique, collision-resistant codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const c = generateInviteCode();
        expect(codes.has(c)).toBe(false);
        codes.add(c);
      }
    });

    it('finds user by their unique personal invite code', () => {
      const user = sandboxBackend.findUserByInviteCode('RAHUL9');
      expect(user).toBeDefined();
      expect(user?.fullName).toBe('Rahul Sharma');
    });

    it('rejects invalid or non-existent invite code', () => {
      const user = sandboxBackend.findUserByInviteCode('INVALID');
      expect(user).toBeNull();
    });

    it('finds newly registered user via backendService.findUserByInviteCode', async () => {
      const newUser = await backendService.registerUser('Priya Patel', 'priya@campus.edu');
      expect(newUser.inviteCode).toBeDefined();
      expect(newUser.inviteCode.length).toBe(6);

      const found = await backendService.findUserByInviteCode(newUser.inviteCode);
      expect(found).not.toBeNull();
      expect(found?.fullName).toBe('Priya Patel');
    });

    it('allows another user to connect with newly registered user code', async () => {
      const newUser = await backendService.registerUser('Vikram Singh', 'vikram@campus.edu');
      
      // Switch active user to Divyansh
      sandboxBackend.switchActiveUser('user_you');

      const result = await backendService.joinBlendWithFriendCode(newUser.inviteCode);
      expect(result.friend?.fullName).toBe('Vikram Singh');
      expect(result.blend).toBeDefined();
      
      // Verify both members are in the blend
      const members = await backendService.getBlendMembers(result.blend.id);
      expect(members.some(m => m.userId === 'user_you')).toBe(true);
      expect(members.some(m => m.userId === newUser.id)).toBe(true);

      // Verify notifications were created for both joiner and owner
      const joinerNotifs = await backendService.getNotifications('user_you');
      expect(joinerNotifs.some(n => n.type === 'blend_invite' && n.message.includes('You joined'))).toBe(true);

      const ownerNotifs = await backendService.getNotifications(newUser.id);
      expect(ownerNotifs.some(n => n.type === 'blend_invite' && n.message.includes('joined your blend'))).toBe(true);
    }, 15000);

    it('registers a user with password and authenticates securely on login', async () => {
      const user = await backendService.registerUser('Kavya Nair', 'kavya@campus.edu', 'SecurePass123!');
      expect(user.passwordHash).toBeDefined();

      // Login with correct password should succeed
      const loggedIn = await backendService.loginUser('kavya@campus.edu', 'SecurePass123!');
      expect(loggedIn.id).toBe(user.id);
      expect(loggedIn.email).toBe('kavya@campus.edu');

      // Login with incorrect password should reject
      await expect(
        backendService.loginUser('kavya@campus.edu', 'WrongPassword!')
      ).rejects.toThrow(/Incorrect password/);
    });

    it('generates a unique 6-character blend code every time a new blend is created', async () => {
      sandboxBackend.switchActiveUser('user_you');
      const blend1 = await backendService.createBlend('Morning Metro Gang');
      expect(blend1.blendCode).toBeDefined();
      expect(blend1.blendCode?.length).toBe(6);
      expect(isValidInviteCodeFormat(blend1.blendCode || '')).toBe(true);

      const blend2 = await backendService.createBlend('Evening Cab Pool');
      expect(blend2.blendCode).toBeDefined();
      expect(blend2.blendCode?.length).toBe(6);
      expect(blend2.blendCode).not.toBe(blend1.blendCode);

      // Verify the new blend can be found by its blend code
      const foundBlend = await backendService.findBlendByCode(blend1.blendCode || '');
      expect(foundBlend).not.toBeNull();
      expect(foundBlend?.id).toBe(blend1.id);
    }, 15000);

    it('does not create any default starter blend on new user registration', async () => {
      const freshUser = await backendService.registerUser('Rohan Verma', 'rohan@campus.edu');
      const blends = sandboxBackend.getUserBlends(freshUser.id);
      expect(blends.length).toBe(0);
    });

    it('creates a blend with multiple friends using their personal invite codes and notifies each', async () => {
      const friendA = await backendService.registerUser('Aditi Rao', 'aditi@campus.edu');
      const friendB = await backendService.registerUser('Bhavin Shah', 'bhavin@campus.edu');

      sandboxBackend.switchActiveUser('user_you');
      const multiBlend = await backendService.createBlend('Triple Threat Commute', [
        friendA.inviteCode,
        friendB.inviteCode,
      ]);

      expect(multiBlend).toBeDefined();
      expect(multiBlend.memberCount).toBe(3);

      const members = await backendService.getBlendMembers(multiBlend.id);
      expect(members.length).toBe(3);
      expect(members.some(m => m.userId === 'user_you')).toBe(true);
      expect(members.some(m => m.userId === friendA.id)).toBe(true);
      expect(members.some(m => m.userId === friendB.id)).toBe(true);

      // Verify in-app notifications delivered to both friends
      const notifsA = await backendService.getNotifications(friendA.id);
      expect(notifsA.some(n => n.type === 'blend_invite' && n.blendId === multiBlend.id)).toBe(true);

      const notifsB = await backendService.getNotifications(friendB.id);
      expect(notifsB.some(n => n.type === 'blend_invite' && n.blendId === multiBlend.id)).toBe(true);
    }, 15000);
  });

  describe('Personal Expense Ownership & Payer Enforcement (Requirement 4)', () => {
    it('automatically assigns authenticated user as the payer and creator', () => {
      // Authenticated as Divyansh (user_you)
      sandboxBackend.switchActiveUser('user_you');
      const currentUser = sandboxBackend.getCurrentUser();
      expect(currentUser.id).toBe('user_you');

      const exp = sandboxBackend.createExpense('blend_college_crew', {
        amountPaise: 50000, // ₹500.00
        category: 'cab',
        description: 'Cab to campus',
        participantIds: ['user_you', 'user_rahul'],
        date: new Date().toISOString(),
      });

      expect(exp.createdBy).toBe('user_you');
      expect(exp.payerId).toBe('user_you');
      expect(exp.payerId).toBe(exp.createdBy);
    });

    it('strictly rejects a forged request attempting to record an expense on behalf of another user', () => {
      // Authenticated as Divyansh (user_you)
      sandboxBackend.switchActiveUser('user_you');

      // Attempt to forge request claiming Rahul (user_rahul) paid
      expect(() => {
        sandboxBackend.createExpense('blend_college_crew', {
          amountPaise: 50000,
          category: 'cab',
          description: 'Forged ride claiming Rahul paid',
          participantIds: ['user_you', 'user_rahul'],
          date: new Date().toISOString(),
          forgedPayerId: 'user_rahul', // Forged payer!
        });
      }).toThrow(/Security Error: You cannot record an expense on behalf of another user/);
    });

    it('strictly prevents a non-creator from editing an expense', () => {
      // Create expense as Rahul (user_rahul)
      sandboxBackend.switchActiveUser('user_rahul');
      const exp = sandboxBackend.createExpense('blend_college_crew', {
        amountPaise: 20000,
        category: 'metro',
        description: 'Morning metro tickets',
        participantIds: ['user_you', 'user_rahul'],
        date: new Date().toISOString(),
      });

      // Switch to Divyansh (user_you)
      sandboxBackend.switchActiveUser('user_you');

      expect(() => {
        sandboxBackend.updateExpense(exp.id, {
          amountPaise: 25000,
          category: 'metro',
          description: 'Hacked description',
          participantIds: ['user_you'],
          date: new Date().toISOString(),
        });
      }).toThrow(/Forbidden: You can only edit expenses that you personally created/);
    });

    it('strictly prevents a non-creator from deleting an expense', () => {
      // Create expense as Rahul (user_rahul)
      sandboxBackend.switchActiveUser('user_rahul');
      const exp = sandboxBackend.createExpense('blend_college_crew', {
        amountPaise: 20000,
        category: 'metro',
        description: 'Morning metro tickets',
        participantIds: ['user_you', 'user_rahul'],
        date: new Date().toISOString(),
      });

      // Switch to Divyansh (user_you)
      sandboxBackend.switchActiveUser('user_you');

      expect(() => {
        sandboxBackend.deleteExpense(exp.id);
      }).toThrow(/Forbidden: You can only delete expenses that you personally created/);
    });
  });

  describe('Flexible Participant Selection & Accurate Balances (Requirement 5)', () => {
    it('splits ₹500 cab paid by X between X and Z, leaving Y unaffected', () => {
      // X = user_you, Z = user_rahul, Y = user_aman
      sandboxBackend.switchActiveUser('user_you');

      const exp = sandboxBackend.createExpense('blend_college_crew', {
        amountPaise: 50000, // ₹500.00
        category: 'cab',
        description: 'Late evening cab home',
        participantIds: ['user_you', 'user_rahul'], // Only X and Z!
        date: new Date().toISOString(),
      });

      // X share: ₹250 (25000 paise), Z share: ₹250 (25000 paise)
      expect(exp.shares['user_you']).toBe(25000);
      expect(exp.shares['user_rahul']).toBe(25000);
      expect(exp.shares['user_aman']).toBeUndefined(); // Y has no share

      // Calculate isolated balances for this single expense
      const members: Member[] = [
        { id: 'user_you', name: 'You', initials: 'YO', avatarColor: '' },
        { id: 'user_rahul', name: 'Rahul', initials: 'RA', avatarColor: '' },
        { id: 'user_aman', name: 'Aman', initials: 'AM', avatarColor: '' },
      ];

      const balances = calculateMemberBalances(members, [exp], []);

      // X paid 500, share 250 -> net +250 (should receive ₹250)
      expect(balances['user_you'].netBalancePaise).toBe(25000);
      // Z paid 0, share 250 -> net -250 (owes ₹250)
      expect(balances['user_rahul'].netBalancePaise).toBe(-25000);
      // Y paid 0, share 0 -> net 0 (unaffected)
      expect(balances['user_aman'].netBalancePaise).toBe(0);

      // Sum of balances must equal exactly 0
      const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
      expect(sum).toBe(0);
    });

    it('rejects adding an expense with participants who are not in the Blend', () => {
      sandboxBackend.switchActiveUser('user_you');

      expect(() => {
        sandboxBackend.createExpense('blend_college_crew', {
          amountPaise: 10000,
          category: 'metro',
          description: 'Invalid ride with outsider',
          participantIds: ['user_you', 'non_member_stranger'],
          date: new Date().toISOString(),
        });
      }).toThrow(/is not a member of this Blend/);
    });
  });

  describe('Blend Group Privacy & Isolation (Requirement 3)', () => {
    it('prevents non-members from viewing or recording expenses in a private Blend', () => {
      // Register a new independent user
      const outsider = sandboxBackend.registerUser('Secret Outsider', 'outsider@other.edu');
      sandboxBackend.switchActiveUser(outsider.id);

      // Outsider attempts to access College Crew
      expect(() => {
        sandboxBackend.getBlendExpenses('blend_college_crew');
      }).toThrow(/Access denied: You are not a member of this Blend/);

      expect(() => {
        sandboxBackend.createExpense('blend_college_crew', {
          amountPaise: 5000,
          category: 'auto',
          description: 'Hacked auto',
          participantIds: [outsider.id],
          date: new Date().toISOString(),
        });
      }).toThrow(/Access denied: You are not a member of this Blend/);
    });
  });
});
