-- Corregir esquema de Academy Studio para permitir la importación masiva con niveles requeridos

-- 1. Añadir columna required_level a academy_courses si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academy_courses' AND column_name='required_level') THEN
        ALTER TABLE academy_courses ADD COLUMN required_level TEXT DEFAULT 'RECLUTA';
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
END $$;

-- Comentario de confirmación
COMMENT ON COLUMN academy_courses.required_level IS 'Nivel mínimo requerido para acceder al curso (RECLUTA, AGENTE, ELITE, etc)';
