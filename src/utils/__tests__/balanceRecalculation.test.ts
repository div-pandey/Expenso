import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateEqualShares,
  calculateMemberBalances,
  calculateSuggestedSettlements,
  calculateTotalSpend,
} from '../calculations';
import type { Member, Expense, Settlement } from '../../types';
import { sandboxBackend } from '../../services/sandboxBackend';

describe('Automatic Net Balance Recalculation Engine', () => {
  const memberX: Member = {
    id: 'user_x',
    name: 'Member X',
    initials: 'MX',
    avatarColor: 'bg-emerald-600 text-white',
    isCurrentUser: true,
  };
  const memberY: Member = {
    id: 'user_y',
    name: 'Member Y',
    initials: 'MY',
    avatarColor: 'bg-amber-600 text-white',
    isCurrentUser: false,
  };
  const memberZ: Member = {
    id: 'user_z',
    name: 'Member Z',
    initials: 'MZ',
    avatarColor: 'bg-sky-600 text-white',
    isCurrentUser: false,
  };
  const members = [memberX, memberY, memberZ];

  it('Step 1: X pays ₹300 for a cab shared equally by X, Y, and Z', () => {
    // 30000 paise split 3 ways -> 10000 paise (₹100.00) each
    const expenseCab: Expense = {
      id: 'exp_cab_300',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab to campus',
      amountPaise: 30000, // ₹300.00
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expenseCab], []);

    // X paid ₹300, own share ₹100 -> net +₹200 (+20000 paise)
    expect(balances['user_x'].netBalancePaise).toBe(20000);
    expect(balances['user_x'].totalPaidPaise).toBe(30000);
    expect(balances['user_x'].totalSharePaise).toBe(10000);

    // Y paid ₹0, own share ₹100 -> net -₹100 (-10000 paise)
    expect(balances['user_y'].netBalancePaise).toBe(-10000);
    expect(balances['user_y'].totalPaidPaise).toBe(0);
    expect(balances['user_y'].totalSharePaise).toBe(10000);

    // Z paid ₹0, own share ₹100 -> net -₹100 (-10000 paise)
    expect(balances['user_z'].netBalancePaise).toBe(-10000);
    expect(balances['user_z'].totalPaidPaise).toBe(0);
    expect(balances['user_z'].totalSharePaise).toBe(10000);

    // Invariant: sum of net balances must be zero
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);

    // Outstanding settlements: Y owes X ₹100, Z owes X ₹100
    const settlements = calculateSuggestedSettlements(balances);
    expect(settlements).toHaveLength(2);
    expect(settlements).toEqual(
      expect.arrayContaining([
        { fromMemberId: 'user_y', toMemberId: 'user_x', amountPaise: 10000 },
        { fromMemberId: 'user_z', toMemberId: 'user_x', amountPaise: 10000 },
      ])
    );
  });

  it('Step 2: Y pays ₹50 toward X share, automatically recalculating remaining debt', () => {
    const expenseCab: Expense = {
      id: 'exp_cab_300',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab to campus',
      amountPaise: 30000, // ₹300.00
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    // Repayment: Y pays ₹50 (5000 paise) to X
    const repaymentYtoX: Settlement = {
      id: 'set_y_to_x_50',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000, // ₹50.00
      date: '2026-10-28T11:00:00.000Z',
      notes: 'UPI payment for cab share',
      createdAt: '2026-10-28T11:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expenseCab], [repaymentYtoX]);

    // X now has ₹150 left to receive (+15000 paise)
    expect(balances['user_x'].netBalancePaise).toBe(15000);
    expect(balances['user_x'].repaymentsReceivedPaise).toBe(5000);

    // Y now owes ₹50 remaining (-5000 paise)
    expect(balances['user_y'].netBalancePaise).toBe(-5000);
    expect(balances['user_y'].repaymentsSentPaise).toBe(5000);

    // Z still owes ₹100 (-10000 paise)
    expect(balances['user_z'].netBalancePaise).toBe(-10000);

    // Sum of net balances must still equal 0
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);

    // Outstanding settlements: Y owes X ₹50, Z owes X ₹100 (₹100 debt from Y is updated to ₹50)
    const suggested = calculateSuggestedSettlements(balances);
    expect(suggested).toHaveLength(2);
    expect(suggested).toEqual(
      expect.arrayContaining([
        { fromMemberId: 'user_y', toMemberId: 'user_x', amountPaise: 5000 },
        { fromMemberId: 'user_z', toMemberId: 'user_x', amountPaise: 10000 },
      ])
    );
  });

  it('Step 3: Activity history preserves both original expense and repayment records without mutation', () => {
    const expenseCab: Expense = {
      id: 'exp_cab_300',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab to campus',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    const repaymentYtoX: Settlement = {
      id: 'set_y_to_x_50',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000,
      date: '2026-10-28T11:00:00.000Z',
      notes: 'UPI payment',
      createdAt: '2026-10-28T11:00:00.000Z',
    };

    // Both records exist independently
    const expenses = [expenseCab];
    const settlements = [repaymentYtoX];

    expect(expenses).toHaveLength(1);
    expect(expenses[0].amountPaise).toBe(30000);
    expect(expenses[0].description).toBe('Cab to campus');

    expect(settlements).toHaveLength(1);
    expect(settlements[0].amountPaise).toBe(5000);
    expect(settlements[0].fromMemberId).toBe('user_y');
    expect(settlements[0].toMemberId).toBe('user_x');

    // Total spend remains ₹300 (repayments are settlements, not commute spend)
    expect(calculateTotalSpend(expenses)).toBe(30000);
  });

  it('Step 4: Fully settling a debt removes that debt from outstanding balances', () => {
    const expenseCab: Expense = {
      id: 'exp_cab_300',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab to campus',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    // Y pays first ₹50, then second ₹50
    const repayment1: Settlement = {
      id: 'set_1',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000,
      date: '2026-10-28T11:00:00.000Z',
      createdAt: '2026-10-28T11:00:00.000Z',
    };

    const repayment2: Settlement = {
      id: 'set_2',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000,
      date: '2026-10-28T12:00:00.000Z',
      createdAt: '2026-10-28T12:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expenseCab], [repayment1, repayment2]);

    // Y is now completely settled (net 0)
    expect(balances['user_y'].netBalancePaise).toBe(0);
    expect(balances['user_x'].netBalancePaise).toBe(10000); // X still owed ₹100 from Z
    expect(balances['user_z'].netBalancePaise).toBe(-10000);

    // Suggested settlements: Y is removed from outstanding debts!
    const suggested = calculateSuggestedSettlements(balances);
    expect(suggested).toHaveLength(1);
    expect(suggested[0]).toEqual({
      fromMemberId: 'user_z',
      toMemberId: 'user_x',
      amountPaise: 10000,
    });

    // When Z also settles up:
    const repaymentZ: Settlement = {
      id: 'set_3',
      blendId: 'blend_test',
      createdBy: 'user_z',
      fromMemberId: 'user_z',
      toMemberId: 'user_x',
      amountPaise: 10000,
      date: '2026-10-28T13:00:00.000Z',
      createdAt: '2026-10-28T13:00:00.000Z',
    };

    const finalBalances = calculateMemberBalances(members, [expenseCab], [repayment1, repayment2, repaymentZ]);
    expect(finalBalances['user_x'].netBalancePaise).toBe(0);
    expect(finalBalances['user_y'].netBalancePaise).toBe(0);
    expect(finalBalances['user_z'].netBalancePaise).toBe(0);

    // Zero debts outstanding
    const finalSuggested = calculateSuggestedSettlements(finalBalances);
    expect(finalSuggested).toHaveLength(0);
  });

  it('Step 5: Subsequent expenses recalculate balances dynamically', () => {
    // Expense 1: X pays ₹300 for X, Y, Z (₹100 each)
    const exp1: Expense = {
      id: 'e1',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    // Repayment: Y pays X ₹50
    const set1: Settlement = {
      id: 's1',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000,
      date: '2026-10-28T10:00:00.000Z',
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    // Later: Z pays ₹180 for Metro tickets shared by X, Y, Z (₹60 each)
    const exp2: Expense = {
      id: 'e2',
      blendId: 'blend_test',
      createdBy: 'user_z',
      payerId: 'user_z',
      description: 'Metro return',
      amountPaise: 18000,
      category: 'metro',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(18000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T16:00:00.000Z',
      createdAt: '2026-10-28T16:00:00.000Z',
      updatedAt: '2026-10-28T16:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [exp1, exp2], [set1]);

    // X: paid 30000, share 16000 (10000+6000), received 5000
    // Net: (30000 + 0) - (16000 + 5000) = +9000 (+₹90)
    expect(balances['user_x'].netBalancePaise).toBe(9000);

    // Y: paid 0, share 16000 (10000+6000), sent 5000
    // Net: (0 + 5000) - (16000 + 0) = -11000 (-₹110)
    expect(balances['user_y'].netBalancePaise).toBe(-11000);

    // Z: paid 18000, share 16000 (10000+6000), sent 0, received 0
    // Net: (18000 + 0) - (16000 + 0) = +2000 (+₹20)
    expect(balances['user_z'].netBalancePaise).toBe(2000);

    // Sum is exactly zero (+90 + 20 - 110 = 0)
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);

    // Suggested settlements: Y pays X ₹90, Y pays Z ₹20
    const suggested = calculateSuggestedSettlements(balances);
    expect(suggested).toHaveLength(2);
    expect(suggested).toEqual(
      expect.arrayContaining([
        { fromMemberId: 'user_y', toMemberId: 'user_x', amountPaise: 9000 },
        { fromMemberId: 'user_y', toMemberId: 'user_z', amountPaise: 2000 },
      ])
    );
  });

  it('Step 6: Deleting a repayment immediately restores the previous debt', () => {
    const exp1: Expense = {
      id: 'e1',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    const set1: Settlement = {
      id: 's1',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 5000,
      date: '2026-10-28T10:00:00.000Z',
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    // With repayment: Y owes ₹50
    const withRepayment = calculateMemberBalances(members, [exp1], [set1]);
    expect(withRepayment['user_y'].netBalancePaise).toBe(-5000);

    // When repayment is deleted (settlements array empty): Y owes ₹100 again
    const withoutRepayment = calculateMemberBalances(members, [exp1], []);
    expect(withoutRepayment['user_y'].netBalancePaise).toBe(-10000);
    expect(withoutRepayment['user_x'].netBalancePaise).toBe(20000);
  });

  it('Step 7: Overpayment credit is handled fairly using the group net balances', () => {
    // X pays ₹300 for X, Y, Z (each owes ₹100)
    const exp1: Expense = {
      id: 'e1',
      blendId: 'blend_test',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Cab',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: calculateEqualShares(30000, ['user_x', 'user_y', 'user_z']),
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    // Y accidentally or generously transfers ₹150 (₹50 more than ₹100 owed)
    const setOverpaid: Settlement = {
      id: 's_over',
      blendId: 'blend_test',
      createdBy: 'user_y',
      fromMemberId: 'user_y',
      toMemberId: 'user_x',
      amountPaise: 15000, // ₹150
      date: '2026-10-28T10:00:00.000Z',
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [exp1], [setOverpaid]);

    // Y: paid 0, share 10000, sent 15000 -> net +5000 (Y should receive ₹50!)
    expect(balances['user_y'].netBalancePaise).toBe(5000);

    // X: paid 30000, share 10000, received 15000 -> net +5000 (X should receive ₹50)
    expect(balances['user_x'].netBalancePaise).toBe(5000);

    // Z: paid 0, share 10000, sent 0 -> net -10000 (Z owes ₹100)
    expect(balances['user_z'].netBalancePaise).toBe(-10000);

    // Sum of net balances = 0
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);

    // Z's ₹100 debt is split to repay X ₹50 and Y ₹50
    const suggested = calculateSuggestedSettlements(balances);
    expect(suggested).toHaveLength(2);
    expect(suggested).toEqual(
      expect.arrayContaining([
        { fromMemberId: 'user_z', toMemberId: 'user_y', amountPaise: 5000 },
        { fromMemberId: 'user_z', toMemberId: 'user_x', amountPaise: 5000 },
      ])
    );
  });
});

describe('Repayment Ownership & Authorization Security', () => {
  beforeEach(() => {
    sandboxBackend.resetDemoData();
  });

  it('rejects recording a repayment on behalf of another member', () => {
    // Current user is Divyansh (user_you)
    expect(sandboxBackend.getCurrentUser().id).toBe('user_you');

    // Attempting to record a repayment claiming Rahul (user_rahul) sent money to Aman
    expect(() => {
      sandboxBackend.createSettlement('blend_college_crew', {
        fromMemberId: 'user_rahul', // FORGERY: Authenticated user is user_you
        toMemberId: 'user_aman',
        amountPaise: 5000,
        date: new Date().toISOString(),
      });
    }).toThrow(/Unauthorized/i);
  });

  it('allows the authenticated user to record their own repayment', () => {
    const s = sandboxBackend.createSettlement('blend_college_crew', {
      fromMemberId: 'user_you', // Legitimate: matches current user
      toMemberId: 'user_rahul',
      amountPaise: 4000,
      date: new Date().toISOString(),
      notes: 'Metro repayment',
    });

    expect(s.id).toBeDefined();
    expect(s.fromMemberId).toBe('user_you');
    expect(s.toMemberId).toBe('user_rahul');
    expect(s.createdBy).toBe('user_you');
  });

  it('prevents non-creators from deleting a repayment', () => {
    // Record repayment as Aman (user_aman)
    sandboxBackend.switchActiveUser('user_aman');
    const s = sandboxBackend.createSettlement('blend_college_crew', {
      fromMemberId: 'user_aman',
      toMemberId: 'user_rahul',
      amountPaise: 5000,
      date: new Date().toISOString(),
    });

    // Switch to Divyansh (user_you)
    sandboxBackend.switchActiveUser('user_you');

    expect(() => {
      sandboxBackend.deleteSettlement(s.id);
    }).toThrow(/Forbidden/i);
  });

  it('allows creator to delete their own repayment and auto-recalculate', () => {
    // Record a new repayment as user_you
    const s = sandboxBackend.createSettlement('blend_college_crew', {
      fromMemberId: 'user_you',
      toMemberId: 'user_rahul',
      amountPaise: 3000,
      date: new Date().toISOString(),
    });

    // Delete it as user_you
    expect(() => {
      sandboxBackend.deleteSettlement(s.id);
    }).not.toThrow();

    const remaining = sandboxBackend.getBlendSettlements('blend_college_crew');
    expect(remaining.some(item => item.id === s.id)).toBe(false);
  });
});

