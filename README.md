# Expenso

> *For when "bhai tu dede, baad mein hisaab karte hain" gets out of hand.*

A fast, mobile-first shared commute expense manager built for college friends and daily commuters. Expenso tracks shared autos, metros, cabs, and transit chai in 10 seconds, eliminates messy circular debts, and coordinates verified UPI repayments with screenshot evidence.

---

## Key Highlights

- **10-Second Commute Logging**: Rapid entry for autos, e-rickshaws, metro tokens, cab rides, and transit snacks.
- **Strict Payer Ownership**: Authenticated users can only record rides they paid for. No impersonation, enforced at database and UI levels.
- **Zero Circular Debts**: A greedy balance resolution engine collapses multiple overlapping rides into the minimum possible transfers.
- **Smart Repayment Guardrails**:
  - Only members who actually owe money see repayment options.
  - In a group of X, Y, Z, if X owes Z and Z alone, only Z is shown as a recipient. Y is completely hidden.
  - Pure lenders and settled users see a reassuring *"You don't owe anything!"* status.
- **Verified UPI Settlements**: Direct deep links to native mobile UPI apps (Google Pay, PhonePe, Paytm, BHIM) with strict payee locking, QR code scanning, and screenshot proof verification.
- **Dynamic Commute Spend Periods**: Default view displays **Today's** spend, with one-tap switches to *This Week*, *This Month*, or *All Time*.
- **Private Friend Blends**: Create custom commute groups using unique 6-character personal invite codes (e.g. `DIVY24`, `RAHUL9`).
- **Clean Vector UI**: Fully responsive, mobile-first design built with Tailwind CSS and Lucide vector icons with zero distracting emojis.

---

## 1. Core Architectural Pillars

### A. Individual User Accounts & Dynamic Group Size
- Every person has their own distinct identity, profile, and credentials.
- Works for any group size: 2, 3, 5, or more friends per **Expenso Blend**.
- Production-ready with Supabase Auth & PostgreSQL, paired with a multi-account sandbox mode for instant local testing without remote cloud dependencies.

### B. Unique Personal Invitation Codes
- Every registered user is assigned a unique **6-character uppercase alphanumeric code** (e.g. `DIVY24`, `RAHUL9`, `AMAN72`).
- Generated cryptographically using an unambiguous 30-character alphabet (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), preventing confusion between `0`/`O` and `1`/`I`.
- Friends enter each other's personal codes to connect and establish shared Blends.

### C. Personal Expense Ownership
- **Every expense must be created by the currently authenticated user.**
- The expense form locks the payer to the authenticated user with a verified badge.
- The backend strictly enforces this rule at the PostgreSQL schema level:
  ```sql
  CONSTRAINT chk_payer_is_creator CHECK (payer_id = created_by)
  ```
- Only the creator of an expense can edit or delete it.

### D. Verified Settlement Lifecycle & UPI Security
Settlements in Expenso follow a safe, verifiable 3-step lifecycle:
1. **Initiate & Deep Link**: Generates a standard `upi://pay` URI locked strictly to the recipient's verified UPI ID and name. Tapping **"Pay via UPI App"** opens the device's native app chooser on mobile (GPay, PhonePe, Paytm, BHIM).
2. **Screenshot Proof**: The debtor uploads a payment confirmation screenshot. The settlement status transitions to `proof_submitted` (debt is **not** cleared yet, preventing false settlement claims).
3. **Recipient Confirmation**: The creditor receives an in-app notification, reviews the screenshot proof, and taps **Received**. Only upon confirmation does the balance recalculate and clear.

---

## 2. Financial Calculation Engine (Integer Paise)

All monetary arithmetic is strictly computed in **integer paise** (`1 Rupee = 100 Paise`):
- **Deterministic Paise Remainder**: Distributes remainder paise deterministically so $\sum \text{shares} \equiv \text{amountPaise}$ always holds true.
- **Net Balance Formula**:
  $$\text{Net Balance} = (\text{Total Paid Out} + \text{Repayments Sent}) - (\text{Expense Shares Consumed} + \text{Repayments Received})$$
  - Positive ($+$): Member should receive money from the Blend (Lender).
  - Negative ($- $): Member owes money to the Blend (Debtor).
  - Net balances across any Blend **always sum to exactly ₹0**.
- **Greedy Settlement Optimization**: Greedily matches the largest debtor with the largest creditor to minimize total repayments needed.

---

## 3. Database Schema & Row-Level Security (`supabase/schema.sql`)

The repository includes a complete PostgreSQL migration file at `supabase/schema.sql`:
- `profiles`: user identities, initials, avatars, payment methods, and unique 6-character personal invite codes.
- `blends`: private friend commute groups.
- `blend_members`: membership table with compound unique constraint `(blend_id, user_id)`.
- `expenses`: commute expenses with foreign keys, category check, and `CHECK (payer_id = created_by)`.
- `expense_splits`: participant shares stored in integer paise.
- `settlements`: direct repayment records with proof URLs and status (`pending_payment`, `proof_submitted`, `confirmed`, `rejected`).
- **Row-Level Security (RLS)**:
  - Users only see Blends they belong to.
  - Users only create expenses where `auth.uid() = created_by AND auth.uid() = payer_id`.
  - Non-creators cannot update or delete expenses.
  - Realtime publication enabled for instant multi-device live sync.

---

## 4. Automated Test Suite (41 Tests Passing)

Run the full automated test suite anytime:
```powershell
npm test
```

### Test Results Summary: 41 passed (100%)

#### 1. Financial Calculations (`calculations.test.ts` — 9 tests)
- Equal splits without remainder
- Subset participant splits (e.g. ₹500 split between 2 members in a 3-person Blend)
- Deterministic paise rounding
- Dynamic balance recalculation on expense edit/delete
- Greedy settlement resolution

#### 2. Auto-Recalculation & Lifecycle (`balanceRecalculation.test.ts` — 11 tests)
- Recalculates net balances after partial repayments
- Preserves expense history and timestamps independently of settlements
- Clears suggested settlements once debts reach ₹0

#### 3. UPI Parsing, Deep Linking & Debtor Filtering (`upiAndSettlements.test.ts` — 8 tests)
- Validates and parses UPI VPA formats and `upi://pay` URIs
- Generates safe, URL-encoded UPI deep links with strict payee locking
- Unconfirmed settlements (`pending`, `proof_submitted`) do NOT clear debt until recipient confirms
- In a 3-person Blend (X, Y, Z), if X owes Z and Z alone, repayment recipient options show **only Z and exclude Y**
- Lenders who only lent money have zero debts and receive the *"You don't owe anything!"* empty state

#### 4. Security, Ownership & Blend Isolation (`securityAndOwnership.test.ts` — 13 tests)
- 6-character invite code generation and collision resistance
- Cloud & local multi-account code lookup and friend connection
- Rejection of forged expense creation requests
- Rejection of unauthorized expense/settlement edits or deletions
- Multi-Blend isolation and unauthorized access prevention

---

## 5. Project Structure

```
d:/Expenso/
├── supabase/
│   └── schema.sql               # PostgreSQL schema, constraints, RLS & Realtime
├── .env.example                 # Environment configuration template
├── package.json                 # Dependencies (React 19, Lucide, Tailwind, Supabase, Vitest)
├── tailwind.config.js           # Warm stone and forest green design tokens
├── vite.config.ts               # Vite & Vitest configuration
├── src/
│   ├── types/
│   │   └── index.ts             # UserProfile, Blend, Expense, Settlement types
│   ├── services/
│   │   ├── supabase.ts          # Supabase client initializer
│   │   ├── sandboxBackend.ts    # Simulated multi-account sandbox (offline / test mode)
│   │   ├── backendService.ts    # Unified backend repository interface
│   │   └── __tests__/
│   │       └── securityAndOwnership.test.ts # Security and ownership tests
│   ├── utils/
│   │   ├── inviteCodes.ts       # 6-character code generator & validator
│   │   ├── calculations.ts      # Pure math engine (paise shares, balances, greedy settlements)
│   │   ├── currency.ts          # INR currency formatting and paise conversion
│   │   ├── dates.ts             # Indian local time and period filters (Today, Week, Month)
│   │   ├── transport.ts         # Transport mode configurations
│   │   ├── upi.ts               # UPI URI generator, QR decoder, and VPA validator
│   │   └── __tests__/
│   │       ├── calculations.test.ts         # Financial engine unit tests
│   │       ├── balanceRecalculation.test.ts # Auto-recalculation & settlement tests
│   │       └── upiAndSettlements.test.ts    # UPI deep links and debtor filtering tests
│   ├── context/
│   │   └── AppContext.tsx       # Global state management, active Blend, and accounts
│   └── components/
│       ├── layout/
│       │   └── AppShell.tsx     # Responsive shell with Blend switcher and notifications
│       ├── dashboard/
│       │   └── HomeDashboard.tsx# Net balance hero, period commute spend, and quick invite
│       ├── common/
│       │   └── TransportIcon.tsx# Clean vector Lucide icons for transit modes
│       ├── forms/
│       │   ├── AddExpenseModal.tsx       # Fast entry with immutable authenticated payer
│       │   ├── EditExpenseModal.tsx      # Creator-only edit modal
│       │   ├── BlendModal.tsx            # Blend switcher, create blend, join via code
│       │   └── RecordSettlementModal.tsx # Repayment modal with creditor-only filtering
│       ├── settlements/
│       │   ├── SettlementFlowModal.tsx   # UPI deep link, QR details, and proof upload
│       │   └── ProofReviewModal.tsx      # Creditor confirmation & rejection workflow
│       ├── notifications/
│       │   └── NotificationDrawer.tsx    # Slide-over notification panel
│       ├── settings/
│       │   └── PaymentSettingsModal.tsx  # User UPI ID & QR code verification
│       ├── activity/
│       │   ├── ActivityView.tsx          # Chronological log with rides + repayments
│       │   ├── ExpenseItem.tsx           # Ride card
│       │   └── RepaymentItem.tsx         # Repayment card
│       └── balances/
│           └── BalancesView.tsx          # Suggested settlements and individual balances
```

---

## 6. How to Run Locally

### 1. Install & Start Dev Server
```powershell
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### 2. Testing Multi-User Flows Locally
- Open the user menu in the top navigation to access the **Account Switcher**.
- Switch between demo accounts or create your own with a name and email.
- Copy your 6-character code and connect from another account to form a Blend.
- Add an expense: observe that the payer is locked to your account.
- Switch users to test balance calculations, creditor-only repayment filtering, and screenshot proof confirmation.

### 3. Connecting to Supabase Cloud
1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. In `d:\Expenso`, create a `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart the dev server. Expenso will automatically sync with live Supabase cloud storage.

---

## 7. License

MIT
