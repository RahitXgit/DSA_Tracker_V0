-- ============================================
-- Daily Plans Table Migration
-- Creates table with RLS policies for user isolation
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: daily_plans
-- Stores user's daily DSA problem plans
-- ============================================

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Problem Details
  problem_title TEXT NOT NULL,
  topic TEXT NOT NULL,
  platform TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) NOT NULL,
  
  -- Status Tracking
  status TEXT CHECK (status IN ('PLANNED', 'DONE', 'SKIPPED')) DEFAULT 'PLANNED' NOT NULL,
  planned_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Index on user_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id ON daily_plans(user_id);

-- Index on planned_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_daily_plans_planned_date ON daily_plans(planned_date);

-- Composite index for user + date queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, planned_date);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_daily_plans_status ON daily_plans(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on daily_plans
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own plans" ON daily_plans;
DROP POLICY IF EXISTS "Users can insert their own plans" ON daily_plans;
DROP POLICY IF EXISTS "Users can update their own plans" ON daily_plans;
DROP POLICY IF EXISTS "Users can delete their own plans" ON daily_plans;

-- SELECT: Users can only view their own plans
CREATE POLICY "Users can view their own plans"
ON daily_plans
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can only insert plans for themselves
CREATE POLICY "Users can insert their own plans"
ON daily_plans
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own plans
CREATE POLICY "Users can update their own plans"
ON daily_plans
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own plans
CREATE POLICY "Users can delete their own plans"
ON daily_plans
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================

-- Reuse existing function or create if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to daily_plans
DROP TRIGGER IF EXISTS update_daily_plans_updated_at ON daily_plans;
CREATE TRIGGER update_daily_plans_updated_at
  BEFORE UPDATE ON daily_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS: Documentation
-- ============================================

COMMENT ON TABLE daily_plans IS 'User daily DSA problem planning and tracking';
COMMENT ON COLUMN daily_plans.user_id IS 'References custom users table (not auth.users)';
COMMENT ON COLUMN daily_plans.planned_date IS 'Date when user plans to solve the problem';
COMMENT ON COLUMN daily_plans.completed_at IS 'Timestamp when problem was marked as done';
COMMENT ON COLUMN daily_plans.status IS 'PLANNED (pending), DONE (completed), or SKIPPED (moved to next day)';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if table was created with RLS enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'daily_plans';

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies 
WHERE tablename = 'daily_plans'
ORDER BY policyname;
