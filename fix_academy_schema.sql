-- Corregir esquema de Academy Studio para permitir la importación masiva con niveles requeridos

-- 1. Añadir columna required_level a academy_courses si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_courses' AND column_name='required_level') THEN
        ALTER TABLE academy_courses ADD COLUMN required_level TEXT DEFAULT 'RECLUTA';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_courses' AND column_name='created_at') THEN
        ALTER TABLE academy_courses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 2. Asegurar que academy_courses tenga order_index e is_active
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_courses' AND column_name='order_index') THEN
        ALTER TABLE academy_courses ADD COLUMN order_index INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_courses' AND column_name='is_active') THEN
        ALTER TABLE academy_courses ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Verificar esquema de academy_lessons para campos de tests psicométricos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='result_algorithm') THEN
        ALTER TABLE academy_lessons ADD COLUMN result_algorithm TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='result_mappings') THEN
        ALTER TABLE academy_lessons ADD COLUMN result_mappings JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='start_time') THEN
        ALTER TABLE academy_lessons ADD COLUMN start_time INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='end_time') THEN
        ALTER TABLE academy_lessons ADD COLUMN end_time INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='video_url') THEN
        ALTER TABLE academy_lessons ADD COLUMN video_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='questions_json') THEN
        ALTER TABLE academy_lessons ADD COLUMN questions_json JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='xp_reward') THEN
        ALTER TABLE academy_lessons ADD COLUMN xp_reward INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_lessons' AND column_name='created_at') THEN
        ALTER TABLE academy_lessons ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 4. Asegurar tabla academy_progress
CREATE TABLE IF NOT EXISTS academy_progress (
    agent_id UUID NOT NULL,
    lesson_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (agent_id, lesson_id)
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_progress' AND column_name='attempts') THEN
        ALTER TABLE academy_progress ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Comentario de confirmación
COMMENT ON COLUMN academy_courses.required_level IS 'Nivel mínimo requerido para acceder al curso (RECLUTA, AGENTE, ELITE, etc)';
    
