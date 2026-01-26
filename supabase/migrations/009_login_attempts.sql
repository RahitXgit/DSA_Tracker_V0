-- ============================================
-- Login Attempts Tracking Table
-- For rate limiting and security monitoring
-- ============================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Create indexes for faster queries
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempted_at);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view login attempts"
ON login_attempts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND email = 'rahitdhara.main@gmail.com'
    )
);

-- System can insert login attempts (no RLS needed for inserts from API)
CREATE POLICY "Allow system to insert login attempts"
ON login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================
-- Cleanup old login attempts (keep last 90 days)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM login_attempts
    WHERE attempted_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % old login attempts', v_deleted;
    
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists (to change return type)
DROP FUNCTION IF EXISTS cleanup_expired_tokens();

-- Recreate cleanup function with updated return type
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE (
    deleted_tokens INTEGER,
    deleted_requests INTEGER,
    deleted_login_attempts INTEGER
) AS $$
DECLARE
    v_deleted_tokens INTEGER;
    v_deleted_requests INTEGER;
    v_deleted_attempts INTEGER;
BEGIN
    -- Delete expired password reset tokens
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR (used = true AND created_at < NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS v_deleted_tokens = ROW_COUNT;
    
    -- Delete old password reset requests
    DELETE FROM password_reset_requests
    WHERE requested_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_requests = ROW_COUNT;
    
    -- Delete old login attempts
    DELETE FROM login_attempts
    WHERE attempted_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;
    
    RAISE NOTICE 'Cleanup: % tokens, % requests, % login attempts', 
        v_deleted_tokens, v_deleted_requests, v_deleted_attempts;
    
    RETURN QUERY SELECT v_deleted_tokens, v_deleted_requests, v_deleted_attempts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE login_attempts IS 'Tracks login attempts for rate limiting and security monitoring';
