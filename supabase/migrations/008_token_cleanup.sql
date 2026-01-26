-- ============================================
-- Token Cleanup Job
-- Removes expired password reset tokens and old requests
-- ============================================

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS TABLE (
    deleted_tokens INTEGER,
    deleted_requests INTEGER
) AS $$
DECLARE
    v_deleted_tokens INTEGER;
    v_deleted_requests INTEGER;
BEGIN
    -- Delete expired password reset tokens (older than 7 days)
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
    OR (used = true AND created_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS v_deleted_tokens = ROW_COUNT;
    
    -- Delete old password reset requests (older than 30 days)
    DELETE FROM password_reset_requests
    WHERE requested_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_requests = ROW_COUNT;
    
    -- Log cleanup
    RAISE NOTICE 'Cleanup completed: % tokens, % requests deleted', v_deleted_tokens, v_deleted_requests;
    
    RETURN QUERY SELECT v_deleted_tokens, v_deleted_requests;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Manual Cleanup (Run this once to clean existing data)
-- ============================================

SELECT * FROM cleanup_expired_tokens();

-- ============================================
-- Automatic Cleanup with pg_cron (Optional)
-- Requires pg_cron extension
-- ============================================

-- Enable pg_cron extension (run as superuser if needed)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run daily at 2 AM
-- SELECT cron.schedule(
--     'cleanup-expired-tokens',
--     '0 2 * * *', -- Cron expression: 2 AM daily
--     $$SELECT cleanup_expired_tokens()$$
-- );

-- ============================================
-- Verify Cleanup Job (if using pg_cron)
-- ============================================

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- Alternative: Supabase Edge Function
-- If pg_cron is not available, create an Edge Function
-- and call it via a scheduled webhook
-- ============================================

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Cleans up expired password reset tokens and old requests. Run daily via cron or edge function.';
