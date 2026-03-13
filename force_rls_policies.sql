-- ==============================================================================
-- FORZADO DE PERMISOS RLS - CONSAGRADOS 2026
-- VERSIÓN CORREGIDA: Usa nombres reales de tablas
-- Ejecuta en SUPABASE -> SQL EDITOR
-- ==============================================================================

-- ---- asistencia_visitas (Intel Feed + Eventos + Confirmaciones) ----
ALTER TABLE public.asistencia_visitas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia_visitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS asistencia_visitas lectura" ON public.asistencia_visitas;
DROP POLICY IF EXISTS "RLS asistencia_visitas escritura" ON public.asistencia_visitas;
CREATE POLICY "RLS asistencia_visitas lectura" ON public.asistencia_visitas FOR SELECT USING (true);
CREATE POLICY "RLS asistencia_visitas escritura" ON public.asistencia_visitas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.asistencia_visitas TO anon;
GRANT ALL ON TABLE public.asistencia_visitas TO authenticated;

-- ---- noticia_likes (Likes del Feed) ----
ALTER TABLE public.noticia_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticia_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS noticia_likes" ON public.noticia_likes;
CREATE POLICY "RLS noticia_likes" ON public.noticia_likes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.noticia_likes TO anon;
GRANT ALL ON TABLE public.noticia_likes TO authenticated;

-- ---- daily_verse (Versículo del Día) ----
ALTER TABLE public.daily_verse DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_verse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS daily_verse" ON public.daily_verse;
CREATE POLICY "RLS daily_verse" ON public.daily_verse FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.daily_verse TO anon;
GRANT ALL ON TABLE public.daily_verse TO authenticated;

-- ---- agent_stories (Historias) ----
ALTER TABLE public.agent_stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS agent_stories" ON public.agent_stories;
CREATE POLICY "RLS agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.agent_stories TO anon;
GRANT ALL ON TABLE public.agent_stories TO authenticated;

-- ---- academy_lesssons / courses / progress (Academia) ----
ALTER TABLE public.academy_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS academy_lessons" ON public.academy_lessons;
CREATE POLICY "RLS academy_lessons" ON public.academy_lessons FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.academy_lessons TO anon;
GRANT ALL ON TABLE public.academy_lessons TO authenticated;

ALTER TABLE public.academy_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS academy_courses" ON public.academy_courses;
CREATE POLICY "RLS academy_courses" ON public.academy_courses FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.academy_courses TO anon;
GRANT ALL ON TABLE public.academy_courses TO authenticated;

ALTER TABLE public.academy_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS academy_progress" ON public.academy_progress;
CREATE POLICY "RLS academy_progress" ON public.academy_progress FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.academy_progress TO anon;
GRANT ALL ON TABLE public.academy_progress TO authenticated;

-- ---- Eventos ----
ALTER TABLE public.eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RLS eventos" ON public.eventos;
CREATE POLICY "RLS eventos" ON public.eventos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.eventos TO anon;
GRANT ALL ON TABLE public.eventos TO authenticated;

-- ---- Recarga la caché de la API PostgREST ----
NOTIFY pgrst, 'reload schema';
