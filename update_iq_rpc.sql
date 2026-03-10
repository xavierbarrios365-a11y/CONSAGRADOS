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
    SELECT id, nombre, COALESCE(iq_level, 0)
    INTO v_real_id, v_nombre, v_current_iq
    FROM public.agentes
    WHERE id ILIKE p_agent_id_input;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    IF p_level_achieved >= v_current_iq THEN
        UPDATE public.agentes 
        SET iq_level = p_level_achieved + 1, updated_at = timezone('utc'::text, now())
        WHERE id = v_real_id;
    END IF;

    IF p_time_taken_secs > 0 THEN
        INSERT INTO public.iq_best_times (agent_id, level, time_seconds)
        VALUES (v_real_id, p_level_achieved, p_time_taken_secs)
        ON CONFLICT (agent_id, level) DO UPDATE 
        SET time_seconds = LEAST(public.iq_best_times.time_seconds, EXCLUDED.time_seconds),
            created_at = CASE WHEN EXCLUDED.time_seconds < public.iq_best_times.time_seconds THEN timezone('utc'::text, now()) ELSE public.iq_best_times.created_at END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'real_id', v_real_id,
        'nombre', v_nombre,
        'current_iq', v_current_iq
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
