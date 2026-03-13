-- ==========================================
-- FASE 3: FIX MULTIMEDIA Y PERMISOS SOCIALES
-- ==========================================

-- 1. Asegurar tabla de Dislikes con nombre correcto (noticia_dislikes)
CREATE TABLE IF NOT EXISTS public.noticia_dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    noticia_id TEXT NOT NULL REFERENCES public.asistencia_visitas(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(noticia_id, agent_id)
);

-- 2. Asegurar tablas de Historias completas
CREATE TABLE IF NOT EXISTS public.agent_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image',
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.agent_stories(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.story_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.agent_stories(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS y Otorgar Permisos Totales (Modo Desarrollo/Pruebas)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('asistencia_visitas', 'noticia_likes', 'noticia_dislikes', 'agent_stories', 'story_reactions', 'story_replies', 'story_views')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Permitir todo a anon" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Permitir todo a anon" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO anon', t);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated', t);
    END LOOP;
END $$;

-- 4. Notificar recarga de PostgREST
NOTIFY pgrst, 'reload schema';
