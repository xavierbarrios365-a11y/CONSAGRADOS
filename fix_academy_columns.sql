-- ==============================================================
-- SCRIPT DE REFUERZO: COLUMNAS FALTANTES EN ACADEMIA
-- ==============================================================

-- 1. Agregar columnas a academy_courses (si faltan)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_courses' AND column_name='created_at') THEN
        ALTER TABLE public.academy_courses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_courses' AND column_name='order_index') THEN
    -- Asegurar columnas en academy_progress
ALTER TABLE public.academy_progress ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.academy_progress ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Agregar columnas a academy_lessons (si faltan)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_lessons' AND column_name='created_at') THEN
        ALTER TABLE public.academy_lessons ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_lessons' AND column_name='order_index') THEN
        ALTER TABLE public.academy_lessons ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_lessons' AND column_name='questions_json') THEN
        ALTER TABLE public.academy_lessons ADD COLUMN questions_json JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. Asegurar RLS de lectura para todos
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica academy_courses" ON public.academy_courses;
CREATE POLICY "Lectura publica academy_courses" ON public.academy_courses FOR SELECT USING (true);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica academy_lessons" ON public.academy_lessons;
CREATE POLICY "Lectura publica academy_lessons" ON public.academy_lessons FOR SELECT USING (true);

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
