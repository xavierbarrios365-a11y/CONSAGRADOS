-- fix_bible_war_victory.sql
-- Este script habilita las columnas faltantes y el RPC necesario para resolver victorias y transferir XP.

-- 1. Añadir columnas faltantes a bible_war_sessions
ALTER TABLE public.bible_war_sessions 
ADD COLUMN IF NOT EXISTS used_questions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_coin_flip TEXT,
ADD COLUMN IF NOT EXISTS timer_status TEXT DEFAULT 'STOPPED',
ADD COLUMN IF NOT EXISTS timer_end_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gladiator_a_id TEXT,
ADD COLUMN IF NOT EXISTS gladiator_b_id TEXT,
ADD COLUMN IF NOT EXISTS last_winner TEXT;

-- 2. Crear el RPC transfer_bible_war_xp
CREATE OR REPLACE FUNCTION public.transfer_bible_war_xp(
    p_winner TEXT, -- 'A', 'B', 'NONE', 'TIE'
    p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_session_id UUID := '00000000-0000-0000-0000-000000000001';
    v_gladiator_a TEXT;
    v_gladiator_b TEXT;
    v_pot INTEGER;
    v_total_to_win INTEGER;
BEGIN
    -- 1. Obtener datos de la sesión actual
    SELECT gladiator_a_id, gladiator_b_id, COALESCE(accumulated_pot, 0)
    INTO v_gladiator_a, v_gladiator_b, v_pot
    FROM public.bible_war_sessions
    WHERE id = v_session_id;

    v_total_to_win := p_amount + v_pot;

    -- 2. Procesar Ganador
    IF p_winner = 'A' AND v_gladiator_a IS NOT NULL THEN
        -- Gana Alfa: Se lleva los stakes + el pozo
        UPDATE public.agentes SET xp = xp + v_total_to_win WHERE id = v_gladiator_a;
        UPDATE public.bible_war_sessions 
        SET score_a = score_a + 1, accumulated_pot = 0 
        WHERE id = v_session_id;
        
    ELSIF p_winner = 'B' AND v_gladiator_b IS NOT NULL THEN
        -- Gana Bravo: Se lleva los stakes + el pozo
        UPDATE public.agentes SET xp = xp + v_total_to_win WHERE id = v_gladiator_b;
        UPDATE public.bible_war_sessions 
        SET score_b = score_b + 1, accumulated_pot = 0 
        WHERE id = v_session_id;

    ELSIF p_winner = 'TIE' THEN
        -- Empate: Ambos ganan los stakes
        IF v_gladiator_a IS NOT NULL THEN
            UPDATE public.agentes SET xp = xp + p_amount WHERE id = v_gladiator_a;
        END IF;
        IF v_gladiator_b IS NOT NULL THEN
            UPDATE public.agentes SET xp = xp + p_amount WHERE id = v_gladiator_b;
        END IF;
        UPDATE public.bible_war_sessions SET score_a = score_a + 1, score_b = score_b + 1 WHERE id = v_session_id;

    ELSIF p_winner = 'NONE' THEN
        -- Nadie gana: Los stakes van al pozo
        UPDATE public.bible_war_sessions 
        SET accumulated_pot = accumulated_pot + p_amount 
        WHERE id = v_session_id;
    END IF;

    -- 3. Resetear estado de la ronda
    UPDATE public.bible_war_sessions
    SET 
        status = 'RESOLVED',
        last_winner = p_winner,
        current_question_id = NULL,
        answer_a = NULL,
        answer_b = NULL,
        active_team = NULL,
        updated_at = now()
    WHERE id = v_session_id;

    RETURN jsonb_build_object('success', true, 'winner', p_winner, 'xp_transferred', v_total_to_win);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION public.transfer_bible_war_xp(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.transfer_bible_war_xp(TEXT, INTEGER) TO authenticated;
