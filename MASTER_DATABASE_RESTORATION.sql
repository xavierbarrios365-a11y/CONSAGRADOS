-- ==============================================================================
-- 🛡️ CONSAGRADOS 2026 - MASTER DATABASE RESTORATION & EXPANSION SCRIPT (V4 FINAL PERFECCIONADO)
-- ==============================================================================
-- Ejecuta este script completo en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/dnzrnpslfabowgtikora
-- ==============================================================================

-- 1. ASEGURAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ASEGURAR COLUMNAS EN TABLAS HISTÓRICAS
ALTER TABLE IF EXISTS public.agentes 
    ADD COLUMN IF NOT EXISTS pending_iq_xp INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duel_stats JSONB DEFAULT '{"wins": 0, "losses": 0, "draws": 0}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_streak_date TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS racha_proteccion INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fcm_token TEXT,
    ADD COLUMN IF NOT EXISTS notif_prefs JSONB DEFAULT '{"read": [], "deleted": []}'::jsonb,
    ADD COLUMN IF NOT EXISTS weekly_tasks JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tactical_stats JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS tactor_summary TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS security_question TEXT,
    ADD COLUMN IF NOT EXISTS security_answer TEXT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS biometric_credential TEXT,
    ADD COLUMN IF NOT EXISTS iq_level INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS bible_war_group TEXT,
    ADD COLUMN IF NOT EXISTS last_course TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_attendance TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.asistencia_visitas
    ADD COLUMN IF NOT EXISTS nombre TEXT,
    ADD COLUMN IF NOT EXISTS registrado_por TEXT DEFAULT 'SISTEMA',
    ADD COLUMN IF NOT EXISTS xp_otorgado INTEGER DEFAULT 0;

-- 3. LIMPIEZA DINÁMICA DE FUNCIONES ANTERIORES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'update_agent_points_secure',
              'update_agent_streak_v3',
              'submit_transaction_v2',
              'confirm_event_attendance_v2',
              'confirm_director_attendance',
              'process_iq_level_complete',
              'recover_agent_pin',
              'reset_password_with_answer',
              'transfer_bible_war_xp',
              'register_visitor_attendance',
              'apply_absence_penalties_v2',
              'sync_agent_profile',
              'log_system_notification'
          )
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- 4. PROCEDIMIENTOS ALMACENADOS (RPCS)

-- 4.1 Actualización Atómica y Segura de Puntos XP
CREATE OR REPLACE FUNCTION public.update_agent_points_secure(
    p_agent_id TEXT,
    p_type TEXT,
    p_amount INTEGER,
    p_streak_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_multiplier NUMERIC := 1.0;
    v_final_amount INTEGER;
    v_current_xp INTEGER;
    v_current_bible INTEGER;
    v_current_notes INTEGER;
    v_current_leadership INTEGER;
    v_new_rango TEXT;
    v_agent_name TEXT;
BEGIN
    IF p_streak_count >= 14 THEN
        v_multiplier := 2.0;
    ELSIF p_streak_count >= 7 THEN
        v_multiplier := 1.5;
    ELSIF p_streak_count >= 3 THEN
        v_multiplier := 1.2;
    END IF;

    v_final_amount := ROUND(p_amount * v_multiplier);

    SELECT nombre, COALESCE(xp, 0), COALESCE(bible, 0), COALESCE(notes, 0), COALESCE(leadership, 0)
    INTO v_agent_name, v_current_xp, v_current_bible, v_current_notes, v_current_leadership
    FROM public.agentes
    WHERE id = p_agent_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    IF p_type = 'XP' THEN
        v_current_xp := v_current_xp + v_final_amount;
    ELSIF p_type = 'BIBLIA' THEN
        v_current_bible := v_current_bible + p_amount;
        v_current_xp := v_current_xp + v_final_amount;
    ELSIF p_type = 'APUNTES' THEN
        v_current_notes := v_current_notes + p_amount;
        v_current_xp := v_current_xp + v_final_amount;
    ELSIF p_type = 'LIDERAZGO' THEN
        v_current_leadership := v_current_leadership + p_amount;
        v_current_xp := v_current_xp + v_final_amount;
    END IF;

    IF v_current_xp >= 1000 THEN
        v_new_rango := 'LÍDER';
    ELSIF v_current_xp >= 700 THEN
        v_new_rango := 'REFERENTE';
    ELSIF v_current_xp >= 500 THEN
        v_new_rango := 'CONSAGRADO';
    ELSIF v_current_xp >= 300 THEN
        v_new_rango := 'ACTIVO';
    ELSE
        v_new_rango := 'RECLUTA';
    END IF;

    UPDATE public.agentes
    SET xp = v_current_xp,
        bible = v_current_bible,
        notes = v_current_notes,
        leadership = v_current_leadership,
        rango = CASE WHEN user_role = 'DIRECTOR' THEN rango ELSE v_new_rango END,
        updated_at = NOW()
    WHERE id = p_agent_id;

    INSERT INTO public.asistencia_visitas (agent_id, agent_name, nombre, tipo, registrado_por, registrado_en, xp_ganada, xp_otorgado, detalle)
    VALUES (p_agent_id, v_agent_name, v_agent_name, p_type, 'SISTEMA', NOW(), v_final_amount, v_final_amount, 'Asignación de puntos ' || p_type);

    RETURN jsonb_build_object(
        'success', true,
        'xp', v_current_xp,
        'added_amount', v_final_amount,
        'multiplier', v_multiplier,
        'new_rank', v_new_rango
    );
END;
$$;

-- 4.2 Actualización de Rachas Tácticas V3 (Quiz & Tareas)
CREATE OR REPLACE FUNCTION public.update_agent_streak_v3(
    p_agent_id TEXT,
    p_tasks JSONB DEFAULT '[]'::jsonb,
    p_agent_name TEXT DEFAULT 'Agente',
    p_verse_text TEXT DEFAULT '',
    p_verse_ref TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_str TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD');
    v_yesterday_str TEXT := TO_CHAR((NOW() AT TIME ZONE 'America/Caracas') - INTERVAL '1 day', 'YYYY-MM-DD');
    v_last_streak_date TEXT;
    v_streak_count INTEGER;
    v_racha_proteccion INTEGER;
    v_shield_used BOOLEAN := false;
    v_new_streak INTEGER := 1;
    v_xp_reward INTEGER := 15;
BEGIN
    SELECT COALESCE(last_streak_date, ''), COALESCE(streak_count, 0), COALESCE(racha_proteccion, 0)
    INTO v_last_streak_date, v_streak_count, v_racha_proteccion
    FROM public.agentes
    WHERE id = p_agent_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    IF v_last_streak_date = v_today_str THEN
        RETURN jsonb_build_object(
            'success', true,
            'alreadyDone', true,
            'newStreak', v_streak_count,
            'shieldUsed', false,
            'shieldsLeft', v_racha_proteccion
        );
    END IF;

    IF v_last_streak_date = v_yesterday_str THEN
        v_new_streak := v_streak_count + 1;
    ELSIF v_last_streak_date = '' OR v_streak_count = 0 THEN
        v_new_streak := 1;
    ELSE
        IF v_racha_proteccion > 0 THEN
            v_racha_proteccion := v_racha_proteccion - 1;
            v_shield_used := true;
            v_new_streak := v_streak_count + 1;
        ELSE
            v_new_streak := 1;
        END IF;
    END IF;

    IF v_new_streak % 7 = 0 THEN
        v_racha_proteccion := LEAST(v_racha_proteccion + 1, 3);
        v_xp_reward := v_xp_reward + 50;
    END IF;

    UPDATE public.agentes
    SET streak_count = v_new_streak,
        last_streak_date = v_today_str,
        racha_proteccion = v_racha_proteccion,
        xp = COALESCE(xp, 0) + v_xp_reward,
        weekly_tasks = p_tasks,
        updated_at = NOW()
    WHERE id = p_agent_id;

    IF p_verse_ref <> '' THEN
        INSERT INTO public.noticias_tacticas (type, message, agent_id, agent_name, verse, reference)
        VALUES ('RACHA', '🔥 ' || p_agent_name || ' ha asegurado su Racha Táctica (' || v_new_streak || ' días)', p_agent_id, p_agent_name, p_verse_text, p_verse_ref);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'alreadyDone', false,
        'newStreak', v_new_streak,
        'shieldUsed', v_shield_used,
        'shieldsLeft', v_racha_proteccion,
        'xpAwarded', v_xp_reward
    );
END;
$$;

-- 4.3 Registro de Transacciones / Asistencia QR V2
CREATE OR REPLACE FUNCTION public.submit_transaction_v2(
    p_agent_id TEXT,
    p_tipo TEXT DEFAULT 'ASISTENCIA',
    p_registrado_por TEXT DEFAULT 'SISTEMA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_str TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD');
    v_last_attendance TEXT;
    v_agent_name TEXT;
BEGIN
    SELECT nombre, COALESCE(last_attendance, '')
    INTO v_agent_name, v_last_attendance
    FROM public.agentes
    WHERE id = p_agent_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no registrado en la base de datos');
    END IF;

    IF p_tipo = 'ASISTENCIA' AND v_last_attendance = v_today_str THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_done', true,
            'message', 'Asistencia ya registrada previamente para hoy'
        );
    END IF;

    INSERT INTO public.asistencia_visitas (agent_id, agent_name, nombre, tipo, registrado_por, registrado_en, xp_ganada, xp_otorgado)
    VALUES (p_agent_id, v_agent_name, v_agent_name, p_tipo, p_registrado_por, NOW(), 10, 10);

    UPDATE public.agentes
    SET last_attendance = v_today_str,
        xp = COALESCE(xp, 0) + 10,
        updated_at = NOW()
    WHERE id = p_agent_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_done', false,
        'agent_id', p_agent_id,
        'agent_name', v_agent_name,
        'message', 'Asistencia registrada con éxito (+10 XP)'
    );
END;
$$;

-- 4.4 Confirmación de Asistencia a Eventos Especiales
CREATE OR REPLACE FUNCTION public.confirm_event_attendance_v2(
    p_agent_id TEXT,
    p_agent_name TEXT,
    p_event_id TEXT,
    p_event_title TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.event_responses WHERE event_id = p_event_id AND agent_id = p_agent_id) THEN
        RETURN jsonb_build_object('success', true, 'alreadyConfirmed', true);
    END IF;

    INSERT INTO public.event_responses (event_id, agent_id, agent_name, status)
    VALUES (p_event_id, p_agent_id, p_agent_name, 'CONFIRMADO');

    INSERT INTO public.asistencia_visitas (agent_id, agent_name, nombre, tipo, registrado_por, registrado_en, detalle)
    VALUES (p_agent_id, p_agent_name, p_agent_name, 'EVENTO', 'AUTOCONFIRMACIÓN', NOW(), 'Confirmación para evento: ' || p_event_title);

    RETURN jsonb_build_object('success', true, 'alreadyConfirmed', false);
END;
$$;

-- 4.5 Confirmación de Asistencia de Directores
CREATE OR REPLACE FUNCTION public.confirm_director_attendance(
    p_agent_id TEXT,
    p_agent_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_str TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Caracas', 'YYYY-MM-DD');
    v_last_attendance TEXT;
BEGIN
    SELECT COALESCE(last_attendance, '') INTO v_last_attendance FROM public.agentes WHERE id = p_agent_id;

    IF v_last_attendance = v_today_str THEN
        RETURN jsonb_build_object('success', true, 'alreadyDone', true);
    END IF;

    UPDATE public.agentes SET last_attendance = v_today_str, updated_at = NOW() WHERE id = p_agent_id;

    INSERT INTO public.asistencia_visitas (agent_id, agent_name, nombre, tipo, registrado_por, registrado_en, detalle)
    VALUES (p_agent_id, p_agent_name, p_agent_name, 'ASISTENCIA_DIRECTOR', 'CENTRO_MANDO', NOW(), 'Asistencia presencial de Dirección');

    RETURN jsonb_build_object('success', true, 'alreadyDone', false);
END;
$$;

-- 4.6 Completitud de Nivel Táctico IQ
CREATE OR REPLACE FUNCTION public.process_iq_level_complete(
    p_agent_id_input TEXT,
    p_level_achieved INTEGER,
    p_time_taken_secs INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_iq INTEGER;
    v_xp_reward INTEGER := 25;
BEGIN
    SELECT COALESCE(iq_level, 1) INTO v_current_iq FROM public.agentes WHERE id = p_agent_id_input;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    IF p_level_achieved >= v_current_iq THEN
        UPDATE public.agentes
        SET iq_level = p_level_achieved + 1,
            xp = COALESCE(xp, 0) + v_xp_reward,
            pending_iq_xp = 0,
            updated_at = NOW()
        WHERE id = p_agent_id_input;

        RETURN jsonb_build_object('success', true, 'newLevel', p_level_achieved + 1, 'xpAwarded', v_xp_reward);
    END IF;

    RETURN jsonb_build_object('success', true, 'newLevel', v_current_iq, 'xpAwarded', 0);
END;
$$;

-- 4.7 Recuperación de PIN mediante Pregunta Secreta
CREATE OR REPLACE FUNCTION public.recover_agent_pin(
    p_agent_id TEXT,
    p_answer TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_answer TEXT;
    v_pin TEXT;
BEGIN
    SELECT security_answer, pin
    INTO v_stored_answer, v_pin
    FROM public.agentes
    WHERE id = p_agent_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF LOWER(TRIM(v_stored_answer)) = LOWER(TRIM(p_answer)) THEN
        RETURN v_pin;
    END IF;

    RETURN NULL;
END;
$$;

-- 4.8 Reseteo de PIN con Respuesta de Seguridad
CREATE OR REPLACE FUNCTION public.reset_password_with_answer(
    p_id TEXT,
    p_answer TEXT,
    p_new_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_answer TEXT;
BEGIN
    SELECT security_answer INTO v_stored_answer FROM public.agentes WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF LOWER(TRIM(v_stored_answer)) = LOWER(TRIM(p_answer)) THEN
        UPDATE public.agentes
        SET pin = p_new_pin,
            must_change_password = false,
            updated_at = NOW()
        WHERE id = p_id;
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 4.9 Transferencia de XP en Guerra de Biblias (Bible War)
CREATE OR REPLACE FUNCTION public.transfer_bible_war_xp(
    p_session_id TEXT,
    p_winning_team TEXT,
    p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gladiator_id TEXT;
    v_session_uuid UUID;
BEGIN
    BEGIN
        v_session_uuid := p_session_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_session_uuid := '00000000-0000-0000-0000-000000000001'::UUID;
    END;

    IF p_winning_team = 'A' THEN
        SELECT gladiator_a_id INTO v_gladiator_id FROM public.bible_war_sessions WHERE id = v_session_uuid::TEXT OR id = p_session_id;
    ELSIF p_winning_team = 'B' THEN
        SELECT gladiator_b_id INTO v_gladiator_id FROM public.bible_war_sessions WHERE id = v_session_uuid::TEXT OR id = p_session_id;
    END IF;

    IF v_gladiator_id IS NOT NULL AND v_gladiator_id <> '' THEN
        UPDATE public.agentes
        SET xp = COALESCE(xp, 0) + p_amount,
            updated_at = NOW()
        WHERE id = v_gladiator_id;
    END IF;

    UPDATE public.bible_war_sessions
    SET status = 'RESOLVED',
        last_winner = p_winning_team,
        updated_at = NOW()
    WHERE id = v_session_uuid::TEXT OR id = p_session_id;

    RETURN jsonb_build_object('success', true, 'winner', p_winning_team, 'amount', p_amount);
END;
$$;

-- 4.10 Registro de Asistencia de Visitantes
CREATE OR REPLACE FUNCTION public.register_visitor_attendance(
    p_name TEXT,
    p_whatsapp TEXT DEFAULT 'S/D',
    p_referred_by TEXT DEFAULT '',
    p_registrado_por TEXT DEFAULT 'SISTEMA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_visitor_id TEXT := 'VIS-' || FLOOR(1000 + RANDOM() * 9000)::TEXT;
BEGIN
    INSERT INTO public.asistencia_visitas (agent_id, agent_name, nombre, tipo, registrado_por, registrado_en, detalle)
    VALUES (v_visitor_id, p_name, p_name, 'VISITA', p_registrado_por, NOW(), 'Invitado por: ' || p_referred_by || ' | Tel: ' || p_whatsapp);

    RETURN jsonb_build_object('success', true, 'visitor_id', v_visitor_id);
END;
$$;

-- 4.11 Aplicación de Penalizaciones por Ausencia (Mantenimiento)
CREATE OR REPLACE FUNCTION public.apply_absence_penalties_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE public.agentes
    SET streak_count = 0,
        racha_proteccion = GREATEST(racha_proteccion - 1, 0)
    WHERE last_streak_date < TO_CHAR((NOW() AT TIME ZONE 'America/Caracas') - INTERVAL '2 days', 'YYYY-MM-DD')
      AND streak_count > 0;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'penalized_count', v_count);
END;
$$;

-- 4.12 Sincronización de Perfil de Agente
CREATE OR REPLACE FUNCTION public.sync_agent_profile(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.agentes (
        id, nombre, xp, rango, cargo, whatsapp, foto_url, pin,
        user_role, talent, baptism_status, status, bible, notes, leadership,
        joined_date, birthday, relationship_with_god, security_question, security_answer,
        must_change_password, biometric_credential, streak_count, racha_proteccion,
        last_streak_date, last_attendance, weekly_tasks, notif_prefs, last_course, iq_level
    ) VALUES (
        payload->>'id',
        payload->>'nombre',
        COALESCE((payload->>'xp')::INTEGER, 0),
        COALESCE(payload->>'rango', 'RECLUTA'),
        COALESCE(payload->>'cargo', 'ESTUDIANTE'),
        COALESCE(payload->>'whatsapp', ''),
        COALESCE(payload->>'foto_url', ''),
        COALESCE(payload->>'pin', '1234'),
        COALESCE(payload->>'user_role', 'STUDENT'),
        COALESCE(payload->>'talent', 'PENDIENTE'),
        COALESCE(payload->>'baptism_status', 'NO'),
        COALESCE(payload->>'status', 'ACTIVO'),
        COALESCE((payload->>'bible')::INTEGER, 0),
        COALESCE((payload->>'notes')::INTEGER, 0),
        COALESCE((payload->>'leadership')::INTEGER, 0),
        COALESCE(payload->>'joined_date', ''),
        COALESCE(payload->>'birthday', ''),
        COALESCE(payload->>'relationship_with_god', 'PENDIENTE'),
        payload->>'security_question',
        payload->>'security_answer',
        COALESCE((payload->>'must_change_password')::BOOLEAN, false),
        payload->>'biometric_credential',
        COALESCE((payload->>'streak_count')::INTEGER, 0),
        COALESCE((payload->>'racha_proteccion')::INTEGER, 0),
        COALESCE(payload->>'last_streak_date', ''),
        COALESCE(payload->>'last_attendance', ''),
        COALESCE(payload->'weekly_tasks', '[]'::jsonb),
        COALESCE(payload->'notif_prefs', '{"read":[], "deleted":[]}'::jsonb),
        COALESCE(payload->>'last_course', ''),
        COALESCE((payload->>'iq_level')::INTEGER, 1)
    )
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        xp = EXCLUDED.xp,
        rango = EXCLUDED.rango,
        cargo = EXCLUDED.cargo,
        whatsapp = EXCLUDED.whatsapp,
        foto_url = EXCLUDED.foto_url,
        pin = EXCLUDED.pin,
        user_role = EXCLUDED.user_role,
        status = EXCLUDED.status,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4.13 Log de Notificaciones del Sistema
CREATE OR REPLACE FUNCTION public.log_system_notification(
    p_agent_id TEXT,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'SISTEMA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.noticias_tacticas (type, message, agent_id, agent_name)
    VALUES (p_type, '📢 ' || p_title || ': ' || p_message, p_agent_id, 'CENTRO DE INTELIGENCIA');

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. ASIGNACIÓN DE PERMISOS DE EJECUCIÓN (GRANT ALL)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- FIN DEL SCRIPT MAESTRO DE RESTAURACIÓN V4
