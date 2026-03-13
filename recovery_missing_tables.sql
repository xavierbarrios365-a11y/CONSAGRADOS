-- ==============================================================================
-- SCRIPT DE RECUPERACIÓN DE TABLAS ELIMINADAS (INTEL FEED, STORIES, LIKES, ETC)
-- ==============================================================================
-- Ejecuta este script íntegramente en el SQL Editor de Supabase para restaurar
-- las funcionalidades sociales y de recursos que arrojan error 404 en consola.

-- 1. TABLA: intel_feed (Muro de Inteligencia)
CREATE TABLE IF NOT EXISTS public.intel_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'CURSO_COMPLETADO', 'ASCENSO', 'SOCIAL', 'BIBLE_SHARE', etc.
    message TEXT NOT NULL,
    agent_id TEXT REFERENCES public.agentes(id) ON DELETE CASCADE,
    agent_name TEXT,
    verse TEXT,
    reference TEXT,
    version TEXT,
    parent_id TEXT,
    media_url TEXT,
    media_type TEXT,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.intel_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon intel_feed" ON public.intel_feed;
CREATE POLICY "Acceso total anon intel_feed" ON public.intel_feed FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA: agent_stories (Historias de 24h)
CREATE TABLE IF NOT EXISTS public.agent_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT REFERENCES public.agentes(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    photo_url TEXT,
    image_url TEXT,
    video_url TEXT,
    caption TEXT,
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.agent_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon agent_stories" ON public.agent_stories;
CREATE POLICY "Acceso total anon agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);

-- 3. TABLA: intel_likes (Registro de Me Gusta para evitar duplicados)
CREATE TABLE IF NOT EXISTS public.intel_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.intel_feed(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES public.agentes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(item_id, agent_id)
);

ALTER TABLE public.intel_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon intel_likes" ON public.intel_likes;
CREATE POLICY "Acceso total anon intel_likes" ON public.intel_likes FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA: daily_verse (Versículo Diario)
-- Nota: En algunas versiones se llamaba versiculos_diarios, lo creamos como tabla independiente para compatibilidad directa.
CREATE TABLE IF NOT EXISTS public.daily_verse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    cita TEXT,
    texto TEXT NOT NULL,
    reference TEXT,
    verse TEXT,
    version TEXT DEFAULT 'RVR1960',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_verse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon daily_verse" ON public.daily_verse;
CREATE POLICY "Acceso total anon daily_verse" ON public.daily_verse FOR ALL USING (true) WITH CHECK (true);

-- 5. FUNCION: cleanup_expired_intel_feed (Limpieza automática)
CREATE OR REPLACE FUNCTION public.cleanup_expired_intel_feed()
RETURNS void AS $$
BEGIN
  -- Borrar historias expiradas (mayores a 24h)
  DELETE FROM public.agent_stories WHERE expires_at < now();
  -- (Opcional) Borrar feeds muy viejos si se requiere
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feed() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feed() TO authenticated;

-- Refrescar caché del esquema de Supabase para que la app vea las tablas inmediatamente
NOTIFY pgrst, 'reload schema';
