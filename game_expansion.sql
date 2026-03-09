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

-- 4. Permisos
GRANT ALL ON public.duelo_desafios TO anon;
GRANT ALL ON public.duelo_sesiones TO anon;
