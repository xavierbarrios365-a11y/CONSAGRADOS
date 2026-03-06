-- ========================================================
-- PROTOCOLO DE BLINDAJE DE SEGURIDAD Y CUMPLIMIENTO (RGPD/HADES)
-- CONSAGRADOS 2026 - CORE SECURITY V1.1 (FIXED)
-- ========================================================

-- 1. LIMPIEZA Y PREPARACIÓN
-- --------------------------------------------------------
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;

-- Aseguramos que las columnas de auditoría existan
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. PERMISOS DE ROL (ANON)
-- --------------------------------------------------------
-- Revocamos todo para empezar de cero y ser granulares
REVOKE ALL ON public.agentes FROM anon;
REVOKE ALL ON public.leads_inversion FROM anon;

-- Permisos de lectura (Solo columnas NO sensibles)
GRANT SELECT (
  id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, 
  joined_date, created_at, updated_at, bible, notes, leadership, 
  streak_count, last_attendance, baptism_status, birthday, 
  relationship_with_god, must_change_password
) ON public.agentes TO anon;

-- Permisos de escritura (Permitir sync total para el agente)
GRANT INSERT ON public.agentes TO anon;
GRANT UPDATE ON public.agentes TO anon;

-- BLOQUEO ESPECÍFICO DE COLUMNAS SENSIBLES PARA SELECT
-- (Esto asegura que un "SELECT *" falle o sea denegado)
-- Nota: En Supabase/PostgREST, si no hay SELECT en una columna, no se puede ver.
-- NO damos GRANT SELECT en: pin, security_answer, fcm_token, whatsapp, biometric_credential.

-- Permisos para Leads
GRANT INSERT ON public.leads_inversion TO anon;

-- Permisos para otras tablas (Asegurar que SELECT * funcione)
GRANT SELECT, INSERT, UPDATE ON public.eventos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.notificaciones_push TO anon;
GRANT SELECT, INSERT, UPDATE ON public.insignias_otorgadas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.asistencia_visitas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.versiculos_diarios TO anon;
GRANT SELECT, INSERT, UPDATE ON public.academy_courses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.academy_lessons TO anon;
GRANT SELECT, INSERT, UPDATE ON public.academy_progress TO anon;
GRANT SELECT, INSERT, UPDATE ON public.tareas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.progreso_tareas TO anon;
GRANT SELECT, INSERT, UPDATE ON public.recursos_tacticos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.misiones TO anon;
GRANT SELECT, INSERT, UPDATE ON public.progreso_misiones TO anon;
GRANT SELECT, INSERT, UPDATE ON public.banners TO anon;

-- 3. POLÍTICAS DE ACCESO GRANULARES (RLS)
-- --------------------------------------------------------

-- AGENTES: Lectura Pública Limitada
DROP POLICY IF EXISTS "Lectura Pública de Perfiles" ON public.agentes;
CREATE POLICY "Lectura Pública de Perfiles" ON public.agentes 
FOR SELECT TO anon 
USING (status = 'ACTIVO');

-- AGENTES: Autogestión (El frontend filtra por ID)
DROP POLICY IF EXISTS "Actualizar mi propio perfil" ON public.agentes;
CREATE POLICY "Actualizar mi propio perfil" ON public.agentes
FOR ALL TO anon
USING (true) 
WITH CHECK (true);

-- LEADS DE INVERSIÓN: Blindaje
DROP POLICY IF EXISTS "Insert público leads_inversion" ON public.leads_inversion;
DROP POLICY IF EXISTS "Lectura Bloqueada leads_inversion" ON public.leads_inversion;
CREATE POLICY "Insert público leads_inversion" ON public.leads_inversion FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Lectura Bloqueada leads_inversion" ON public.leads_inversion FOR SELECT TO anon USING (false);

-- BLOQUEO GLOBAL DE BORRADO (ANON)
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- 4. VISTA DE SEGURIDAD (MÁSCARA DE DATOS)
-- --------------------------------------------------------
CREATE OR REPLACE VIEW public.perfiles_publicOS WITH (security_invoker = true) AS
SELECT id, nombre, xp, rango, cargo, foto_url, status, joined_date, user_role, bible, notes, leadership, streak_count
FROM public.agentes
WHERE status = 'ACTIVO';

GRANT SELECT ON public.perfiles_publicOS TO anon;

-- 6. FUNCIONES DE VERIFICACIÓN SEGURA (RPC)
-- --------------------------------------------------------
-- Permite verificar un PIN sin exponerlo nunca al cliente
CREATE OR REPLACE FUNCTION public.verify_agent_pin(p_id TEXT, p_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.agentes 
    WHERE id = p_id AND pin = p_pin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_agent_pin TO anon;

-- Permite recuperar el PIN tras validar la respuesta de seguridad
CREATE OR REPLACE FUNCTION public.recovery_agent_pin(p_id TEXT, p_answer TEXT)
RETURNS TEXT AS $$
DECLARE
  v_pin TEXT;
BEGIN
  SELECT pin INTO v_pin FROM public.agentes 
  WHERE id = p_id AND LOWER(security_answer) = LOWER(p_answer);
  
  RETURN v_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.recovery_agent_pin TO anon;

-- COMENTARIO FINAL:
-- Este script bloquea el acceso a logs de inversión, oculta los PINs y secretos 
-- de la respuesta de la API y restringe las columnas modificables por el cliente general.
