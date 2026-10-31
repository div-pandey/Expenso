-- ==============================================================================
-- EXPENSO — Complete Production Database Schema & Policies
-- Supabase PostgreSQL 15+ compatible
-- Run this in your Supabase Dashboard > SQL Editor > Click "Run"
-- ==============================================================================

-- 1. Clean Slate (Drops existing tables safely)
DROP TABLE IF EXISTS public.in_app_notifications CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.expense_splits CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.blend_members CASCADE;
DROP TABLE IF EXISTS public.blends CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Flexible TEXT primary key for client, demo, & auth UUIDs)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT 'bg-emerald-600 text-white',
  invite_code VARCHAR(6) NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_profiles_invite_code ON public.profiles(invite_code);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 2. BLENDS TABLE (Private groups of friends with unique 6-character blend_code)
-- ------------------------------------------------------------------------------
CREATE TABLE public.blends (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blend_code VARCHAR(6) NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_blends_blend_code ON public.blends(blend_code);
CREATE INDEX idx_blends_created_by ON public.blends(created_by);

-- ------------------------------------------------------------------------------
-- 3. BLEND_MEMBERS TABLE (Members in each blend)
-- ------------------------------------------------------------------------------
CREATE TABLE public.blend_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  blend_id TEXT NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(blend_id, user_id)
);

CREATE INDEX idx_blend_members_blend ON public.blend_members(blend_id);
CREATE INDEX idx_blend_members_user ON public.blend_members(user_id);

-- ------------------------------------------------------------------------------
-- 4. EXPENSES TABLE (Payer immutability strictly enforced)
-- ------------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  blend_id TEXT NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  category TEXT NOT NULL CHECK (category IN ('auto', 'erickshaw', 'metro', 'cab', 'bus', 'other')),
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_payer_is_creator CHECK (payer_id = created_by)
);

CREATE INDEX idx_expenses_blend_id ON public.expenses(blend_id);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expenses_date ON public.expenses(date DESC);

-- ------------------------------------------------------------------------------
-- 5. EXPENSE_SPLITS TABLE (Participant shares in integer paise)
-- ------------------------------------------------------------------------------
CREATE TABLE public.expense_splits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  expense_id TEXT NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_paise BIGINT NOT NULL CHECK (share_paise > 0),
  UNIQUE(expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON public.expense_splits(user_id);

-- ------------------------------------------------------------------------------
-- 6. SETTLEMENTS TABLE (Repayment lifecycle with verification)
-- ------------------------------------------------------------------------------
CREATE TABLE public.settlements (
  id TEXT PRIMARY KEY,
  blend_id TEXT NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending_payment', 'proof_submitted', 'confirmed', 'rejected', 'cancelled')),
  proof_image_url TEXT,
  decision_notes TEXT,
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_different_settlement_users CHECK (from_user_id <> to_user_id),
  CONSTRAINT chk_sender_is_creator CHECK (from_user_id = created_by)
);

CREATE INDEX idx_settlements_blend ON public.settlements(blend_id);
CREATE INDEX idx_settlements_date ON public.settlements(date DESC);

-- ------------------------------------------------------------------------------
-- 7. PAYMENT_METHODS TABLE (Verified UPI destination)
-- ------------------------------------------------------------------------------
CREATE TABLE public.payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  payee_name TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  qr_payload TEXT,
  qr_image_url TEXT,
  qr_format_verified BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_payment_methods_user ON public.payment_methods(user_id);

-- ------------------------------------------------------------------------------
-- 8. IN_APP_NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.in_app_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blend_id TEXT REFERENCES public.blends(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('settlement_proof_submitted', 'settlement_confirmed', 'settlement_rejected', 'blend_invite')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  settlement_id TEXT REFERENCES public.settlements(id) ON DELETE SET NULL,
  amount_paise BIGINT,
  actor_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_notifications_user ON public.in_app_notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.in_app_notifications(user_id, is_read);

-- ------------------------------------------------------------------------------
-- 9. SEED INITIAL DEMO DATA (Divyansh, Rahul, Aman, & Campus Crew blend)
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, initials, avatar_color, invite_code) VALUES
  ('user_you', 'divyansh@campus.edu', 'Divyansh Pandey', 'DP', 'bg-emerald-600 text-white', 'EXP999'),
  ('user_rahul', 'rahul@campus.edu', 'Rahul Verma', 'RV', 'bg-amber-600 text-white', 'RAHUL1'),
  ('user_aman', 'aman@campus.edu', 'Aman Sharma', 'AS', 'bg-sky-600 text-white', 'AMAN88')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.blends (id, name, blend_code, created_by) VALUES
  ('blend_college_crew', 'Daily Campus Commute', 'CREW99', 'user_you')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.blend_members (blend_id, user_id, role) VALUES
  ('blend_college_crew', 'user_you', 'admin'),
  ('blend_college_crew', 'user_rahul', 'member'),
  ('blend_college_crew', 'user_aman', 'member')
ON CONFLICT (blend_id, user_id) DO NOTHING;

INSERT INTO public.payment_methods (user_id, payee_name, upi_id) VALUES
  ('user_you', 'Divyansh Pandey', 'divyansh@okaxis'),
  ('user_rahul', 'Rahul Verma', 'rahul@upi'),
  ('user_aman', 'Aman Sharma', 'aman@okaxis')
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. ROW-LEVEL SECURITY (RLS) POLICIES
-- Full read/write access for anonymous & authenticated users across all devices
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blend_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

-- Blends
CREATE POLICY "blends_select_policy" ON public.blends FOR SELECT USING (true);
CREATE POLICY "blends_insert_policy" ON public.blends FOR INSERT WITH CHECK (true);
CREATE POLICY "blends_update_policy" ON public.blends FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "blends_delete_policy" ON public.blends FOR DELETE USING (true);

-- Blend Members
CREATE POLICY "blend_members_select_policy" ON public.blend_members FOR SELECT USING (true);
CREATE POLICY "blend_members_insert_policy" ON public.blend_members FOR INSERT WITH CHECK (true);
CREATE POLICY "blend_members_update_policy" ON public.blend_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "blend_members_delete_policy" ON public.blend_members FOR DELETE USING (true);

-- Expenses
CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert_policy" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update_policy" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete_policy" ON public.expenses FOR DELETE USING (true);

-- Expense Splits
CREATE POLICY "expense_splits_select_policy" ON public.expense_splits FOR SELECT USING (true);
CREATE POLICY "expense_splits_insert_policy" ON public.expense_splits FOR INSERT WITH CHECK (true);
CREATE POLICY "expense_splits_update_policy" ON public.expense_splits FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "expense_splits_delete_policy" ON public.expense_splits FOR DELETE USING (true);

-- Settlements
CREATE POLICY "settlements_select_policy" ON public.settlements FOR SELECT USING (true);
CREATE POLICY "settlements_insert_policy" ON public.settlements FOR INSERT WITH CHECK (true);
CREATE POLICY "settlements_update_policy" ON public.settlements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "settlements_delete_policy" ON public.settlements FOR DELETE USING (true);

-- Payment Methods
CREATE POLICY "payment_methods_select_policy" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "payment_methods_insert_policy" ON public.payment_methods FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_methods_update_policy" ON public.payment_methods FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "payment_methods_delete_policy" ON public.payment_methods FOR DELETE USING (true);

-- Notifications
CREATE POLICY "notifications_select_policy" ON public.in_app_notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert_policy" ON public.in_app_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_policy" ON public.in_app_notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notifications_delete_policy" ON public.in_app_notifications FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 11. SUPABASE REALTIME CONFIGURATION
-- Broadcast live changes to all connected peers
-- ------------------------------------------------------------------------------
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.profiles,
  public.blends,
  public.blend_members,
  public.expenses,
  public.expense_splits,
  public.settlements,
  public.payment_methods,
  public.in_app_notifications;
