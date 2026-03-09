-- ==========================================
-- GAME EXPANSION: Arena Online & Proyecto Nehemías
-- ==========================================

-- 1. Tabla de Desafíos (Invitaciones)
CREATE TABLE IF NOT EXISTS public.duelo_desafios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retador_id TEXT REFERENCES agentes(id) ON DELETE CASCADE,
    oponente_id TEXT REFERENCES agentes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, ACEPTADO, RECHAZADO, COMPLETADO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    session_id UUID -- ID de la sesión de duelo si es aceptado
);

-- 2. Tabla de Sesiones de Duelo (1v1 Real-time)
-- Basada en bible_war_sessions pero aislada para múltiples duelos simultáneos
CREATE TABLE IF NOT EXISTS public.duelo_sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gladiator_a_id TEXT REFERENCES agentes(id),
    gladiator_b_id TEXT REFERENCES agentes(id),
    status TEXT DEFAULT 'WAITING', -- WAITING, ACTIVE, RESOLVED, FINISHED
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    current_question_id UUID,
    active_team TEXT, -- 'A' o 'B'
    stakes_xp INTEGER DEFAULT 0, -- Normalmente 0 para "sin riesgo"
    timer_end_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Columnas adicionales para Agentes
ALTER TABLE public.agentes 
ADD COLUMN IF NOT EXISTS iq_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS duel_stats JSONB DEFAULT '{"wins": 0, "losses": 0, "draws": 0}'::JSONB;

-- 3.5. Tabla de Récords de Tiempo para Proyecto Nehemías
CREATE TABLE IF NOT EXISTS public.iq_best_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT REFERENCES agentes(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    time_seconds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(agent_id, level)
);

-- 4. Permisos
GRANT ALL ON public.duelo_desafios TO anon;
GRANT ALL ON public.duelo_sesiones TO anon;
GRANT ALL ON public.iq_best_times TO anon;

-- ========================================================
-- RPC PARA RESOLVER JUEGO IQ (BYPASS RLS)
-- ========================================================
CREATE OR REPLACE FUNCTION public.process_iq_level_complete(
    p_agent_id_input TEXT,
    p_level_achieved INTEGER,
    p_time_taken_secs INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_real_id TEXT;
    v_nombre TEXT;
    v_current_iq INTEGER;
BEGIN
    -- 1. Buscar al agente ignorando mayúsculas/minúsculas
    SELECT id, nombre, COALESCE(iq_level, 0)
    INTO v_real_id, v_nombre, v_current_iq
    FROM public.agentes
    WHERE id ILIKE p_agent_id_input;

    -- 2. Validar si existe
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    -- 3. Actualizar el nivel si rompió su récord
    IF p_level_achieved > v_current_iq THEN
        UPDATE public.agentes 
        SET iq_level = p_level_achieved, updated_at = timezone('utc'::text, now())
        WHERE id = v_real_id;
    END IF;

    -- 3.5 Guardar tiempo record en la nueva tabla (Ranking Velocidad)
    IF p_time_taken_secs > 0 THEN
        INSERT INTO public.iq_best_times (agent_id, level, time_seconds)
        VALUES (v_real_id, p_level_achieved, p_time_taken_secs)
        ON CONFLICT (agent_id, level) DO UPDATE 
        SET time_seconds = LEAST(public.iq_best_times.time_seconds, EXCLUDED.time_seconds),
            created_at = CASE WHEN EXCLUDED.time_seconds < public.iq_best_times.time_seconds THEN timezone('utc'::text, now()) ELSE public.iq_best_times.created_at END;
    END IF;

    -- 4. Devolver info al frontend para el Intel Feed y el XP
    RETURN jsonb_build_object(
        'success', true,
        'real_id', v_real_id,
        'nombre', v_nombre,
        'current_iq', v_current_iq
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_iq_level_complete(TEXT, INTEGER, INTEGER) TO anon;
