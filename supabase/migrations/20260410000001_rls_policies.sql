-- ============================================================
-- RLS Policies for all public tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- SELECT: All authenticated users can read all profiles (needed for displaying names)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- LEADS
-- ============================================================

-- SELECT: Managers see all leads, reps see only their assigned leads
CREATE POLICY "leads_select_by_role"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    OR assigned_to = auth.uid()
  );

-- INSERT: Any authenticated user can create leads
CREATE POLICY "leads_insert_authenticated"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Managers can update any lead, reps can only update their assigned leads
CREATE POLICY "leads_update_by_role"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    OR assigned_to = auth.uid()
  );

-- DELETE: Managers only
CREATE POLICY "leads_delete_manager"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- SELECT: Users can only read their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT: Only service_role or trigger functions can insert
-- No policy for authenticated users — triggers run as SECURITY DEFINER
-- which bypasses RLS. Direct user inserts are blocked.

-- ============================================================
-- ACTIVITY_LOG
-- ============================================================

-- SELECT: Managers see all activity, reps see activity on their leads only
CREATE POLICY "activity_log_select_by_role"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
    OR EXISTS (SELECT 1 FROM leads WHERE leads.id = activity_log.lead_id AND leads.assigned_to = auth.uid())
  );

-- INSERT: Only triggers (SECURITY DEFINER functions) can insert
-- No policy for authenticated users — blocked by default
