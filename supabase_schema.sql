-- ==========================================
-- ESTRUCTURA MIGRACIÓN SUPABASE - FASE 1 y 3.5 (CLONACIÓN EXHAUSTIVA)
-- ==========================================

-- 1. TABLA: agentes (Estructura Expandida)
CREATE TABLE IF NOT EXISTS public.agentes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    rango TEXT,
    cargo TEXT,
    whatsapp TEXT,
    foto_url TEXT,
    pin TEXT,
    is_ai_profile_pending BOOLEAN DEFAULT false,
    tactical_stats JSONB DEFAULT '{}'::jsonb,
    tactor_summary TEXT,
    
    -- Nuevas columnas (Fase 3.5)
    talent TEXT,
    baptism_status TEXT,
    status TEXT DEFAULT 'ACTIVO',
    bible INTEGER DEFAULT 0,
    notes INTEGER DEFAULT 0,
    leadership INTEGER DEFAULT 0,
    user_role TEXT DEFAULT 'STUDENT',
    joined_date TEXT,
    birthday TEXT,
    relationship_with_god TEXT,
    security_question TEXT,
    security_answer TEXT,
    must_change_password BOOLEAN DEFAULT false,
    biometric_credential TEXT,
    streak_count INTEGER DEFAULT 0,
    last_streak_date TEXT,
    last_attendance TEXT,
    weekly_tasks JSONB DEFAULT '[]'::jsonb,
    notif_prefs JSONB DEFAULT '{"read": [], "deleted": []}'::jsonb,
    last_course TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla ya existe, usa estos ALTER TABLE para añadir las nuevas columnas sin borrar datos:
/*
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS talent TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS baptism_status TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVO';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS bible INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS notes INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS leadership INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'STUDENT';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS joined_date TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS relationship_with_god TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS security_answer TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS biometric_credential TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_streak_date TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_attendance TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS weekly_tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS notif_prefs JSONB DEFAULT '{"read": [], "deleted": []}'::jsonb;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_course TEXT;
*/

-- Habilitar RLS para agentes
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Cualquiera puede leer agentes
DROP POLICY IF EXISTS "Lectura API anon agentes" ON public.agentes;
CREATE POLICY "Lectura API anon agentes" ON public.agentes FOR SELECT USING (true);

-- Política de escritura temporal para la migración y la App (Hasta fase 4)
-- BLOQUEO DE DELETE: Sólo se permite Insert y Update explícitamente.
DROP POLICY IF EXISTS "Escritura API anon agentes" ON public.agentes;
CREATE POLICY "Insert API anon agentes" ON public.agentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Update API anon agentes" ON public.agentes FOR UPDATE USING (true);


-- 2. TABLA: eventos
CREATE TABLE IF NOT EXISTS public.eventos (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora TEXT,
    lugar TEXT,
    puntos_recompensa INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura API anon eventos" ON public.eventos;
CREATE POLICY "Lectura API anon eventos" ON public.eventos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura API anon eventos" ON public.eventos;
CREATE POLICY "Insert API anon eventos" ON public.eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update API anon eventos" ON public.eventos FOR UPDATE USING (true);


-- 3. TABLA: notificaciones_push
CREATE TABLE IF NOT EXISTS public.notificaciones_push (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'general',
    leida_por JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notificaciones_push ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura API anon notificaciones" ON public.notificaciones_push;
CREATE POLICY "Lectura API anon notificaciones" ON public.notificaciones_push FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura API anon notificaciones" ON public.notificaciones_push;
CREATE POLICY "Insert API anon notificaciones" ON public.notificaciones_push FOR INSERT WITH CHECK (true);
CREATE POLICY "Update API anon notificaciones" ON public.notificaciones_push FOR UPDATE USING (true);


-- 4. TABLA: insignias_otorgadas
CREATE TABLE IF NOT EXISTS public.insignias_otorgadas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT,
    badge_type TEXT NOT NULL,
    label TEXT NOT NULL,
    otorgada_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.insignias_otorgadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura API anon insignias" ON public.insignias_otorgadas;
CREATE POLICY "Lectura API anon insignias" ON public.insignias_otorgadas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura API anon insignias" ON public.insignias_otorgadas;
CREATE POLICY "Insert API anon insignias" ON public.insignias_otorgadas FOR INSERT WITH CHECK (true);
CREATE POLICY "Update API anon insignias" ON public.insignias_otorgadas FOR UPDATE USING (true);


-- 5. TABLA: asistencia_visitas (Radar)
CREATE TABLE IF NOT EXISTS public.asistencia_visitas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT,
    agent_name TEXT NOT NULL,
    tipo TEXT NOT NULL,
    detalle TEXT,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.asistencia_visitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura API anon asistencia" ON public.asistencia_visitas;
CREATE POLICY "Lectura API anon asistencia" ON public.asistencia_visitas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura API anon asistencia" ON public.asistencia_visitas;
CREATE POLICY "Insert API anon asistencia" ON public.asistencia_visitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Update API anon asistencia" ON public.asistencia_visitas FOR UPDATE USING (true);


-- ==========================================
-- ESTRUCTURAS DE FASE 3.5 (Nuevos Módulos)
-- ==========================================

-- 6. TABLA: versiculos_diarios
CREATE TABLE IF NOT EXISTS public.versiculos_diarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    cita TEXT NOT NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.versiculos_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura anon versiculos" ON public.versiculos_diarios;
CREATE POLICY "Lectura anon versiculos" ON public.versiculos_diarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon versiculos" ON public.versiculos_diarios;
CREATE POLICY "Insert anon versiculos" ON public.versiculos_diarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon versiculos" ON public.versiculos_diarios FOR UPDATE USING (true);


-- 7. TABLA: academy_courses
CREATE TABLE IF NOT EXISTS public.academy_courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    badge_reward TEXT,
    xp_reward INTEGER DEFAULT 0,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura anon courses" ON public.academy_courses;
CREATE POLICY "Lectura anon courses" ON public.academy_courses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon courses" ON public.academy_courses;
CREATE POLICY "Insert anon courses" ON public.academy_courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon courses" ON public.academy_courses FOR UPDATE USING (true);


-- 8. TABLA: academy_lessons
CREATE TABLE IF NOT EXISTS public.academy_lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT REFERENCES public.academy_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    embed_url TEXT,
    required_role TEXT DEFAULT 'STUDENT',
    content TEXT,
    questions_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura anon lessons" ON public.academy_lessons;
CREATE POLICY "Lectura anon lessons" ON public.academy_lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon lessons" ON public.academy_lessons;
CREATE POLICY "Insert anon lessons" ON public.academy_lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon lessons" ON public.academy_lessons FOR UPDATE USING (true);


-- 9. TABLA: academy_progress
CREATE TABLE IF NOT EXISTS public.academy_progress (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_id TEXT REFERENCES public.agentes(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.academy_courses(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura anon progress" ON public.academy_progress;
CREATE POLICY "Lectura anon progress" ON public.academy_progress FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon progress" ON public.academy_progress;
CREATE POLICY "Insert anon progress" ON public.academy_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon progress" ON public.academy_progress FOR UPDATE USING (true);


-- 10. TABLA: tareas
CREATE TABLE IF NOT EXISTS public.tareas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    area TEXT,
    required_level TEXT,
    xp_reward INTEGER DEFAULT 0,
    max_slots INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura anon tareas" ON public.tareas;
CREATE POLICY "Lectura anon tareas" ON public.tareas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon tareas" ON public.tareas;
CREATE POLICY "Insert anon tareas" ON public.tareas FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon tareas" ON public.tareas FOR UPDATE USING (true);


-- 11. TABLA: progreso_tareas
CREATE TABLE IF NOT EXISTS public.progreso_tareas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    task_id TEXT,
    agent_id TEXT,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'SOLICITADO', 'EN_PROGRESO', 'ENTREGADO', 'VERIFICADO', 'RECHAZADO'
    verified_by TEXT,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.progreso_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura anon progreso" ON public.progreso_tareas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Escritura anon progreso" ON public.progreso_tareas;
CREATE POLICY "Insert anon progreso" ON public.progreso_tareas FOR INSERT WITH CHECK (true);
CREATE POLICY "Update anon progreso" ON public.progreso_tareas FOR UPDATE USING (true);
