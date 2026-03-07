-- Habilitar Realtime para las tablas sociales
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar cada tabla de forma independiente solo si no está ya en la publicación
DO $$
BEGIN
    -- Agregar asistencia_visitas si no está
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'asistencia_visitas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE asistencia_visitas;
    END IF;
    
    -- Agregar noticia_likes si no está
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'noticia_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE noticia_likes;
    END IF;

    -- Agregar noticia_dislikes si no está
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'noticia_dislikes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE noticia_dislikes;
    END IF;
END $$;

-- 2. Asegurar Replica Identity (esto sí se puede repetir sin error)
ALTER TABLE noticia_likes REPLICA IDENTITY FULL;
ALTER TABLE noticia_dislikes REPLICA IDENTITY FULL;
ALTER TABLE asistencia_visitas REPLICA IDENTITY FULL;
