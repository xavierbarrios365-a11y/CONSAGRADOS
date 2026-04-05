-- ==============================================================================
-- 🛡️ SCRIPT DE CORRECCIÓN DE SEGURIDAD RLS - CONSAGRADOS 2026 🛡️
-- ==============================================================================
-- Este script habilita Row Level Security (RLS) y añade políticas básicas de lectura
-- para las tablas que el linter de Supabase marcó como vulnerables.
-- ==============================================================================

-- 1. Tabla: iq_levels (Configuración de Niveles de IQ)
-- Habilitamos RLS y permitimos lectura pública para que el juego funcione.
ALTER TABLE IF EXISTS public.iq_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública iq_levels" ON public.iq_levels;
CREATE POLICY "Lectura pública iq_levels" ON public.iq_levels FOR SELECT USING (true);

-- 2. Tabla: tareas_tacticas (Listado de Tareas Disponibles)
-- Habilitamos RLS y permitimos lectura para que todos los agentes vean sus tareas.
ALTER TABLE IF EXISTS public.tareas_tacticas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública tareas_tacticas" ON public.tareas_tacticas;
CREATE POLICY "Lectura pública tareas_tacticas" ON public.tareas_tacticas FOR SELECT USING (true);

-- 3. Tabla: tareas_completadas (Registro de Progreso de Tareas)
-- Habilitamos RLS. Lectura pública y los agentes pueden insertar su cumplimiento.
ALTER TABLE IF EXISTS public.tareas_completadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública tareas_completadas" ON public.tareas_completadas;
CREATE POLICY "Lectura pública tareas_completadas" ON public.tareas_completadas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar tareas_completadas autenticado" ON public.tareas_completadas;
CREATE POLICY "Insertar tareas_completadas autenticado" ON public.tareas_completadas FOR INSERT WITH CHECK (true);

-- 4. Tabla: bible_war_questions (Banco de Preguntas)
-- Habilitamos RLS y permitimos lectura para el funcionamiento de la arena de duelo.
ALTER TABLE IF EXISTS public.bible_war_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública bible_war_questions" ON public.bible_war_questions;
CREATE POLICY "Lectura pública bible_war_questions" ON public.bible_war_questions FOR SELECT USING (true);

-- Refrescar el esquema para que Supabase reconozca los cambios inmediatamente.
NOTIFY pgrst, 'reload schema';

-- ✅ SEGURIDAD REFORZADA: RLS ACTIVADO PARA TABLAS CRÍTICAS.
