-- Social Feed "Pro" Improvements Migration
-- 1. Ensure parent_id exists
ALTER TABLE asistencia_visitas ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_asistencia_visitas_parent_id ON asistencia_visitas(parent_id);

-- 3. Cleanup Function for 48h TTL
-- This function deletes messages older than 48 hours.
-- Can be called manually or via a cron job.

CREATE OR REPLACE FUNCTION cleanup_expired_news()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM asistencia_visitas 
    WHERE registrado_en < NOW() - INTERVAL '48 hours';
END;
$$;

-- 4. Enable Realtime for this table if not already enabled
-- (Only run if you haven't enabled it via the Supabase UI)
-- ALTER PUBLICATION supabase_realtime ADD TABLE asistencia_visitas;
