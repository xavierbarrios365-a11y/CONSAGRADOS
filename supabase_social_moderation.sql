-- Social Moderation Migration: Dislikes & Auto-deletion (FIXED TYPES)
-- 1. Add dislikes_count to asistencia_visitas
ALTER TABLE asistencia_visitas ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- 2. Create table to track individual dislikes (prevent spam)
-- Fixed noticia_id type to TEXT to match asistencia_visitas.id
CREATE TABLE IF NOT EXISTS asistencia_visitas_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    noticia_id TEXT NOT NULL REFERENCES asistencia_visitas(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(noticia_id, agent_id)
);

-- 3. Function to handle dislike logic and auto-deletion
CREATE OR REPLACE FUNCTION handle_dislike_moderation()
RETURNS TRIGGER AS $$
DECLARE
    d_count INTEGER;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Increment count
        UPDATE asistencia_visitas 
        SET dislikes_count = dislikes_count + 1
        WHERE id = NEW.noticia_id
        RETURNING dislikes_count INTO d_count;

        -- Auto-delete if threshold met (5 dislikes)
        IF d_count >= 5 THEN
            DELETE FROM asistencia_visitas WHERE id = NEW.noticia_id;
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement count
        UPDATE asistencia_visitas 
        SET dislikes_count = GREATEST(0, dislikes_count - 1)
        WHERE id = OLD.noticia_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger for auto-moderation
DROP TRIGGER IF EXISTS trg_dislike_moderation ON asistencia_visitas_dislikes;
CREATE TRIGGER trg_dislike_moderation
AFTER INSERT OR DELETE ON asistencia_visitas_dislikes
FOR EACH ROW EXECUTE FUNCTION handle_dislike_moderation();
