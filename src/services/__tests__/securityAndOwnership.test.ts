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
    }, 30000);

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
    }, 30000);

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
    }, 30000);
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

    it('reflects expenses added by one member to all other members in the Blend', async () => {
      const satyam = await backendService.registerUser('Satyam Sharma', 'satyam@campus.edu');
      sandboxBackend.switchActiveUser('user_you');

      const blend = await backendService.createBlend('Commute Pals', [satyam.inviteCode]);
      expect(blend).toBeDefined();

      // Div adds ₹1,000 metro expense split between Div and Satyam
      const exp = await backendService.createExpense(blend.id, {
        amountPaise: 100000,
        category: 'metro',
        description: 'Morning Metro Split',
        participantIds: ['user_you', satyam.id],
        date: new Date().toISOString(),
      });
      expect(exp.payerId).toBe('user_you');
      expect(exp.shares['user_you']).toBe(50000);
      expect(exp.shares[satyam.id]).toBe(50000);

      // Switch to Satyam
      sandboxBackend.switchActiveUser(satyam.id);

      // Satyam fetches blend expenses
      const satyamViewExpenses = await backendService.getBlendExpenses(blend.id);
      expect(satyamViewExpenses.length).toBeGreaterThanOrEqual(1);
      const foundExp = satyamViewExpenses.find(e => e.id === exp.id);
      expect(foundExp).toBeDefined();
      expect(foundExp?.amountPaise).toBe(100000);
      expect(foundExp?.payerId).toBe('user_you');

      // Verify Satyam's net balance reflects owing ₹500
      const blendMembers = await backendService.getBlendMembers(blend.id);
      const membersForCalc = blendMembers.map(bm => ({
        id: bm.userId,
        name: bm.profile.fullName,
        initials: bm.profile.initials,
        avatarColor: bm.profile.avatarColor,
      }));
      const balances = calculateMemberBalances(membersForCalc, satyamViewExpenses, []);
      expect(balances[satyam.id].netBalancePaise).toBe(-50000); // Satyam owes ₹500
      expect(balances['user_you'].netBalancePaise).toBe(50000); // Div is owed ₹500
    }, 30000);
  });

  describe('Blend Admin Privileges, Membership Management & Custom PFP', () => {
    it('designates the creator as admin and allows updating name and custom PFP', async () => {
      sandboxBackend.switchActiveUser('user_you');
      const testBlend = await backendService.createBlend('Admin Control Blend');
      expect(testBlend.createdBy).toBe('user_you');

      const members = await backendService.getBlendMembers(testBlend.id);
      const creatorMember = members.find(m => m.userId === 'user_you');
      expect(creatorMember?.role).toBe('admin');

      // Admin updates name and custom icon/pfp
      const updated = await backendService.updateBlendDetails(testBlend.id, {
        name: 'VIP Metro Club',
        icon: '🚇',
      });
      expect(updated.name).toBe('VIP Metro Club');
      expect(updated.icon).toBe('🚇');

      // Admin updates with custom gallery photo data URL
      const mockGalleryPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/sampleDataUrl';
      const photoUpdated = await backendService.updateBlendDetails(testBlend.id, {
        icon: mockGalleryPhoto,
      });
      expect(photoUpdated.icon).toBe(mockGalleryPhoto);

      // Verify getUserBlends retains the uploaded photo pfp
      const userBlends = await backendService.getUserBlends('user_you');
      const retrieved = userBlends.find(b => b.id === testBlend.id);
      expect(retrieved?.icon).toBe(mockGalleryPhoto);
    }, 30000);

    it('allows Admin to add new member by personal invite code and notifies the friend', async () => {
      const friend = await backendService.registerUser('Deepak Joshi', 'deepak@campus.edu');
      sandboxBackend.switchActiveUser('user_you');
      const blend = await backendService.createBlend('Campus Carpool');

      // Admin adds friend
      const newMember = await backendService.addMemberToBlend(blend.id, friend.inviteCode);
      expect(newMember.userId).toBe(friend.id);
      expect(newMember.role).toBe('member');

      // Friend receives notification
      const friendNotifs = await backendService.getNotifications(friend.id);
      expect(friendNotifs.some(n => n.type === 'blend_invite' && n.blendId === blend.id && n.title === 'Added to a Blend')).toBe(true);
    }, 30000);

    it('allows Admin to kick a member, but prevents non-admin from kicking', async () => {
      const memberUser = await backendService.registerUser('Nidhi Gupta', 'nidhi@campus.edu');
      sandboxBackend.switchActiveUser('user_you');
      const blend = await backendService.createBlend('Study Ride', [memberUser.inviteCode]);

      // Non-admin attempts to kick
      sandboxBackend.switchActiveUser(memberUser.id);
      await expect(
        backendService.removeMemberFromBlend(blend.id, 'user_you')
      ).rejects.toThrow(/Only the Blend Admin can remove members/);

      // Admin kicks the member
      sandboxBackend.switchActiveUser('user_you');
      await backendService.removeMemberFromBlend(blend.id, memberUser.id);

      const remaining = await backendService.getBlendMembers(blend.id);
      expect(remaining.some(m => m.userId === memberUser.id)).toBe(false);

      // Kicked member receives notification
      const kickedNotifs = await backendService.getNotifications(memberUser.id);
      expect(kickedNotifs.some(n => n.title === 'Removed from Blend')).toBe(true);
    }, 30000);

    it('allows Admin to delete blend, but strictly rejects non-admin deletion', async () => {
      const memberUser = await backendService.registerUser('Tarun Mehta', 'tarun@campus.edu');
      sandboxBackend.switchActiveUser('user_you');
      const blend = await backendService.createBlend('Temporary Blend', [memberUser.inviteCode]);

      // Non-admin attempts to delete
      sandboxBackend.switchActiveUser(memberUser.id);
      await expect(
        backendService.deleteBlend(blend.id)
      ).rejects.toThrow(/Only the Blend Admin can delete this blend/);

      // Admin deletes blend
      sandboxBackend.switchActiveUser('user_you');
      await backendService.deleteBlend(blend.id);

      const found = await backendService.findBlendByCode(blend.blendCode || '');
      expect(found).toBeNull();
    }, 30000);
  });
});
