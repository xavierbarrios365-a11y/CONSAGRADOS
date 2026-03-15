-- ==============================================================
-- SCRIPT DE CONSOLIDACIÓN FINAL: HISTORIAS, ACADEMIA Y PERMISOS
-- ==============================================================

-- 1. CONSOLIDACIÓN DE TABLAS DE HISTORIAS
-- Aseguramos que 'agent_stories' sea la tabla principal y tenga las columnas correctas.
DO $$ 
BEGIN 
    -- Renombrar 'caption' a 'content' si existe en agent_stories
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'caption') THEN
        ALTER TABLE public.agent_stories RENAME COLUMN caption TO content;
    END IF;
    
    -- Si no existe 'content', añadirla
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'content') THEN
        ALTER TABLE public.agent_stories ADD COLUMN content TEXT;
    END IF;

    -- Asegurar 'media_url' (antes image_url)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'image_url') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'media_url') THEN
        ALTER TABLE public.agent_stories RENAME COLUMN image_url TO media_url;
    END IF;
END $$;

-- 2. CORRECCIÓN ACADEMIA: ASEGURAR FORMATO JSONB PARA PREGUNTAS
-- Si la columna 'questions' es de tipo texto, la convertimos a JSONB para evitar errores de parseo.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_lessons' AND column_name = 'questions' AND data_type = 'text') THEN
        ALTER TABLE public.academy_lessons ALTER COLUMN questions TYPE JSONB USING questions::JSONB;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academy_lessons' AND column_name = 'result_mappings' AND data_type = 'text') THEN
        ALTER TABLE public.academy_lessons ALTER COLUMN result_mappings TYPE JSONB USING result_mappings::JSONB;
    END IF;
END $$;

-- 3. PERMISOS RLS Y ACCESO TOTAL (Solicitado por el usuario para agilidad)
-- Historias
ALTER TABLE public.agent_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon agent_stories" ON public.agent_stories;
CREATE POLICY "Acceso total anon agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);

-- Eventos
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon eventos" ON public.eventos;
CREATE POLICY "Acceso total anon eventos" ON public.eventos FOR ALL USING (true) WITH CHECK (true);

-- Academia Progreso
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon academy_progress" ON public.academy_progress;
CREATE POLICY "Acceso total anon academy_progress" ON public.academy_progress FOR ALL USING (true) WITH CHECK (true);

-- 4. OTORGAR PERMISOS EXPLÍCITOS
GRANT ALL ON TABLE public.eventos TO anon, authenticated;
GRANT ALL ON TABLE public.agent_stories TO anon, authenticated;
GRANT ALL ON TABLE public.academy_progress TO anon, authenticated;
GRANT ALL ON TABLE public.academy_lessons TO anon, authenticated;
GRANT ALL ON TABLE public.academy_courses TO anon, authenticated;

-- 5. RECARGAR ESQUEMA PARA POSTGREST/SUPABASE
NOTIFY pgrst, 'reload schema';

-- FIN DEL SCRIPT
