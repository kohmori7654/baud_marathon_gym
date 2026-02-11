-- Fix infinite recursion in RLS policies

-- 1. Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update users policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users FOR ALL
    USING (is_admin());

-- 3. Update supporter_assignments policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON supporter_assignments;
CREATE POLICY "Admins can manage assignments" ON supporter_assignments FOR ALL
    USING (is_admin());

-- 4. Update questions policies
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
CREATE POLICY "Admins can manage questions" ON questions FOR ALL
    USING (is_admin());

-- 5. Update options policies
DROP POLICY IF EXISTS "Admins can manage options" ON options;
CREATE POLICY "Admins can manage options" ON options FOR ALL
    USING (is_admin());

-- 6. Update exam_sessions policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON exam_sessions;
CREATE POLICY "Admins can view all sessions" ON exam_sessions FOR SELECT
    USING (is_admin());

-- 7. Update session_answers policies
DROP POLICY IF EXISTS "Admins can view all answers" ON session_answers;
CREATE POLICY "Admins can view all answers" ON session_answers FOR SELECT
    USING (is_admin());
