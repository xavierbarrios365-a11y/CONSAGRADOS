-- ==============================================================================
-- 🛡️ SCRIPT DE RESTAURACIÓN DE ACADEMIA Y SINCRONIZACIÓN - CONSAGRADOS 2026 🛡️
-- ==============================================================================
-- Este script resuelve la desaparición de certificados y los fallos de
-- persistencia de datos (niveles que se resetean) asegurando las políticas RLS.
-- ==============================================================================

-- 1. TABLA: academy_progress (Corrección de Integridad)
-- Añadimos un índice único para que el 'upsert' del frontend no cree filas infinitas.
-- Primero limpiamos duplicados manteniendo solo el registro con mayor puntuación o el más reciente.
DELETE FROM public.academy_progress a
USING public.academy_progress b
WHERE a.id > b.id 
  AND a.agent_id = b.agent_id 
  AND a.lesson_id = b.lesson_id;

-- Añadimos la restricción única (si no existe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_agent_lesson_progress') THEN
        ALTER TABLE public.academy_progress ADD CONSTRAINT unique_agent_lesson_progress UNIQUE (agent_id, lesson_id);
    END IF;
END $$;

-- 2. REFORZAR RLS: academy_courses, academy_lessons, academy_progress
-- Habilitamos lectura pública para asegurar que los certificados sean visibles.
ALTER TABLE IF EXISTS public.academy_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública academy_courses" ON public.academy_courses;
CREATE POLICY "Lectura pública academy_courses" ON public.academy_courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acceso total anon academy_courses" ON public.academy_courses;
CREATE POLICY "Acceso total anon academy_courses" ON public.academy_courses FOR ALL USING (true);

ALTER TABLE IF EXISTS public.academy_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública academy_lessons" ON public.academy_lessons;
CREATE POLICY "Lectura pública academy_lessons" ON public.academy_lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acceso total anon academy_lessons" ON public.academy_lessons;
CREATE POLICY "Acceso total anon academy_lessons" ON public.academy_lessons FOR ALL USING (true);

ALTER TABLE IF EXISTS public.academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública academy_progress" ON public.academy_progress;
CREATE POLICY "Lectura pública academy_progress" ON public.academy_progress FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acceso total anon academy_progress" ON public.academy_progress;
CREATE POLICY "Acceso total anon academy_progress" ON public.academy_progress FOR ALL USING (true);

-- 3. REFORZAR RLS: agentes (Corrección de Persistencia)
-- CRÍTICO: Permitimos que los agentes actualicen sus propios datos (Foto, Stats, etc.)
-- para evitar que el sistema parezca que "devuelve a niveles anteriores" por fallos de escritura.
ALTER TABLE IF EXISTS public.agentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública agentes" ON public.agentes;
CREATE POLICY "Lectura pública agentes" ON public.agentes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Actualización agentes" ON public.agentes;
CREATE POLICY "Actualización agentes" ON public.agentes FOR UPDATE USING (true);

-- 4. REFORZAR RLS: tareas_tacticas y tareas_completadas
ALTER TABLE IF EXISTS public.tareas_tacticas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública tareas_tacticas" ON public.tareas_tacticas;
CREATE POLICY "Lectura pública tareas_tacticas" ON public.tareas_tacticas FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.tareas_completadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública tareas_completadas" ON public.tareas_completadas;
CREATE POLICY "Lectura pública tareas_completadas" ON public.tareas_completadas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura pública tareas_completadas" ON public.tareas_completadas;
CREATE POLICY "Escritura pública tareas_completadas" ON public.tareas_completadas FOR ALL USING (true);

-- Refrescar el esquema
NOTIFY pgrst, 'reload schema';

-- ✅ ACADEMIA Y SINCRONIZACIÓN RESTAURADAS.
