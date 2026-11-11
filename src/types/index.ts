export type TransportCategory =
  | 'auto'
  | 'erickshaw'
  | 'metro'
  | 'cab'
  | 'bus'
  | 'other';

export interface TransportMetadata {
  id: TransportCategory;
  label: string;
  iconName: string;
  defaultDescription: string;
}

export interface UserPaymentMethod {
  userId: string;
  payeeName: string;
  upiId: string;
  qrPayload?: string; // raw upi://pay?...
  qrImageUrl?: string; // stored data URL or remote path
  qrFormatVerified: boolean;
  currency: string; // 'INR'
  createdAt: string;
  updatedAt: string;
}

export interface ParsedUPI {
  pa: string; // payee address / upi id
  pn?: string; // payee name
  am?: string; // amount
  cu: string; // currency (INR)
  mc?: string; // merchant code
  tn?: string; // transaction note
  rawUri: string;
}

export interface UserProfile {
  id: string; // UUID
  email: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  inviteCode: string; // 6-character unique alphanumeric code
  phone?: string;
  passwordHash?: string;
  paymentMethod?: UserPaymentMethod;
  isOnboarded?: boolean;
  createdAt: string;
}

export interface Blend {
  id: string; // UUID
  name: string; // e.g. "College Crew"
  createdBy: string; // User ID
  createdAt: string;
  memberCount?: number;
  blendCode?: string; // 6-character unique alphanumeric blend code
  icon?: string; // Emoji, preset icon, or custom image data URL for blend profile picture
}

export interface BlendMember {
  id: string;
  blendId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  profile: UserProfile;
}

// Backward-compatible Member interface for calculations & views
export interface Member {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  isCurrentUser?: boolean;
  phone?: string;
  inviteCode?: string;
  paymentMethod?: UserPaymentMethod;
  role?: 'admin' | 'member';
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  blendId: string;
  createdBy: string; // Must match authenticated user
  payerId: string; // Must match createdBy (payer immutability)
  description: string;
  amountPaise: number; // Integer paise (₹120 = 12000 paise)
  category: TransportCategory;
  participantIds: string[];
  shares: Record<string, number>; // memberId -> paise share
  date: string; // ISO date string
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SettlementStatus =
  | 'pending_payment'
  | 'proof_submitted'
  | 'confirmed'
  | 'rejected'
  | 'cancelled';

export interface Settlement {
  id: string;
  blendId: string;
  createdBy: string; // Who recorded/initiated the settlement (sender)
  fromMemberId: string; // Who paid back (sender)
  toMemberId: string; // Who received repayment (recipient)
  amountPaise: number; // Integer paise
  date: string; // ISO date string
  notes?: string;
  status?: SettlementStatus; // Optional: legacy settlements without status are treated as 'confirmed'
  proofImageUrl?: string; // Evidence screenshot
  decisionNotes?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType =
  | 'settlement_proof_submitted'
  | 'settlement_confirmed'
  | 'settlement_rejected'
  | 'blend_invite'
  | 'expense_added';

export interface InAppNotification {
  id: string;
  userId: string; // Recipient of notification
  blendId?: string;
  type: NotificationType;
  title: string;
  message: string;
  settlementId?: string;
  expenseId?: string;
  amountPaise?: number;
  actorId: string; // Who triggered it
  proofImageUrl?: string;
  isRead: boolean;
  isHandled: boolean;
  createdAt: string;
}

export interface SuggestedSettlement {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

export interface MemberBalanceSummary {
  memberId: string;
  totalPaidPaise: number;
  totalSharePaise: number;
  repaymentsSentPaise: number;
  repaymentsReceivedPaise: number;
  netBalancePaise: number; // Positive = gets money back, Negative = owes money
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'all';
export type NavigationTab = 'home' | 'activity' | 'balances' | 'group';
