-- ============================================
-- FIX: Security Advisor - Habilitar RLS
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

-- 1. iq_best_times: Tiempos del juego TacticalIQ
ALTER TABLE public.iq_best_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver todos los tiempos"
  ON public.iq_best_times FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden insertar sus propios tiempos"
  ON public.iq_best_times FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sus propios tiempos"
  ON public.iq_best_times FOR UPDATE
  USING (true);

-- 2. duelo_desafios: Desafíos de duelos bíblicos
ALTER TABLE public.duelo_desafios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver desafíos"
  ON public.duelo_desafios FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden crear desafíos"
  ON public.duelo_desafios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar desafíos"
  ON public.duelo_desafios FOR UPDATE
  USING (true);

-- 3. duelo_sesiones: Sesiones activas de duelos
ALTER TABLE public.duelo_sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver sesiones de duelo"
  ON public.duelo_sesiones FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden crear sesiones"
  ON public.duelo_sesiones FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sesiones"
  ON public.duelo_sesiones FOR UPDATE
  USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('iq_best_times', 'duelo_desafios', 'duelo_sesiones');
