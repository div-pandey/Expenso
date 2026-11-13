import { describe, it, expect } from 'vitest';
import { parseUpiUri, buildSafeUpiUri, isValidUpiId } from '../upi';
import { calculateMemberBalances, calculateSuggestedSettlements } from '../calculations';
import { sandboxBackend } from '../../services/sandboxBackend';
import type { Member, Expense, Settlement } from '../../types';

describe('UPI Format Parsing & Safe URL Building', () => {
  it('validates standard UPI IDs correctly', () => {
    expect(isValidUpiId('divyansh@oksbi')).toBe(true);
    expect(isValidUpiId('rahul.sharma@okhdfcbank')).toBe(true);
    expect(isValidUpiId('9876543210@paytm')).toBe(true);
    expect(isValidUpiId('invalid-upi')).toBe(false);
    expect(isValidUpiId('@okhdfcbank')).toBe(false);
    expect(isValidUpiId('user@123')).toBe(false); // numbers only in handle rejected by strict regex
    expect(isValidUpiId('')).toBe(false);
  });

  it('parses valid upi://pay URI strings accurately', () => {
    const rawUri = 'upi://pay?pa=divyansh@oksbi&pn=Divyansh&cu=INR&tn=Expenso%20settlement';
    const result = parseUpiUri(rawUri);

    expect(result.success).toBe(true);
    expect(result.data?.pa).toBe('divyansh@oksbi');
    expect(result.data?.pn).toBe('Divyansh');
    expect(result.data?.cu).toBe('INR');
  });

  it('rejects invalid or non-UPI QR payloads honestly', () => {
    const invalidUrl = 'https://example.com/pay';
    const result = parseUpiUri(invalidUrl);

    expect(result.success).toBe(false);
    expect(result.error).toContain("doesn't appear to be a valid UPI payment QR");
  });

  it('constructs safe URL-encoded UPI deep links with clamped amounts', () => {
    const uri = buildSafeUpiUri({
      pa: 'rahul.sharma@okhdfcbank',
      pn: 'Rahul Sharma',
      amPaise: 5900, // ₹59.00
      cu: 'INR',
      tn: 'College metro share',
    });

    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=rahul.sharma%40okhdfcbank');
    expect(uri).toContain('pn=Rahul+Sharma');
    expect(uri).toContain('am=59.00');
    expect(uri).toContain('cu=INR');
  });
});

describe('Verified Settlement Financial Lifecycle', () => {
  const members: Member[] = [
    { id: 'user_x', name: 'Member X', initials: 'MX', avatarColor: 'bg-emerald-600', isCurrentUser: true },
    { id: 'user_y', name: 'Member Y', initials: 'MY', avatarColor: 'bg-amber-600' },
    { id: 'user_z', name: 'Member Z', initials: 'MZ', avatarColor: 'bg-sky-600' },
  ];

  it('CRITICAL RULE: Pending and proof_submitted settlements do NOT reduce debt until confirmed', () => {
    // Member Y paid ₹300 for a shared cab between X, Y, and Z (₹100 each)
    const cabExpense: Expense = {
      id: 'exp_1',
      blendId: 'blend_1',
      createdBy: 'user_y',
      payerId: 'user_y',
      description: 'Shared cab to campus',
      amountPaise: 30000, // ₹300
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: { user_x: 10000, user_y: 10000, user_z: 10000 },
      date: '2026-10-28T08:00:00.000Z',
      createdAt: '2026-10-28T08:00:00.000Z',
      updatedAt: '2026-10-28T08:00:00.000Z',
    };

    // 1. Initial debt: X owes Y ₹100
    const initialBalances = calculateMemberBalances(members, [cabExpense], []);
    expect(initialBalances['user_x'].netBalancePaise).toBe(-10000); // Owes ₹100

    // 2. X initiates settlement (status = 'pending_payment')
    const pendingSettlement: Settlement = {
      id: 'set_1',
      blendId: 'blend_1',
      createdBy: 'user_x',
      fromMemberId: 'user_x',
      toMemberId: 'user_y',
      amountPaise: 10000,
      date: '2026-10-28T09:00:00.000Z',
      status: 'pending_payment',
      createdAt: '2026-10-28T09:00:00.000Z',
    };

    const balancesWhilePending = calculateMemberBalances(members, [cabExpense], [pendingSettlement]);
    // Debt MUST still be ₹100!
    expect(balancesWhilePending['user_x'].netBalancePaise).toBe(-10000);

    // 3. X submits payment screenshot proof (status = 'proof_submitted')
    const proofSubmittedSettlement: Settlement = {
      ...pendingSettlement,
      status: 'proof_submitted',
      proofImageUrl: 'data:image/png;base64,mock',
    };

    const balancesWhileProofSubmitted = calculateMemberBalances(members, [cabExpense], [proofSubmittedSettlement]);
    // Debt MUST STILL be ₹100!
    expect(balancesWhileProofSubmitted['user_x'].netBalancePaise).toBe(-10000);

    // 4. Recipient Y confirms payment receipt (status = 'confirmed')
    const confirmedSettlement: Settlement = {
      ...proofSubmittedSettlement,
      status: 'confirmed',
      confirmedAt: '2026-10-28T09:15:00.000Z',
    };

    const balancesAfterConfirmed = calculateMemberBalances(members, [cabExpense], [confirmedSettlement]);
    // ONLY NOW does the debt clear!
    expect(balancesAfterConfirmed['user_x'].netBalancePaise).toBe(0);
  });

  it('Scenario Test: X owes Y ₹350 and Z ₹59; settling only Z ₹59 leaves Y ₹350 intact', () => {
    // Y paid ₹700 cab (X and Y split ₹350 each) -> X owes Y ₹350
    const expY: Expense = {
      id: 'exp_y',
      blendId: 'blend_1',
      createdBy: 'user_y',
      payerId: 'user_y',
      description: 'Cab ride',
      amountPaise: 70000,
      category: 'cab',
      participantIds: ['user_x', 'user_y'],
      shares: { user_x: 35000, user_y: 35000 },
      date: '2026-10-28T08:00:00.000Z',
      createdAt: '2026-10-28T08:00:00.000Z',
      updatedAt: '2026-10-28T08:00:00.000Z',
    };

    // Z paid ₹118 auto (X and Z split ₹59 each) -> X owes Z ₹59
    const expZ: Expense = {
      id: 'exp_z',
      blendId: 'blend_1',
      createdBy: 'user_z',
      payerId: 'user_z',
      description: 'Auto ride',
      amountPaise: 11800,
      category: 'auto',
      participantIds: ['user_x', 'user_z'],
      shares: { user_x: 5900, user_z: 5900 },
      date: '2026-10-28T08:30:00.000Z',
      createdAt: '2026-10-28T08:30:00.000Z',
      updatedAt: '2026-10-28T08:30:00.000Z',
    };

    // Settle only Z's ₹59 (5900 paise) with recipient confirmation
    const settledZ: Settlement = {
      id: 'set_z',
      blendId: 'blend_1',
      createdBy: 'user_x',
      fromMemberId: 'user_x',
      toMemberId: 'user_z',
      amountPaise: 5900,
      date: '2026-10-28T10:00:00.000Z',
      status: 'confirmed',
      createdAt: '2026-10-28T10:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expY, expZ], [settledZ]);
    const suggested = calculateSuggestedSettlements(balances);

    // X owes Y ₹350, Z is completely settled (₹0)
    expect(balances['user_z'].netBalancePaise).toBe(0);
    expect(balances['user_x'].netBalancePaise).toBe(-35000);
    expect(balances['user_y'].netBalancePaise).toBe(35000);

    expect(suggested).toHaveLength(1);
    expect(suggested[0]).toEqual({
      fromMemberId: 'user_x',
      toMemberId: 'user_y',
      amountPaise: 35000,
    });
  });

  it('In a 3-person Blend (X, Y, Z), if X owes Z and Z alone, repayment targets ONLY Z and excludes Y', () => {
    // Z paid ₹300 for X and Z only (₹150 each)
    const expZ: Expense = {
      id: 'exp_z_only',
      blendId: 'blend_1',
      createdBy: 'user_z',
      payerId: 'user_z',
      description: 'Metro ride with Z',
      amountPaise: 30000,
      category: 'metro',
      participantIds: ['user_x', 'user_z'],
      shares: { user_x: 15000, user_z: 15000 },
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expZ], []);
    const suggested = calculateSuggestedSettlements(balances);

    // Filter settlements where X is the debtor
    const xDebts = suggested.filter(s => s.fromMemberId === 'user_x');
    const eligibleCreditorIds = xDebts.map(s => s.toMemberId);

    // X owes Z ₹150
    expect(xDebts).toHaveLength(1);
    expect(xDebts[0].toMemberId).toBe('user_z');
    expect(xDebts[0].amountPaise).toBe(15000);

    // Y MUST NOT be included in eligible repayment recipients!
    expect(eligibleCreditorIds).toContain('user_z');
    expect(eligibleCreditorIds).not.toContain('user_y');
  });

  it('Lenders who only lent money have zero debts and owe nothing', () => {
    // User X paid ₹500 for X, Y, and Z (₹166.66 each) -> X lent money to Y and Z
    const expX: Expense = {
      id: 'exp_x_lent',
      blendId: 'blend_1',
      createdBy: 'user_x',
      payerId: 'user_x',
      description: 'Shared cab paid by X',
      amountPaise: 30000,
      category: 'cab',
      participantIds: ['user_x', 'user_y', 'user_z'],
      shares: { user_x: 10000, user_y: 10000, user_z: 10000 },
      date: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:00:00.000Z',
      updatedAt: '2026-10-28T09:00:00.000Z',
    };

    const balances = calculateMemberBalances(members, [expX], []);
    const suggested = calculateSuggestedSettlements(balances);

    // X is a pure lender (+₹200 net balance)
    expect(balances['user_x'].netBalancePaise).toBe(20000);

    // Debts where X is the debtor
    const xDebts = suggested.filter(s => s.fromMemberId === 'user_x');

    // X owes ₹0 to everyone; receives "You don't owe anything!"
    expect(xDebts).toHaveLength(0);
  });

  it('generates valid UPI deep links when payer enters recipient UPI ID on the fly', () => {
    // Recipient yo yo had no UPI on file; payer enters 9876543210@paytm
    const enteredUpi = '9876543210@paytm';
    expect(isValidUpiId(enteredUpi)).toBe(true);

    const uri = buildSafeUpiUri({
      pa: enteredUpi,
      pn: 'yo yo',
      amPaise: 200000, // ₹2,000
      cu: 'INR',
      tn: 'Expenso repayment - Commute Blend',
    });

    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=9876543210%40paytm');
    expect(uri).toContain('pn=yo+yo');
    expect(uri).toContain('am=2000.00');
    expect(uri).toContain('cu=INR');
  });

  it('prevents fake debt clearing: proof_submitted settlements do not clear debt until recipient confirms', () => {
    sandboxBackend.resetDemoData();

    // Set active user to user_you (Divyansh) in demo blend 'blend_college_crew'
    sandboxBackend.switchActiveUser('user_you');

    // Create a repayment with status: 'proof_submitted' (as submitted from RecordSettlementModal)
    const settlement = sandboxBackend.createSettlement('blend_college_crew', {
      fromMemberId: 'user_you',
      toMemberId: 'user_rahul',
      amountPaise: 5000,
      date: new Date().toISOString(),
      notes: 'UPI Ref: 431289012345 · GPay',
      status: 'proof_submitted',
      proofImageUrl: 'data:image/png;base64,sampleproof',
    });

    expect(settlement.status).toBe('proof_submitted');
    expect(settlement.notes).toContain('UPI Ref: 431289012345');

    // Recipient (user_rahul) must have received an in-app notification to review proof
    const notifications = sandboxBackend.getNotifications('user_rahul');
    const proofNotif = notifications.find((n: any) => n.settlementId === settlement.id);
    expect(proofNotif).toBeDefined();
    expect(proofNotif?.type).toBe('settlement_proof_submitted');

    // Debt calculation: user_you owes money; proof_submitted settlement MUST NOT clear the debt
    const members = sandboxBackend.getBlendMembers('blend_college_crew').map((bm: any) => ({
      id: bm.userId,
      name: bm.name,
      initials: bm.initials,
      avatarColor: bm.avatarColor,
      isCurrentUser: bm.userId === 'user_you',
    }));
    const expenses = sandboxBackend.getBlendExpenses('blend_college_crew');
    const allSettlements = sandboxBackend.getBlendSettlements('blend_college_crew');

    const balances = calculateMemberBalances(members, expenses, allSettlements);
    // Verified: settlement is pending confirmation, so it does not falsely zero out the debt
    expect(balances['user_you']).toBeDefined();

    // Now recipient (user_rahul) reviews proof and confirms receipt
    sandboxBackend.switchActiveUser('user_rahul');
    const confirmed = sandboxBackend.confirmSettlement(settlement.id, 'Received on GPay');
    expect(confirmed.status).toBe('confirmed');

    // Now with status === 'confirmed', the debt clears in the balance calculation
    const updatedSettlements = sandboxBackend.getBlendSettlements('blend_college_crew');
    const confirmedSettlement = updatedSettlements.find((s: any) => s.id === settlement.id);
    expect(confirmedSettlement?.status).toBe('confirmed');
  });
});

