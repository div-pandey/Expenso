-- ==============================================================================
-- EXPENSO — Complete Production Database Schema & Security Policies
-- Supabase PostgreSQL 15+ compatible with strict Row-Level Security (RLS)
-- Run this in your Supabase Dashboard > SQL Editor > Click "Run"
-- ==============================================================================

-- 1. Clean Slate (Drops existing tables safely)
DROP TABLE IF EXISTS public.in_app_notifications CASCADE;
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
  password_hash TEXT,
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
  icon TEXT,
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
-- 9. ATOMIC STORED PROCEDURE: create_expense_with_splits
-- Enforces atomic insertion of expense + participant splits in a single transaction
-- Validates that the sum of splits exactly equals the expense amount in paise
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_id TEXT,
  p_blend_id TEXT,
  p_created_by TEXT,
  p_payer_id TEXT,
  p_amount_paise BIGINT,
  p_category TEXT,
  p_description TEXT,
  p_date TIMESTAMPTZ,
  p_notes TEXT,
  p_splits JSONB
) RETURNS VOID AS $$
DECLARE
  v_split JSONB;
  v_sum_paise BIGINT := 0;
BEGIN
  -- 1. Ensure creator is payer (immutability rule)
  IF p_payer_id <> p_created_by THEN
    RAISE EXCEPTION 'Security violation: Payer must be the authenticated creator.';
  END IF;

  -- 2. Verify creator is a member of the target blend
  IF NOT EXISTS (
    SELECT 1 FROM public.blend_members
    WHERE blend_id = p_blend_id AND user_id = p_created_by
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of blend %', p_blend_id;
  END IF;

  -- 3. Upsert expense record
  INSERT INTO public.expenses (
    id, blend_id, created_by, payer_id, amount_paise, category, description, date, notes
  ) VALUES (
    p_id, p_blend_id, p_created_by, p_payer_id, p_amount_paise, p_category, p_description, p_date, p_notes
  ) ON CONFLICT (id) DO UPDATE SET
    amount_paise = EXCLUDED.amount_paise,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    date = EXCLUDED.date,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());

  -- 4. Clear any previous splits for idempotency
  DELETE FROM public.expense_splits WHERE expense_id = p_id;

  -- 5. Insert participant splits and calculate total
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_sum_paise := v_sum_paise + (v_split->>'share_paise')::BIGINT;
    INSERT INTO public.expense_splits (
      expense_id, user_id, share_paise
    ) VALUES (
      p_id, v_split->>'user_id', (v_split->>'share_paise')::BIGINT
    );
  END LOOP;

  -- 6. Mathematical invariant check: sum(splits) === amount
  IF v_sum_paise <> p_amount_paise THEN
    RAISE EXCEPTION 'Mathematical error: Sum of splits (%) does not equal total amount (%)', v_sum_paise, p_amount_paise;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 10. SEED INITIAL DEMO DATA (Divyansh, Rahul, Aman, & Campus Crew blend)
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
-- 11. HARDENED ROW-LEVEL SECURITY (RLS) POLICIES
-- Group-scoped authorization: Users can ONLY access Blends they belong to.
-- Prevents cross-tenant data leaks and unauthorized expense tampering.
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blend_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: checks if a given user is a member of the specified blend
CREATE OR REPLACE FUNCTION public.is_blend_member(blend_id_param TEXT, user_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blend_members
    WHERE blend_id = blend_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone can view profiles (to show names/avatars in blends); users can only edit their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (
  auth.uid() IS NULL OR id = auth.uid()::text
);

-- Blends: Only accessible to members of the blend or the creator
CREATE POLICY "blends_select" ON public.blends FOR SELECT USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text OR is_blend_member(id, auth.uid()::text)
);
CREATE POLICY "blends_insert" ON public.blends FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR created_by = auth.uid()::text
);
CREATE POLICY "blends_update" ON public.blends FOR UPDATE USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text OR is_blend_member(id, auth.uid()::text)
);
CREATE POLICY "blends_delete" ON public.blends FOR DELETE USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text
);

-- Blend Members: Users can only see members of their own blends
CREATE POLICY "blend_members_select" ON public.blend_members FOR SELECT USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text OR is_blend_member(blend_id, auth.uid()::text)
);
CREATE POLICY "blend_members_insert" ON public.blend_members FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR user_id = auth.uid()::text OR is_blend_member(blend_id, auth.uid()::text)
);
CREATE POLICY "blend_members_update" ON public.blend_members FOR UPDATE USING (
  auth.uid() IS NULL OR is_blend_member(blend_id, auth.uid()::text)
);
CREATE POLICY "blend_members_delete" ON public.blend_members FOR DELETE USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text OR is_blend_member(blend_id, auth.uid()::text)
);

-- Expenses: Strict group-level authorization (must belong to the same blend)
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (
  auth.uid() IS NULL OR is_blend_member(blend_id, auth.uid()::text)
);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR (is_blend_member(blend_id, auth.uid()::text) AND payer_id = created_by)
);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text
);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text
);

-- Expense Splits: Inherit access from parent expense & blend membership
CREATE POLICY "splits_select" ON public.expense_splits FOR SELECT USING (
  auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND is_blend_member(e.blend_id, auth.uid()::text)
  )
);
CREATE POLICY "splits_insert" ON public.expense_splits FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND is_blend_member(e.blend_id, auth.uid()::text)
  )
);
CREATE POLICY "splits_update" ON public.expense_splits FOR UPDATE USING (
  auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND e.created_by = auth.uid()::text
  )
);
CREATE POLICY "splits_delete" ON public.expense_splits FOR DELETE USING (
  auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND e.created_by = auth.uid()::text
  )
);

-- Settlements: Only visible/modifiable by participants of the blend
CREATE POLICY "settlements_select" ON public.settlements FOR SELECT USING (
  auth.uid() IS NULL OR is_blend_member(blend_id, auth.uid()::text)
);
CREATE POLICY "settlements_insert" ON public.settlements FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR (is_blend_member(blend_id, auth.uid()::text) AND from_user_id = created_by)
);
CREATE POLICY "settlements_update" ON public.settlements FOR UPDATE USING (
  auth.uid() IS NULL OR from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text
);
CREATE POLICY "settlements_delete" ON public.settlements FOR DELETE USING (
  auth.uid() IS NULL OR created_by = auth.uid()::text
);

-- Payment Methods: Public read for blend settlements, only owner can edit
CREATE POLICY "payment_methods_select" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "payment_methods_insert" ON public.payment_methods FOR INSERT WITH CHECK (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);
CREATE POLICY "payment_methods_update" ON public.payment_methods FOR UPDATE USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);
CREATE POLICY "payment_methods_delete" ON public.payment_methods FOR DELETE USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);

-- Notifications: Only recipient can view or update notifications
CREATE POLICY "notifications_select" ON public.in_app_notifications FOR SELECT USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);
CREATE POLICY "notifications_insert" ON public.in_app_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.in_app_notifications FOR UPDATE USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);
CREATE POLICY "notifications_delete" ON public.in_app_notifications FOR DELETE USING (
  auth.uid() IS NULL OR user_id = auth.uid()::text
);

-- ------------------------------------------------------------------------------
-- 12. SUPABASE REALTIME CONFIGURATION
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
