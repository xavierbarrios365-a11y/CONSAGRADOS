-- ========================================================
-- FIX: PERMISOS PARA EL ROL 'authenticated'
-- ========================================================

-- 1. Permisos de Rol (Equivalentes a anon)
GRANT SELECT (
  id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, 
  joined_date, created_at, updated_at, bible, notes, leadership, 
  streak_count, last_attendance, baptism_status, birthday, 
  relationship_with_god, must_change_password,
  biometric_credential, last_course
) ON public.agentes TO authenticated;

GRANT INSERT, UPDATE ON public.agentes TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notificaciones_push TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.insignias_otorgadas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.asistencia_visitas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.versiculos_diarios TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tareas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.progreso_tareas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recursos_tacticos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.misiones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.progreso_misiones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.banners TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.noticia_likes TO authenticated;

-- 2. Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Lectura Pública de Perfiles (Auth)" ON public.agentes;
CREATE POLICY "Lectura Pública de Perfiles (Auth)" ON public.agentes 
FOR SELECT TO authenticated USING (status = 'ACTIVO');

DROP POLICY IF EXISTS "Escritura de Perfiles (Auth)" ON public.agentes;
CREATE POLICY "Escritura de Perfiles (Auth)" ON public.agentes 
FOR ALL TO authenticated USING (true);

-- 3. Refrescar explícitamente el caché de esquemas de PostgREST
NOTIFY pgrst, 'reload schema';
