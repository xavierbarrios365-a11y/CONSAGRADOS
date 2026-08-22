-- ==============================================================================
-- 🏛️ CONSAGRADOS 2026 - MIGRACIÓN Y EXPANSIÓN MULTI-SEDES (V1)
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/dnzrnpslfabowgtikora
-- ==============================================================================

-- 1. CREAR TABLA DE SEDES / IGLESIAS
CREATE TABLE IF NOT EXISTS public.sedes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    ciudad TEXT DEFAULT 'Caracas',
    pais TEXT DEFAULT 'Venezuela',
    responsable_id TEXT,
    responsable_nombre TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSERTAR SEDE PRINCIPAL / MATRIZ
INSERT INTO public.sedes (id, nombre, ciudad, pais, responsable_nombre)
VALUES (
    'SEDE-JESUS-ES-EL-CENTRO',
    'JESÚS ES EL CENTRO',
    'Caracas',
    'Venezuela',
    'DIRECCIÓN GENERAL'
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    updated_at = NOW();

-- 3. AGREGAR COLUMNAS DE SEDE EN TABLAS PRINCIPALES
ALTER TABLE IF EXISTS public.agentes 
    ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'SEDE-JESUS-ES-EL-CENTRO';

ALTER TABLE IF EXISTS public.asistencia_visitas 
    ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'SEDE-JESUS-ES-EL-CENTRO';

ALTER TABLE IF EXISTS public.eventos 
    ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'SEDE-JESUS-ES-EL-CENTRO';

ALTER TABLE IF EXISTS public.tactical_resources 
    ADD COLUMN IF NOT EXISTS sede_id TEXT DEFAULT 'SEDE-JESUS-ES-EL-CENTRO';

-- 4. BACKFILL: ASIGNAR A TODOS LOS REGISTROS HISTÓRICOS LA SEDE PRINCIPAL
UPDATE public.agentes 
SET sede_id = 'SEDE-JESUS-ES-EL-CENTRO' 
WHERE sede_id IS NULL OR sede_id = '';

UPDATE public.asistencia_visitas 
SET sede_id = 'SEDE-JESUS-ES-EL-CENTRO' 
WHERE sede_id IS NULL OR sede_id = '';

-- 5. PROCEDIMIENTOS ALMACENADOS (RPCS MULTI-SEDE)

-- 5.1 Crear o Actualizar Sede
CREATE OR REPLACE FUNCTION public.create_or_update_sede(
    p_id TEXT,
    p_nombre TEXT,
    p_ciudad TEXT DEFAULT 'Caracas',
    p_pais TEXT DEFAULT 'Venezuela',
    p_responsable_id TEXT DEFAULT NULL,
    p_responsable_nombre TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sede_id TEXT := p_id;
BEGIN
    IF v_sede_id IS NULL OR v_sede_id = '' THEN
        v_sede_id := 'SEDE-' || UPPER(REGEXP_REPLACE(p_nombre, '[^a-zA-Z0-9]', '-', 'g'));
    END IF;

    INSERT INTO public.sedes (id, nombre, ciudad, pais, responsable_id, responsable_nombre, updated_at)
    VALUES (v_sede_id, p_nombre, p_ciudad, p_pais, p_responsable_id, p_responsable_nombre, NOW())
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        ciudad = EXCLUDED.ciudad,
        pais = EXCLUDED.pais,
        responsable_id = EXCLUDED.responsable_id,
        responsable_nombre = EXCLUDED.responsable_nombre,
        updated_at = NOW();

    -- Si se asignó un responsable, actualizar su rol en agentes si es necesario
    IF p_responsable_id IS NOT NULL AND p_responsable_id <> '' THEN
        UPDATE public.agentes 
        SET sede_id = v_sede_id
        WHERE id = p_responsable_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'sede_id', v_sede_id);
END;
$$;

-- 5.2 Reasignar Agente a Sede a 1 Clic
CREATE OR REPLACE FUNCTION public.assign_agent_sede(
    p_agent_id TEXT,
    p_sede_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.agentes
    SET sede_id = p_sede_id,
        updated_at = NOW()
    WHERE id = p_agent_id;

    RETURN jsonb_build_object('success', true, 'agent_id', p_agent_id, 'new_sede_id', p_sede_id);
END;
$$;

-- 5.3 Resumen y Métricas por Sede para Director General
CREATE OR REPLACE FUNCTION public.fetch_sedes_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'nombre', s.nombre,
            'ciudad', s.ciudad,
            'pais', s.pais,
            'responsable_id', s.responsable_id,
            'responsable_nombre', s.responsable_nombre,
            'is_active', s.is_active,
            'total_agentes', (SELECT COUNT(*) FROM public.agentes a WHERE a.sede_id = s.id AND a.status = 'ACTIVO'),
            'total_asistencias', (SELECT COUNT(*) FROM public.asistencia_visitas av WHERE av.sede_id = s.id)
        )
    )
    INTO v_result
    FROM (
        SELECT * FROM public.sedes 
        ORDER BY (id = 'SEDE-JESUS-ES-EL-CENTRO') DESC, nombre ASC
    ) s;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 6. PERMISOS Y POLÍTICAS RLS PARA SEDES
GRANT ALL ON TABLE public.sedes TO anon, authenticated, service_role;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    EXECUTE 'CREATE POLICY "Allow anon all on sedes" ON public.sedes FOR ALL USING (true) WITH CHECK (true)';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FIN DEL SCRIPT MULTI-SEDE V1
