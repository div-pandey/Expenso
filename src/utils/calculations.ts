import type { Member, Expense, Settlement, SuggestedSettlement, MemberBalanceSummary } from '../types';

/**
 * Calculates equal participant shares in integer paise.
 * If the amount cannot be divided evenly, the remainder paise are distributed
 * deterministically (1 paise each to the first remainder participants in sorted order).
 * 
 * Invariant: Sum of shares exactly equals amountPaise.
 */
export function calculateEqualShares(
  amountPaise: number,
  participantIds: string[]
): Record<string, number> {
  if (amountPaise <= 0 || participantIds.length === 0) {
    return {};
  }

  // Sort participant IDs deterministically to ensure reproducible paise distribution
  const sortedIds = [...participantIds].sort();
  const count = sortedIds.length;
  const baseShare = Math.floor(amountPaise / count);
  const remainder = amountPaise % count;

  const shares: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const id = sortedIds[i];
    // First `remainder` participants get 1 extra paise
    shares[id] = baseShare + (i < remainder ? 1 : 0);
  }

  return shares;
}

/**
 * Computes individual balance breakdown and net balance for each member.
 * 
 * Net balance = total amount paid + repayments received - expense shares - repayments made
 * 
 * Positive = member should receive money.
 * Negative = member owes money.
 * Zero = settled up.
 * 
 * Invariant: Sum of all netBalances across members must equal 0.
 */
export function calculateMemberBalances(
  members: Member[],
  expenses: Expense[],
  settlements: Settlement[]
): Record<string, MemberBalanceSummary> {
  const summaries: Record<string, MemberBalanceSummary> = {};

  for (const m of members) {
    summaries[m.id] = {
      memberId: m.id,
      totalPaidPaise: 0,
      totalSharePaise: 0,
      repaymentsSentPaise: 0,
      repaymentsReceivedPaise: 0,
      netBalancePaise: 0,
    };
  }

  // Tally expenses
  for (const exp of expenses) {
    if (summaries[exp.payerId]) {
      summaries[exp.payerId].totalPaidPaise += exp.amountPaise;
    }
    for (const [memberId, sharePaise] of Object.entries(exp.shares)) {
      if (summaries[memberId]) {
        summaries[memberId].totalSharePaise += sharePaise;
      }
    }
  }

  // Tally settlements (repayments)
  // CRITICAL FINANCIAL RULE: Only 'confirmed' settlements reduce official debt.
  // 'pending_payment', 'proof_submitted', 'rejected', or 'cancelled' do NOT modify balances.
  for (const set of settlements) {
    if (!set.status || set.status === 'confirmed') {
      if (summaries[set.fromMemberId]) {
        summaries[set.fromMemberId].repaymentsSentPaise += set.amountPaise;
      }
      if (summaries[set.toMemberId]) {
        summaries[set.toMemberId].repaymentsReceivedPaise += set.amountPaise;
      }
    }
  }

  // Calculate net balance for each member:
  // Net position = Total money paid out (expenses paid + settlements sent) - Total money consumed/received (expense shares + settlements received)
  for (const m of members) {
    const s = summaries[m.id];
    s.netBalancePaise =
      s.totalPaidPaise +
      s.repaymentsSentPaise -
      s.totalSharePaise -
      s.repaymentsReceivedPaise;
  }

  return summaries;
}

/**
 * Calculates simplified, optimal settlement suggestions.
 * Matches members who owe money (debtors) with members who should receive money (creditors)
 * using a greedy algorithm that minimizes the number of transfers.
 */
export function calculateSuggestedSettlements(
  summaries: Record<string, MemberBalanceSummary>
): SuggestedSettlement[] {
  // Debtors have negative net balance, meaning they owe (-netBalance)
  const debtors: { memberId: string; amountPaise: number }[] = [];
  // Creditors have positive net balance, meaning they should receive (+netBalance)
  const creditors: { memberId: string; amountPaise: number }[] = [];

  for (const summary of Object.values(summaries)) {
    if (summary.netBalancePaise < 0) {
      debtors.push({
        memberId: summary.memberId,
        amountPaise: Math.abs(summary.netBalancePaise),
      });
    } else if (summary.netBalancePaise > 0) {
      creditors.push({
        memberId: summary.memberId,
        amountPaise: summary.netBalancePaise,
      });
    }
  }

  // Sort descending by amount to greedily resolve largest debts first
  debtors.sort((a, b) => b.amountPaise - a.amountPaise);
  creditors.sort((a, b) => b.amountPaise - a.amountPaise);

  const suggested: SuggestedSettlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.amountPaise, creditor.amountPaise);

    if (transferAmount > 0) {
      suggested.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountPaise: transferAmount,
      });

      debtor.amountPaise -= transferAmount;
      creditor.amountPaise -= transferAmount;
    }

    if (debtor.amountPaise === 0) {
      dIdx++;
    }
    if (creditor.amountPaise === 0) {
      cIdx++;
    }
  }

  return suggested;
}

/**
 * Computes total spending for a given collection of expenses in integer paise.
 */
export function calculateTotalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountPaise, 0);
}
