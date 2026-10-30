import { describe, it, expect } from 'vitest';
import {
  calculateEqualShares,
  calculateMemberBalances,
  calculateSuggestedSettlements,
  calculateTotalSpend,
} from '../calculations';
import type { Member, Expense, Settlement } from '../../types';

describe('Financial Calculations Engine', () => {
  const members: Member[] = [
    { id: 'user_you', name: 'You', initials: 'YO', avatarColor: '', isCurrentUser: true },
    { id: 'user_rahul', name: 'Rahul', initials: 'RA', avatarColor: '' },
    { id: 'user_aman', name: 'Aman', initials: 'AM', avatarColor: '' },
  ];

  it('splits an expense equally among three members without remainder', () => {
    // ₹120.00 = 12000 paise split 3 ways -> 4000 paise each
    const shares = calculateEqualShares(12000, ['user_you', 'user_rahul', 'user_aman']);
    expect(shares['user_you']).toBe(4000);
    expect(shares['user_rahul']).toBe(4000);
    expect(shares['user_aman']).toBe(4000);
    expect(shares['user_you'] + shares['user_rahul'] + shares['user_aman']).toBe(12000);
  });

  it('splits an expense shared by only two members', () => {
    // ₹90.00 = 9000 paise split 2 ways -> 4500 paise each
    const shares = calculateEqualShares(9000, ['user_rahul', 'user_aman']);
    expect(shares['user_rahul']).toBe(4500);
    expect(shares['user_aman']).toBe(4500);
    expect(shares['user_you']).toBeUndefined();
    expect(shares['user_rahul'] + shares['user_aman']).toBe(9000);
  });

  it('handles rounding to paise deterministically so shares sum exactly to total amount', () => {
    // ₹100.00 = 10000 paise / 3 = 3333 paise each, with 1 paise remainder
    // In our algorithm, participant IDs are sorted ('user_aman', 'user_rahul', 'user_you')
    // First remainder gets +1 paise (3334 paise), others get 3333 paise.
    const shares = calculateEqualShares(10000, ['user_you', 'user_rahul', 'user_aman']);
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(sum).toBe(10000);

    // ₹10.01 = 1001 paise / 3 = 333 with 2 remainder -> two get 334, one gets 333
    const shares2 = calculateEqualShares(1001, ['user_you', 'user_rahul', 'user_aman']);
    const sum2 = Object.values(shares2).reduce((a, b) => a + b, 0);
    expect(sum2).toBe(1001);
  });

  it('handles a payer who is NOT among the participants', () => {
    // E.g. You paid ₹100 for Rahul and Aman's ride, but You didn't take the ride
    const shares = calculateEqualShares(10000, ['user_rahul', 'user_aman']);
    const exp: Expense = {
      id: 'e1',
      blendId: 'blend_1',
      createdBy: 'user_you',
      description: 'Ride for friends',
      amountPaise: 10000,
      category: 'auto',
      payerId: 'user_you',
      participantIds: ['user_rahul', 'user_aman'],
      shares,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const balances = calculateMemberBalances(members, [exp], []);
    // You paid 10000, owe 0 -> Net: +10000
    // Rahul paid 0, owes 5000 -> Net: -5000
    // Aman paid 0, owes 5000 -> Net: -5000
    expect(balances['user_you'].netBalancePaise).toBe(10000);
    expect(balances['user_rahul'].netBalancePaise).toBe(-5000);
    expect(balances['user_aman'].netBalancePaise).toBe(-5000);

    // Sum of net balances must be zero
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);
  });

  it('handles multiple expenses paid by different members with unequal participant sets', () => {
    // Expense 1: Rahul pays ₹90 for all three (each owes ₹30)
    const exp1: Expense = {
      id: 'e1',
      blendId: 'blend_1',
      createdBy: 'user_rahul',
      description: 'Auto',
      amountPaise: 9000,
      category: 'auto',
      payerId: 'user_rahul',
      participantIds: ['user_you', 'user_rahul', 'user_aman'],
      shares: calculateEqualShares(9000, ['user_you', 'user_rahul', 'user_aman']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Expense 2: Aman pays ₹120 for all three (each owes ₹40)
    const exp2: Expense = {
      id: 'e2',
      blendId: 'blend_1',
      createdBy: 'user_aman',
      description: 'Metro',
      amountPaise: 12000,
      category: 'metro',
      payerId: 'user_aman',
      participantIds: ['user_you', 'user_rahul', 'user_aman'],
      shares: calculateEqualShares(12000, ['user_you', 'user_rahul', 'user_aman']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Expense 3: You pay ₹60 for all three (each owes ₹20)
    const exp3: Expense = {
      id: 'e3',
      blendId: 'blend_1',
      createdBy: 'user_you',
      description: 'Rickshaw',
      amountPaise: 6000,
      category: 'auto',
      payerId: 'user_you',
      participantIds: ['user_you', 'user_rahul', 'user_aman'],
      shares: calculateEqualShares(6000, ['user_you', 'user_rahul', 'user_aman']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Net check:
    // Total spent = 270, each person's total share = 30 + 40 + 20 = 90
    // Rahul paid 90, share 90 -> net 0
    // Aman paid 120, share 90 -> net +30 (should receive ₹30)
    // You paid 60, share 90 -> net -30 (owes ₹30)
    const balances = calculateMemberBalances(members, [exp1, exp2, exp3], []);
    expect(balances['user_rahul'].netBalancePaise).toBe(0);
    expect(balances['user_aman'].netBalancePaise).toBe(3000);
    expect(balances['user_you'].netBalancePaise).toBe(-3000);

    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);
  });

  it('correctly recalculates balances when an expense is edited or deleted', () => {
    const exp1: Expense = {
      id: 'e1',
      blendId: 'blend_1',
      createdBy: 'user_rahul',
      description: 'Metro',
      amountPaise: 12000,
      category: 'metro',
      payerId: 'user_rahul',
      participantIds: ['user_you', 'user_rahul', 'user_aman'],
      shares: calculateEqualShares(12000, ['user_you', 'user_rahul', 'user_aman']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const exp2: Expense = {
      id: 'e2',
      blendId: 'blend_1',
      createdBy: 'user_you',
      description: 'Auto',
      amountPaise: 6000,
      category: 'auto',
      payerId: 'user_you',
      participantIds: ['user_you', 'user_rahul'],
      shares: calculateEqualShares(6000, ['user_you', 'user_rahul']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let expenses = [exp1, exp2];
    let balances = calculateMemberBalances(members, expenses, []);
    expect(balances['user_aman'].netBalancePaise).toBe(-4000); // Owes ₹40

    // EDIT exp1 from ₹120 to ₹150 (50 each)
    const updatedExp1: Expense = {
      ...exp1,
      amountPaise: 15000,
      shares: calculateEqualShares(15000, ['user_you', 'user_rahul', 'user_aman']),
    };
    expenses = [updatedExp1, exp2];
    balances = calculateMemberBalances(members, expenses, []);
    expect(balances['user_aman'].netBalancePaise).toBe(-5000); // Now owes ₹50

    // DELETE exp2
    expenses = [updatedExp1];
    balances = calculateMemberBalances(members, expenses, []);
    // Rahul paid 150, share 50 -> net +100
    // Aman paid 0, share 50 -> net -50
    // You paid 0, share 50 -> net -50
    expect(balances['user_rahul'].netBalancePaise).toBe(10000);
    expect(balances['user_aman'].netBalancePaise).toBe(-5000);
    expect(balances['user_you'].netBalancePaise).toBe(-5000);
  });

  it('records repayments (settlements) without modifying expense history', () => {
    const exp: Expense = {
      id: 'e1',
      blendId: 'blend_1',
      createdBy: 'user_rahul',
      description: 'Metro ride',
      amountPaise: 12000,
      category: 'metro',
      payerId: 'user_rahul',
      participantIds: ['user_you', 'user_rahul', 'user_aman'],
      shares: calculateEqualShares(12000, ['user_you', 'user_rahul', 'user_aman']),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initially: Rahul is owed 80, You owe 40, Aman owes 40
    let balances = calculateMemberBalances(members, [exp], []);
    expect(balances['user_you'].netBalancePaise).toBe(-4000);
    expect(balances['user_rahul'].netBalancePaise).toBe(8000);

    // You repay Rahul ₹40 (4000 paise)
    const settlement: Settlement = {
      id: 's1',
      blendId: 'blend_1',
      createdBy: 'user_you',
      fromMemberId: 'user_you',
      toMemberId: 'user_rahul',
      amountPaise: 4000,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    balances = calculateMemberBalances(members, [exp], [settlement]);
    // You are now settled up (0)
    expect(balances['user_you'].netBalancePaise).toBe(0);
    // Rahul is now owed 40 (by Aman)
    expect(balances['user_rahul'].netBalancePaise).toBe(4000);
    // Aman still owes 40
    expect(balances['user_aman'].netBalancePaise).toBe(-4000);

    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalancePaise, 0);
    expect(sum).toBe(0);
  });

  it('suggests optimal settlements that completely clear all balances to zero', () => {
    // Balances:
    // Rahul: +₹80 (8000 paise)
    // Aman: -₹30 (-3000 paise)
    // You: -₹50 (-5000 paise)
    const mockBalances = {
      user_rahul: { memberId: 'user_rahul', totalPaidPaise: 8000, totalSharePaise: 0, repaymentsSentPaise: 0, repaymentsReceivedPaise: 0, netBalancePaise: 8000 },
      user_aman: { memberId: 'user_aman', totalPaidPaise: 0, totalSharePaise: 3000, repaymentsSentPaise: 0, repaymentsReceivedPaise: 0, netBalancePaise: -3000 },
      user_you: { memberId: 'user_you', totalPaidPaise: 0, totalSharePaise: 5000, repaymentsSentPaise: 0, repaymentsReceivedPaise: 0, netBalancePaise: -5000 },
    };

    const suggestions = calculateSuggestedSettlements(mockBalances);
    expect(suggestions.length).toBe(2);

    // Suggestion 1: Largest debtor (You, 5000) -> Rahul (5000)
    expect(suggestions).toContainEqual({
      fromMemberId: 'user_you',
      toMemberId: 'user_rahul',
      amountPaise: 5000,
    });

    // Suggestion 2: Aman (3000) -> Rahul (3000)
    expect(suggestions).toContainEqual({
      fromMemberId: 'user_aman',
      toMemberId: 'user_rahul',
      amountPaise: 3000,
    });

    // Verify simulating these settlements brings all balances to 0
    let rahulNet = 8000;
    let amanNet = -3000;
    let youNet = -5000;

    for (const s of suggestions) {
      if (s.toMemberId === 'user_rahul') rahulNet -= s.amountPaise;
      if (s.fromMemberId === 'user_you') youNet += s.amountPaise;
      if (s.fromMemberId === 'user_aman') amanNet += s.amountPaise;
    }

    expect(rahulNet).toBe(0);
    expect(amanNet).toBe(0);
    expect(youNet).toBe(0);
  });

  it('calculates total spend correctly', () => {
    const expenses: Expense[] = [
      { id: '1', blendId: 'blend_1', createdBy: 'user_you', description: 'Metro', amountPaise: 12000, category: 'metro', payerId: 'user_you', participantIds: [], shares: {}, date: '', createdAt: '', updatedAt: '' },
      { id: '2', blendId: 'blend_1', createdBy: 'user_you', description: 'Auto', amountPaise: 6000, category: 'auto', payerId: 'user_you', participantIds: [], shares: {}, date: '', createdAt: '', updatedAt: '' },
    ];
    expect(calculateTotalSpend(expenses)).toBe(18000);
  });
});
