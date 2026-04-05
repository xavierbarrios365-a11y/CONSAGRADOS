-- SCRIPT DE CORRECCIÓN INTEGRAL DE PUNTOS Y MULTIPLICADORES
-- fix_system_logic_v3.sql

-- 1. UTILERÍA: Obtener multiplicador basado en racha
CREATE OR REPLACE FUNCTION public.calculate_streak_multiplier(p_streak INTEGER)
RETURNS FLOAT AS $$
BEGIN
    IF p_streak >= 30 THEN RETURN 2.0;
    ELSIF p_streak >= 20 THEN RETURN 1.75;
    ELSIF p_streak >= 10 THEN RETURN 1.5;
    ELSIF p_streak >= 5 THEN RETURN 1.25;
    ELSE RETURN 1.0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. CORRECCIÓN: add_xp con multiplicador automático
CREATE OR REPLACE FUNCTION public.add_xp(p_agent_id TEXT, p_amount INTEGER)
RETURNS void AS $$
DECLARE
    v_streak INTEGER;
    v_mult FLOAT;
    v_final INTEGER;
BEGIN
    SELECT COALESCE(streak_count, 0) INTO v_streak FROM public.agentes WHERE id = p_agent_id;
    v_mult := public.calculate_streak_multiplier(v_streak);
    v_final := floor(p_amount * v_mult);

    UPDATE public.agentes SET xp = COALESCE(xp, 0) + v_final WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CORRECCIÓN: update_agent_points_secure con multiplicador centralizado
-- Primero dropeamos para evitar error de parámetros por defecto
DROP FUNCTION IF EXISTS public.update_agent_points_secure(TEXT, TEXT, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.update_agent_points_secure(
    p_agent_id TEXT, 
    p_type TEXT, 
    p_amount INTEGER, 
    p_streak_count INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_streak INTEGER;
    v_mult FLOAT;
    v_final INTEGER;
BEGIN
    -- Obtener racha (la actual del agente)
    SELECT COALESCE(streak_count, 0) INTO v_streak FROM public.agentes WHERE id = p_agent_id;
    v_mult := public.calculate_streak_multiplier(v_streak);
    v_final := floor(p_amount * v_mult);

    IF p_type = 'BIBLIA' THEN
        UPDATE public.agentes 
        SET bible = COALESCE(bible, 0) + v_final, xp = COALESCE(xp, 0) + v_final 
        WHERE id = p_agent_id;
    ELSIF p_type = 'APUNTES' THEN
        UPDATE public.agentes 
        SET notes = COALESCE(notes, 0) + v_final, xp = COALESCE(xp, 0) + v_final 
        WHERE id = p_agent_id;
    ELSIF p_type = 'LIDERAZGO' THEN
        UPDATE public.agentes 
        SET leadership = COALESCE(leadership, 0) + v_final, xp = COALESCE(xp, 0) + v_final 
        WHERE id = p_agent_id;
    ELSIF p_type = 'XP' OR p_type = 'CONDUCTA' THEN 
        PERFORM public.add_xp(p_agent_id, p_amount); -- add_xp ya aplica su propio multiplicador
    END IF;

    -- Si el front manda una actualización de racha, la aplicamos
    IF p_streak_count > 0 THEN
        UPDATE public.agentes 
        SET streak_count = p_streak_count, 
            last_streak_date = CAST(EXTRACT(EPOCH FROM now()) * 1000 AS BIGINT)::TEXT 
        WHERE id = p_agent_id;
    END IF;

    -- Evitar valores negativos
    UPDATE public.agentes 
    SET xp = GREATEST(0, xp), bible = GREATEST(0, bible), notes = GREATEST(0, notes), leadership = GREATEST(0, leadership)
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CORRECCIÓN: update_agent_streak_v2 (Evitar inflación y spam)
DROP FUNCTION IF EXISTS public.update_agent_streak_v2(text,jsonb,boolean,text,text,text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_agent_streak_v2(
    p_agent_id TEXT,
    p_tasks JSONB,
    p_is_week_complete BOOLEAN,
    p_agent_name TEXT,
    p_verse_text TEXT,
    p_verse_ref TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_last_streak_str TEXT;
    v_streak_count INTEGER;
    v_new_streak INTEGER;
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_last_date_tz TIMESTAMP WITH TIME ZONE;
    v_diff_days INTEGER;
    v_xp_gain INTEGER := 0; -- BASE 0 XP
BEGIN
    SELECT last_streak_date, COALESCE(streak_count, 0) FROM public.agentes WHERE id = p_agent_id INTO v_last_streak_str, v_streak_count;

    IF v_last_streak_str IS NOT NULL AND v_last_streak_str != '' THEN
        IF v_last_streak_str ~ '^[0-9]+$' THEN v_last_date_tz := to_timestamp(v_last_streak_str::numeric / 1000);
        ELSE v_last_date_tz := v_last_streak_str::timestamp with time zone;
        END IF;

        IF v_last_date_tz IS NOT NULL THEN
            v_diff_days := (v_now AT TIME ZONE 'America/Caracas')::date - (v_last_date_tz AT TIME ZONE 'America/Caracas')::date;
            IF v_diff_days <= 0 THEN v_new_streak := v_streak_count; -- Ya lo hizo hoy
            ELSIF v_diff_days = 1 THEN v_new_streak := v_streak_count + 1; -- Día consecutivo
            ELSE v_new_streak := 1; -- Racha perdida
            END IF;
        ELSE v_new_streak := 1;
        END IF;
    ELSE v_new_streak := 1;
    END IF;

    UPDATE public.agentes
    SET streak_count = v_new_streak,
        last_streak_date = CAST(EXTRACT(EPOCH FROM v_now) * 1000 AS BIGINT)::TEXT,
        weekly_tasks = p_tasks
    WHERE id = p_agent_id;

    -- Feed (solo si es nuevo día)
    IF p_verse_text != '' AND (v_diff_days IS NULL OR v_diff_days > 0) THEN
        INSERT INTO public.asistencia_visitas (agent_id, agent_name, tipo, detalle, registrado_en)
        VALUES (p_agent_id, p_agent_name, 'RACHA', '📖 ' || p_verse_text || ' | Racha: ' || v_new_streak || ' días.', v_now);
    END IF;

    RETURN jsonb_build_object('newStreak', v_new_streak, 'xpGained', v_xp_gain);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CORRECCIÓN: transfer_bible_war_xp para que use add_xp (y aplique multiplicador)
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
    SELECT gladiator_a_id, gladiator_b_id, COALESCE(accumulated_pot, 0)
    INTO v_gladiator_a, v_gladiator_b, v_pot
    FROM public.bible_war_sessions WHERE id = v_session_id;

    v_total_to_win := p_amount + v_pot;

    IF p_winner = 'A' AND v_gladiator_a IS NOT NULL THEN
        PERFORM public.add_xp(v_gladiator_a, v_total_to_win);
        UPDATE public.bible_war_sessions SET score_a = score_a + 1, accumulated_pot = 0 WHERE id = v_session_id;
    ELSIF p_winner = 'B' AND v_gladiator_b IS NOT NULL THEN
        PERFORM public.add_xp(v_gladiator_b, v_total_to_win);
        UPDATE public.bible_war_sessions SET score_b = score_b + 1, accumulated_pot = 0 WHERE id = v_session_id;
    ELSIF p_winner = 'TIE' THEN
        IF v_gladiator_a IS NOT NULL THEN PERFORM public.add_xp(v_gladiator_a, p_amount); END IF;
        IF v_gladiator_b IS NOT NULL THEN PERFORM public.add_xp(v_gladiator_b, p_amount); END IF;
        UPDATE public.bible_war_sessions SET score_a = score_a + 1, score_b = score_b + 1 WHERE id = v_session_id;
    ELSIF p_winner = 'NONE' THEN
        UPDATE public.bible_war_sessions SET accumulated_pot = accumulated_pot + p_amount WHERE id = v_session_id;
    END IF;

    UPDATE public.bible_war_sessions SET status = 'RESOLVED', last_winner = p_winner, updated_at = now() WHERE id = v_session_id;
    RETURN jsonb_build_object('success', true, 'winner', p_winner);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SCHEMA: Asegurar columnas para Academia
ALTER TABLE public.academy_progress ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.academy_progress ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- 7. PERMISOS
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
