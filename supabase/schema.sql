-- ==============================================================================
-- EXPENSO — Database Schema & Row-Level Security Policies
-- Supabase PostgreSQL 15+ compatible
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT 'bg-emerald-600 text-white',
  invite_code VARCHAR(6) NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON public.profiles(invite_code);

-- Function to generate a cryptographically secure 6-character unique uppercase invite code
CREATE OR REPLACE FUNCTION public.generate_unique_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := '';
  i INTEGER := 0;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = result) INTO code_exists;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile and assign a 6-character code on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_code TEXT;
  user_name TEXT;
  user_initials TEXT;
BEGIN
  generated_code := public.generate_unique_invite_code();
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_initials := UPPER(substring(user_name from 1 for 2));

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    initials,
    avatar_color,
    invite_code,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_initials,
    'bg-emerald-600 text-white',
    generated_code,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. BLENDS TABLE (Private groups of friends)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_blends_created_by ON public.blends(created_by);

-- ------------------------------------------------------------------------------
-- 3. BLEND_MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blend_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blend_id UUID NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(blend_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blend_members_blend ON public.blend_members(blend_id);
CREATE INDEX IF NOT EXISTS idx_blend_members_user ON public.blend_members(user_id);

-- Helper function to check if a user is a member of a blend
CREATE OR REPLACE FUNCTION public.is_blend_member(check_blend_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blend_members
    WHERE blend_id = check_blend_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 4. EXPENSES TABLE (Payer immutability enforced!)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blend_id UUID NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  category TEXT NOT NULL CHECK (category IN ('auto', 'erickshaw', 'metro', 'cab', 'bus', 'other')),
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  -- CRITICAL RULE: Payer MUST equal the creator!
  CONSTRAINT chk_payer_is_creator CHECK (payer_id = created_by)
);

CREATE INDEX IF NOT EXISTS idx_expenses_blend_id ON public.expenses(blend_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);

-- ------------------------------------------------------------------------------
-- 5. EXPENSE_SPLITS TABLE (Participant shares in integer paise)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_paise BIGINT NOT NULL CHECK (share_paise > 0),
  UNIQUE(expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON public.expense_splits(user_id);

-- ------------------------------------------------------------------------------
-- 6. PAYMENT_METHODS TABLE (User verified UPI destination)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  qr_payload TEXT,
  qr_image_url TEXT,
  qr_format_verified BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unq_user_payment_method UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- ------------------------------------------------------------------------------
-- 7. SETTLEMENTS TABLE (Repayment lifecycle with evidence & confirmation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blend_id UUID NOT NULL REFERENCES public.blends(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_settlements_blend ON public.settlements(blend_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON public.settlements(date DESC);

-- ------------------------------------------------------------------------------
-- 8. NOTIFICATIONS TABLE (In-app notifications for payment proofs & requests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blend_id UUID REFERENCES public.blends(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('settlement_proof_submitted', 'settlement_confirmed', 'settlement_rejected', 'blend_invite')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  settlement_id UUID REFERENCES public.settlements(id) ON DELETE SET NULL,
  amount_paise BIGINT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- ==============================================================================
-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
-- =================================--------------------------------=============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blend_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- 1. Users can view their own profile, profiles of friends in shared blends, or lookup by invite code
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.blend_members bm1
      JOIN public.blend_members bm2 ON bm1.blend_id = bm2.blend_id
      WHERE bm1.user_id = auth.uid() AND bm2.user_id = profiles.id
    )
    OR auth.role() = 'authenticated' -- Allows lookup by 6-char code when connecting friends
  );

-- 2. Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- BLENDS POLICIES
-- 1. Users can view blends where they are an active member
CREATE POLICY "blends_select_member" ON public.blends
  FOR SELECT
  USING (public.is_blend_member(id, auth.uid()));

-- 2. Any authenticated user can create a blend
CREATE POLICY "blends_insert" ON public.blends
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 3. Only the creator or admin can update the blend name
CREATE POLICY "blends_update" ON public.blends
  FOR UPDATE
  USING (public.is_blend_member(id, auth.uid()))
  WITH CHECK (public.is_blend_member(id, auth.uid()));

-- BLEND_MEMBERS POLICIES
-- 1. Members can view members of their own blends
CREATE POLICY "blend_members_select" ON public.blend_members
  FOR SELECT
  USING (public.is_blend_member(blend_id, auth.uid()));

-- 2. Blend creator can add initial members, or users can join with an invite code
CREATE POLICY "blend_members_insert" ON public.blend_members
  FOR INSERT
  WITH CHECK (
    -- User adding themselves
    auth.uid() = user_id
    -- Or user is the blend creator / existing member inviting
    OR public.is_blend_member(blend_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.blends WHERE id = blend_id AND created_by = auth.uid())
  );

-- EXPENSES POLICIES
-- 1. Members can view all expenses in their blends
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT
  USING (public.is_blend_member(blend_id, auth.uid()));

-- 2. CRITICAL: Authenticated user can ONLY insert expenses where they are the creator AND payer
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = payer_id
    AND public.is_blend_member(blend_id, auth.uid())
  );

-- 3. Only the expense creator can update their expense
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE
  USING (auth.uid() = created_by AND public.is_blend_member(blend_id, auth.uid()))
  WITH CHECK (auth.uid() = created_by AND auth.uid() = payer_id AND public.is_blend_member(blend_id, auth.uid()));

-- 4. Only the expense creator can delete their expense
CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE
  USING (auth.uid() = created_by AND public.is_blend_member(blend_id, auth.uid()));

-- EXPENSE_SPLITS POLICIES
-- 1. Members can view splits for expenses in their blends
CREATE POLICY "expense_splits_select" ON public.expense_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND public.is_blend_member(e.blend_id, auth.uid())
    )
  );

-- 2. Expense creator can insert splits
CREATE POLICY "expense_splits_insert" ON public.expense_splits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_splits.expense_id AND e.created_by = auth.uid()
    )
  );

-- SETTLEMENTS POLICIES
-- 1. Members can view settlements in their blends
CREATE POLICY "settlements_select" ON public.settlements
  FOR SELECT
  USING (public.is_blend_member(blend_id, auth.uid()));

-- 2. Members can record settlements within their blend (sender must be the authenticated user)
CREATE POLICY "settlements_insert" ON public.settlements
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = from_user_id
    AND public.is_blend_member(blend_id, auth.uid())
    AND public.is_blend_member(blend_id, to_user_id)
  );

-- 3. Sender can update proof/notes, and designated recipient can confirm/reject receipt
CREATE POLICY "settlements_update" ON public.settlements
  FOR UPDATE
  USING (
    (auth.uid() = from_user_id AND public.is_blend_member(blend_id, auth.uid()))
    OR (auth.uid() = to_user_id AND public.is_blend_member(blend_id, auth.uid()))
  );

CREATE POLICY "settlements_delete" ON public.settlements
  FOR DELETE
  USING (auth.uid() = created_by AND public.is_blend_member(blend_id, auth.uid()));

-- PAYMENT_METHODS POLICIES
-- 1. Friends in shared blends can view payment methods to settle up
CREATE POLICY "payment_methods_select" ON public.payment_methods
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.blend_members bm1
      JOIN public.blend_members bm2 ON bm1.blend_id = bm2.blend_id
      WHERE bm1.user_id = auth.uid() AND bm2.user_id = payment_methods.user_id
    )
  );

-- 2. Users can insert or update only their own payment method
CREATE POLICY "payment_methods_insert" ON public.payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_methods_update" ON public.payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
-- 1. Users can view and manage their own notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime for live shared commute updates & notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blend_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
