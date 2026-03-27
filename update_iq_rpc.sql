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
    v_xp_reward INTEGER;
    v_first_time BOOLEAN;
BEGIN
    SELECT id, nombre, COALESCE(iq_level, 0)
    INTO v_real_id, v_nombre, v_current_iq
    FROM public.agentes
    WHERE id ILIKE p_agent_id_input;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    -- FIX: Solo acumular XP si es la PRIMERA VEZ que completa este nivel
    -- Si iq_level ya es mayor, el nivel fue completado antes → no sumar XP al pozo
    v_first_time := (p_level_achieved >= v_current_iq);
    v_xp_reward := 50 + (p_level_achieved * 5);

    IF v_first_time THEN
        UPDATE public.agentes
        SET iq_level = GREATEST(iq_level, p_level_achieved + 1),
            pending_iq_xp = COALESCE(pending_iq_xp, 0) + v_xp_reward,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_real_id;
    END IF;

    -- Siempre guardar mejor tiempo (rejugar está permitido para batir récords)
    IF p_time_taken_secs > 0 THEN
        INSERT INTO public.iq_best_times (agent_id, level, time_seconds)
        VALUES (v_real_id, p_level_achieved, p_time_taken_secs)
        ON CONFLICT (agent_id, level) DO UPDATE
        SET time_seconds = LEAST(public.iq_best_times.time_seconds, EXCLUDED.time_seconds),
            created_at = CASE
                WHEN EXCLUDED.time_seconds < public.iq_best_times.time_seconds
                THEN timezone('utc'::text, now())
                ELSE public.iq_best_times.created_at
            END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'first_time', v_first_time,
        'xp_added_to_pool', CASE WHEN v_first_time THEN v_xp_reward ELSE 0 END,
        'current_iq', GREATEST(v_current_iq, p_level_achieved + 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC para finalizar la campaña y otorgar XP proporcionales basándose en el examen
CREATE OR REPLACE FUNCTION public.finalize_iq_campaign(
    p_agent_id_input TEXT,
    p_exam_score INTEGER -- Porcentaje de aciertos (0-100)
)
RETURNS JSONB AS $$
DECLARE
    v_real_id TEXT;
    v_pending_xp INTEGER;
    v_final_xp INTEGER;
BEGIN
    SELECT id, COALESCE(pending_iq_xp, 0)
    INTO v_real_id, v_pending_xp
    FROM public.agentes
    WHERE id ILIKE p_agent_id_input;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    -- Si el puntaje es menor al 50%, no se otorga nada del pozo
    IF p_exam_score < 50 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Puntaje insuficiente para reclamar recompensa', 'score', p_exam_score);
    END IF;

    -- Calcular XP final proporcional: Pozo * (Score / 100)
    v_final_xp := floor(v_pending_xp * (p_exam_score::float / 100));

    -- Otorgar XP reales y limpiar el pozo
    UPDATE public.agentes
    SET pending_iq_xp = 0,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_real_id;

    PERFORM public.add_xp(v_real_id, v_final_xp);

    RETURN jsonb_build_object(
        'success', true,
        'xp_awarded', v_final_xp,
        'pool_cleared', v_pending_xp,
        'score', p_exam_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Script de Reinicio General Nehemías
CREATE OR REPLACE FUNCTION public.reset_nehemias_campaign()
RETURNS JSONB AS $$
BEGIN
    -- No se requiere ALTER TABLE aquí si ya existe la columna
    UPDATE public.agentes
    SET iq_level = 1,
        pending_iq_xp = 0,
        updated_at = timezone('utc'::text, now());
    
    -- Opcional: Limpiar tiempos mejores si se desea un reinicio total de tabla de posiciones
    -- DELETE FROM public.iq_best_times;

    RETURN jsonb_build_object('success', true, 'message', 'Campaña Nehemías reiniciada para todos los agentes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

