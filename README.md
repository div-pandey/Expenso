# Expenso

> *For when "bhai tu dede, baad mein hisaab karte hain" gets out of hand.*

A fast, cross-platform shared commute expense manager built for college friends and daily commuters. Expenso tracks shared autos, metros, cabs, and transit chai in 10 seconds, eliminates messy circular debts with integer paise math, coordinates verified UPI repayments backed by Google Gemini AI vision, and exports reports to CSV in one click.

Available across **Web**, **Android (.apk)**, and **Windows Desktop (.exe)**.

---

## 🚀 Key Highlights & Cross-Platform Suite

- **Cross-Platform Availability**:
  - **Instant Web App**: Runs directly in modern browsers (Chrome, Edge, Safari, Firefox) with 100% offline sandbox support or live Supabase cloud sync.
  - **Android Native App (`expenso.apk`, 5.3 MB)**: Standalone native APK packaged with Capacitor, native touch responsiveness, offline asset caching, and direct UPI intent switching (Google Pay, PhonePe, Paytm, BHIM).
  - **Windows Desktop App (`Expenso-Setup.exe`, 1.9 MB & `Expenso.exe`, 1.1 MB)**: High-DPI Windows application built with C# and embedded Microsoft WebView2, featuring system tray integration, zero browser chrome, and isolated storage.
- **Google Gemini AI Payment Proof Verification**:
  - Automatically inspects uploaded UPI payment confirmation screenshots using Gemini Vision AI.
  - Detects and cross-checks the bank UTR / transaction ID, payee name, and transferred amount in paise before recipient approval.
- **10-Second Commute Logging**: Rapid entry for autos, e-rickshaws, metro tokens, cab rides, and transit snacks with immutable authenticated payer locking.
- **One-Tap CSV Export**: Export all filtered transit rides, repayments, split shares, and notes into clean spreadsheets for hostel accounting and student budgeting.
- **Desktop Power Features**:
  - **Clipboard Paste (`Ctrl+V`)**: Paste payment confirmation screenshots directly into the settlement modal from the Windows Snipping Tool or WhatsApp.
  - **Keyboard Shortcuts**: `Ctrl+N` (New Ride), `Ctrl+S` (Settle Up), `Ctrl+B` (Blend Switcher), `Ctrl+1..4` (Tab Navigation), `F1` / `Ctrl+/` (Shortcuts Cheat Sheet).
  - **System Tray Icon**: Quick actions right from the Windows taskbar.
- **Zero Circular Debts**: A greedy balance resolution engine collapses multiple overlapping rides into the minimum possible transfers.
- **Smart Repayment Guardrails**:
  - Only members who actually owe money see repayment options.
  - In a group of X, Y, Z, if X owes Z and Z alone, only Z is shown as a recipient. Y is completely hidden.
  - Pure lenders and settled users see a reassuring *"You don't owe anything!"* status.
- **Dynamic Commute Spend Periods**: Default view displays **Today's** spend, with one-tap switches to *This Week*, *This Month*, or *All Time*.
- **Private Friend Blends**: Create custom commute groups using unique 6-character personal invite codes (e.g. `DIVY24`, `RAHUL9`).
- **Real-Time Notification System**: Push alerts and in-app notifications whenever friends add you to a ride expense with your split share or submit a settlement proof.
- **60-Day Auth Session Memory**: Secure persistent login token that automatically refreshes every 24 hours without storing plaintext passwords.

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

### D. Verified Settlement Lifecycle & Gemini AI Review
Settlements in Expenso follow a safe, verifiable 4-step lifecycle:
1. **Initiate & Deep Link**: Generates a standard `upi://pay` URI locked strictly to the recipient's verified UPI ID and name. Tapping **"Pay via UPI App"** opens the device's native app chooser on mobile (GPay, PhonePe, Paytm, BHIM).
2. **Screenshot Proof**: The debtor uploads a payment confirmation screenshot via file browser, drag-and-drop, or `Ctrl+V` clipboard paste. The settlement status transitions to `proof_submitted` (debt is **not** cleared yet, preventing false settlement claims).
3. **Gemini AI Vision Analysis**: Google Gemini AI inspects the screenshot to detect payee name, transferred amount, and UPI UTR reference number.
4. **Recipient Confirmation**: The creditor receives an in-app notification, reviews the AI checklist and screenshot proof, and taps **Received**. Only upon confirmation does the balance recalculate and clear.

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
- `in_app_notifications`: real-time alert delivery table for member splits and proof submissions.
- **Row-Level Security (RLS)**:
  - Users only see Blends they belong to.
  - Users only create expenses where `auth.uid() = created_by AND auth.uid() = payer_id`.
  - Non-creators cannot update or delete expenses.
  - Realtime publication enabled for instant multi-device live sync.

---

## 4. Automated Test Suite (67 Tests Passing)

Run the full automated test suite anytime:
```powershell
npm test
```

### Test Coverage Summary: 67 passed (100%)
- **`calculations.test.ts` (9 tests)**: Equal splits, subset participant splits, deterministic paise rounding, greedy settlement resolution.
- **`balanceRecalculation.test.ts` (11 tests)**: Dynamic balance recalculation on ride edits/deletes, partial repayments, settlement clearance.
- **`upiAndSettlements.test.ts` (10 tests)**: UPI URI generation, VPA validation, creditor-only recipient filtering, proof verification lifecycle.
- **`geminiPaymentVerifier.test.ts` (7 tests)**: AI payment proof checklist, UTR detection, amount verification, error handling.
- **`authSession.test.ts` (4 tests)**: 60-day auth token memory, 24-hour token rotation, password exclusion in storage.
- **`notificationScenarios.test.ts` (3 tests)**: Split share notification delivery to participants (excluding payer), selective group notifications.
- **`securityAndOwnership.test.ts` (23 tests)**: 6-character code generation/lookup, payer ownership enforcement, unauthorized edit/delete rejection, blend isolation.

---

## 5. Download & Run Apps

### A. Run Web App Locally
```powershell
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### B. Download Standalone Installers
Binaries are stored in `public/downloads/`:
- **Android App (.apk)**: `public/downloads/expenso.apk` (5.3 MB)
- **Windows Setup Wizard (.exe)**: `public/downloads/Expenso-Setup.exe` (1.9 MB)
- **Windows Portable (.exe)**: `public/downloads/Expenso.exe` (1.1 MB)

---

## 6. Project Structure

```
d:/Projects/Expenso/Expenso Website/
├── public/
│   ├── downloads/
│   │   ├── expenso.apk          # Native Android APK binary
│   │   ├── Expenso-Setup.exe    # Windows Setup Installer wizard
│   │   └── Expenso.exe          # Standalone portable Windows executable
│   └── gallery/                 # High-resolution screenshot showcase assets
├── src/
│   ├── types/
│   │   ├── index.ts             # UserProfile, Blend, Expense, Settlement, Notification types
│   │   └── desktop.d.ts         # Desktop API definitions
│   ├── services/
│   │   ├── backendService.ts    # Unified repository interface (Supabase + Sandbox)
│   │   ├── sandboxBackend.ts    # Simulated multi-account sandbox (offline mode)
│   │   ├── geminiPaymentVerifier.ts # Google Gemini AI Vision verification
│   │   ├── deviceNotificationService.ts # Device Web & Native notifications
│   │   ├── upiPaymentService.ts # UPI deep links and automated resolver
│   │   └── supabase.ts          # Supabase client initializer
│   ├── utils/
│   │   ├── authSession.ts       # 60-day session token & login history
│   │   ├── calculations.ts      # Pure math engine (paise shares, balances, greedy settlements)
│   │   ├── currency.ts          # INR currency formatting and paise conversion
│   │   ├── dates.ts             # Indian local time and period filters
│   │   ├── inviteCodes.ts       # 6-character code generator & validator
│   │   └── upi.ts               # UPI URI generator, QR decoder, and VPA validator
│   ├── context/
│   │   └── AppContext.tsx       # Global state management, notifications, and auth sessions
│   └── components/
│       ├── public/
│       │   └── LandingPage.tsx  # Product showcase, download center & commute simulator
│       ├── activity/
│       │   ├── ActivityView.tsx # Chronological log with CSV Export button
│       │   └── ExpenseDetailsModal.tsx # Ride breakdown modal
│       ├── desktop/
│       │   └── DesktopShortcutsModal.tsx # Keyboard shortcuts cheat sheet
│       ├── settlements/
│       │   ├── SettlementFlowModal.tsx # Ctrl+V paste, drag-and-drop proof, UPI launcher
│       │   └── ProofReviewModal.tsx # Gemini AI inspection & creditor approval
│       ├── onboarding/
│       │   ├── OnboardingModal.tsx # 4-step progressive onboarding with UPI setup
│       │   └── MobileWelcomePage.tsx # OAuth & Email welcome screen
│       └── notifications/
│           ├── NotificationDrawer.tsx # Real-time notification drawer with split shares
│           └── NotificationPermissionModal.tsx # Device notification permission prompt
```

---

## 7. License

MIT
