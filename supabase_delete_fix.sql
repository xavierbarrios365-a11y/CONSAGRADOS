-- =====================================================
-- FIX URGENTE: Permisos de DELETE en asistencia_visitas
-- El rol 'anon' nunca tuvo DELETE, y las RLS policies
-- faltaban. Este script lo corrige para ambos roles.
-- =====================================================

-- 1. Permisos de tabla completos para anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencia_visitas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencia_visitas TO authenticated;

-- 2. Permisos para noticia_likes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticia_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticia_likes TO authenticated;

-- 3. RLS: Crear policies de DELETE si no existen
-- Primero intentamos borrar policies viejas que puedan estar incompletas
DO $$
BEGIN
    -- Asegurar que RLS está habilitado
    ALTER TABLE public.asistencia_visitas ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.noticia_likes ENABLE ROW LEVEL SECURITY;

    -- Drop y recrear policies para asistencia_visitas
    DROP POLICY IF EXISTS "anon_all_asistencia" ON public.asistencia_visitas;
    DROP POLICY IF EXISTS "auth_all_asistencia" ON public.asistencia_visitas;
    DROP POLICY IF EXISTS "anon_select_asistencia" ON public.asistencia_visitas;
    DROP POLICY IF EXISTS "anon_insert_asistencia" ON public.asistencia_visitas;

    CREATE POLICY "anon_all_asistencia" ON public.asistencia_visitas
        FOR ALL TO anon USING (true) WITH CHECK (true);

    CREATE POLICY "auth_all_asistencia" ON public.asistencia_visitas
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    -- Drop y recrear policies para noticia_likes
    DROP POLICY IF EXISTS "anon_all_likes" ON public.noticia_likes;
    DROP POLICY IF EXISTS "auth_all_likes" ON public.noticia_likes;
    DROP POLICY IF EXISTS "anon_select_likes" ON public.noticia_likes;
    DROP POLICY IF EXISTS "anon_insert_likes" ON public.noticia_likes;

    CREATE POLICY "anon_all_likes" ON public.noticia_likes
        FOR ALL TO anon USING (true) WITH CHECK (true);

    CREATE POLICY "auth_all_likes" ON public.noticia_likes
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';
