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

-- 4. TABLA: versiculos_diarios (Versículo Diario)
CREATE TABLE IF NOT EXISTS public.versiculos_diarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL,
    cita TEXT,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nota: Permitimos duplicados de fecha en esta tabla si la lógica es rotar cada 3 horas, 
-- pero para evitar errores de select, quitamos el UNIQUE de fecha si estaba.
-- Si queremos un historial completo, simplemente insertamos con la fecha de hoy.

ALTER TABLE public.versiculos_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon versiculos_diarios" ON public.versiculos_diarios;
CREATE POLICY "Acceso total anon versiculos_diarios" ON public.versiculos_diarios FOR ALL USING (true) WITH CHECK (true);

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

-- 6. TABLA: web_banners (Banners de la Plataforma)
CREATE TABLE IF NOT EXISTS public.web_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    title TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.web_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon web_banners" ON public.web_banners;
CREATE POLICY "Acceso total anon web_banners" ON public.web_banners FOR ALL USING (true) WITH CHECK (true);

-- 7. PERMISOS ADICIONALES (Para errores 401/404)
-- asistencia_visitas
ALTER TABLE IF EXISTS public.asistencia_visitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon asistencia_visitas" ON public.asistencia_visitas;
CREATE POLICY "Acceso total anon asistencia_visitas" ON public.asistencia_visitas FOR ALL USING (true) WITH CHECK (true);

-- academy_lessons (Para error 400/401)
ALTER TABLE IF EXISTS public.academy_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon academy_lessons" ON public.academy_lessons;
CREATE POLICY "Acceso total anon academy_lessons" ON public.academy_lessons FOR ALL USING (true) WITH CHECK (true);

-- academy_courses
ALTER TABLE IF EXISTS public.academy_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon academy_courses" ON public.academy_courses;
CREATE POLICY "Acceso total anon academy_courses" ON public.academy_courses FOR ALL USING (true) WITH CHECK (true);

-- academy_progress
ALTER TABLE IF EXISTS public.academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon academy_progress" ON public.academy_progress;
CREATE POLICY "Acceso total anon academy_progress" ON public.academy_progress FOR ALL USING (true) WITH CHECK (true);

-- Refrescar caché del esquema de Supabase para que la app vea las tablas inmediatamente
NOTIFY pgrst, 'reload schema';
