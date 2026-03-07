-- Migration: Unificación de Nombres Social y Realtime v2
-- Ejecutar en el SQL Editor de Supabase

-- 1. Renombrar tabla de dislikes si existe con el nombre antiguo
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asistencia_visitas_dislikes') THEN
        ALTER TABLE asistencia_visitas_dislikes RENAME TO noticia_dislikes;
    END IF;
END $$;

-- 2. Crear tabla noticia_likes si no existe
CREATE TABLE IF NOT EXISTS noticia_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    noticia_id TEXT NOT NULL REFERENCES asistencia_visitas(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(noticia_id, agent_id)
);

-- 3. Crear tabla noticia_dislikes si no existe (por si no se renombró)
CREATE TABLE IF NOT EXISTS noticia_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    noticia_id TEXT NOT NULL REFERENCES asistencia_visitas(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(noticia_id, agent_id)
);

-- 4. Re-asociar Trigger de Auto-Moderación a noticia_dislikes
DROP TRIGGER IF EXISTS trg_dislike_moderation ON noticia_dislikes;
CREATE TRIGGER trg_dislike_moderation
AFTER INSERT OR DELETE ON noticia_dislikes
FOR EACH ROW EXECUTE FUNCTION handle_dislike_moderation();

-- 5. Habilitar Realtime para las tres tablas de forma segura
DO $$
BEGIN
    -- Agregar asistencia_visitas si no está en la publicación
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'asistencia_visitas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE asistencia_visitas;
    END IF;
    
    -- Agregar noticia_likes si no está en la publicación
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'noticia_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE noticia_likes;
    END IF;

    -- Agregar noticia_dislikes si no está en la publicación
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'noticia_dislikes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE noticia_dislikes;
    END IF;
END $$;

-- 6. Configurar Replica Identity para borrados reactivos
ALTER TABLE asistencia_visitas REPLICA IDENTITY FULL;
ALTER TABLE noticia_likes REPLICA IDENTITY FULL;
ALTER TABLE noticia_dislikes REPLICA IDENTITY FULL;

-- 7. Permisos de seguridad
GRANT ALL ON public.noticia_likes TO anon, authenticated;
GRANT ALL ON public.noticia_dislikes TO anon, authenticated;
