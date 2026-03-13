-- ==============================================================================
-- FORZADO DE PERMISOS RLS Y RECUPERACIÓN (INTEL FEED)
-- ==============================================================================
-- Si los usuarios no ven noticias en el inicio, es porque Postgres está bloqueando
-- la lectura silenciosamente mediante RLS (Row Level Security).
-- Ejecuta esto en SUPABASE -> SQL EDITOR.

-- 1. Deshabilitamos y volvemos a habilitar para reiniciar las políticas
ALTER TABLE public.intel_feed DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_feed ENABLE ROW LEVEL SECURITY;

-- 2. Borramos políticas viejas si existen
DROP POLICY IF EXISTS "Acceso total anon intel_feed" ON public.intel_feed;
DROP POLICY IF EXISTS "Lectura anon intel_feed" ON public.intel_feed;
DROP POLICY IF EXISTS "Escritura anon intel_feed" ON public.intel_feed;

-- 3. Creamos Políticas Explícitas (Sin Restricciones para la App de React)
CREATE POLICY "Lectura anon intel_feed" ON public.intel_feed FOR SELECT USING (true);
CREATE POLICY "Escritura anon intel_feed" ON public.intel_feed FOR ALL USING (true) WITH CHECK (true);

-- 4. Otorga los roles directamente a PostgreSQL
GRANT ALL ON TABLE public.intel_feed TO anon;
GRANT ALL ON TABLE public.intel_feed TO authenticated;

-- Igual para historiales
ALTER TABLE public.agent_stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon agent_stories" ON public.agent_stories;
CREATE POLICY "Acceso total anon agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.agent_stories TO anon;

ALTER TABLE public.intel_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon intel_likes" ON public.intel_likes;
CREATE POLICY "Acceso total anon intel_likes" ON public.intel_likes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.intel_likes TO anon;

-- Y el versículo diario
ALTER TABLE public.daily_verse DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_verse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acceso total anon daily_verse" ON public.daily_verse;
CREATE POLICY "Acceso total anon daily_verse" ON public.daily_verse FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.daily_verse TO anon;

-- Recarga la caché de la API
NOTIFY pgrst, 'reload schema';
