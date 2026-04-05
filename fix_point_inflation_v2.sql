-- fix_point_inflation_v2.sql

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
    v_xp_gain INTEGER := 0; -- SE PONE EN 0 COMO BASE
BEGIN
    -- Obteniendo datos actuales
    SELECT last_streak_date, COALESCE(streak_count, 0)
    INTO v_last_streak_str, v_streak_count
    FROM public.agentes
    WHERE id = p_agent_id;

    -- Lógica de Reset de racha
    IF v_last_streak_str IS NOT NULL AND v_last_streak_str != '' THEN
        -- Parseo de fecha flexible
        IF v_last_streak_str ~ '^[0-9]+$' THEN
            v_last_date_tz := to_timestamp(v_last_streak_str::numeric / 1000);
        ELSE
            BEGIN
                v_last_date_tz := v_last_streak_str::timestamp with time zone;
            EXCEPTION WHEN OTHERS THEN
                v_last_date_tz := NULL;
            END;
        END IF;

        IF v_last_date_tz IS NOT NULL THEN
            -- Calcular diferencia de días naturales en Caracas
            v_diff_days := (v_now AT TIME ZONE 'America/Caracas')::date - (v_last_date_tz AT TIME ZONE 'America/Caracas')::date;
            
            IF v_diff_days <= 0 THEN
                -- Ya hizo la racha hoy, no incrementar ni dar puntos
                v_new_streak := v_streak_count;
                v_xp_gain := 0;
            ELSIF v_diff_days = 1 THEN
                -- Racha el día siguiente, aumenta.
                v_new_streak := v_streak_count + 1;
                v_xp_gain := 0; -- Mantenemos 0 para que use los multiplicadores del sistema en otras acciones
            ELSE
                -- Racha perdida
                v_new_streak := 1;
                v_xp_gain := 0;
            END IF;
        ELSE
            v_new_streak := 1;
        END IF;
    ELSE
        v_new_streak := 1;
    END IF;

    -- Actualización de Agente
    UPDATE public.agentes
    SET 
        streak_count = v_new_streak,
        last_streak_date = CAST(EXTRACT(EPOCH FROM v_now) * 1000 AS BIGINT)::TEXT,
        xp = COALESCE(xp, 0) + v_xp_gain,
        weekly_tasks = p_tasks
    WHERE id = p_agent_id;

    -- Publicar Noticia en el Feed (solo si es la racha del día o primera vez)
    IF p_verse_text IS NOT NULL AND p_verse_text != '' AND (v_diff_days IS NULL OR v_diff_days > 0) THEN
        INSERT INTO public.asistencia_visitas (agent_id, agent_name, tipo, detalle, registrado_en)
        VALUES (
            p_agent_id, 
            p_agent_name, 
            'RACHA', 
            '📖 ' || p_verse_text || ' (' || COALESCE(p_verse_ref, '') || ') | ¡He mantenido mi Consagración Diaria de ' || v_new_streak || ' días ininterrumpidos!',
            v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'newStreak', v_new_streak,
        'xpGained', v_xp_gain
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
