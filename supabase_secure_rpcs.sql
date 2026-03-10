-- ========================================================
-- RPCs PARA ESCRITURA SEGURA (BYPASS DE RESTRICCIÃ“N DE COLUMNAS)
-- ========================================================

-- 1. SincronizaciÃ³n completa del agente
CREATE OR REPLACE FUNCTION public.sync_agent_profile(payload JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.agentes (
    id, nombre, xp, rango, cargo, whatsapp, foto_url, pin, 
    is_ai_profile_pending, tactical_stats, tactor_summary, talent, 
    baptism_status, status, bible, notes, leadership, user_role, 
    joined_date, birthday, relationship_with_god, security_question, 
    security_answer, must_change_password, biometric_credential, 
    streak_count, last_streak_date, last_attendance, weekly_tasks, 
    notif_prefs, last_course
  )
  VALUES (
    payload->>'id',
    payload->>'nombre',
    COALESCE(NULLIF(payload->>'xp', '')::INTEGER, 0),
    payload->>'rango',
    payload->>'cargo',
    payload->>'whatsapp',
    payload->>'foto_url',
    payload->>'pin',
    COALESCE((payload->>'is_ai_profile_pending')::BOOLEAN, FALSE),
    COALESCE(payload->'tactical_stats', '{}'::JSONB),
    payload->>'tactor_summary',
    payload->>'talent',
    payload->>'baptism_status',
    COALESCE(payload->>'status', 'ACTIVO'),
    COALESCE(NULLIF(payload->>'bible', '')::INTEGER, 0),
    COALESCE(NULLIF(payload->>'notes', '')::INTEGER, 0),
    COALESCE(NULLIF(payload->>'leadership', '')::INTEGER, 0),
    COALESCE(payload->>'user_role', 'AGENT'),
    payload->>'joined_date',
    payload->>'birthday',
    payload->>'relationship_with_god',
    payload->>'security_question',
    payload->>'security_answer',
    COALESCE((payload->>'must_change_password')::BOOLEAN, FALSE),
    payload->>'biometric_credential',
    COALESCE(NULLIF(payload->>'streak_count', '')::INTEGER, 0),
    payload->>'last_streak_date',
    payload->>'last_attendance',
    COALESCE(payload->'weekly_tasks', '[]'::JSONB),
    COALESCE(payload->'notif_prefs', '{"read": [], "deleted": []}'::JSONB),
    payload->>'last_course'
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    -- BLINDAJE: Solo actualizar si el valor recibido es mayor (anti-reset de Sheets)
    xp = GREATEST(agentes.xp, EXCLUDED.xp),
    bible = GREATEST(agentes.bible, EXCLUDED.bible),
    notes = GREATEST(agentes.notes, EXCLUDED.notes),
    leadership = GREATEST(agentes.leadership, EXCLUDED.leadership),
    rango = EXCLUDED.rango,
    cargo = EXCLUDED.cargo,
    -- BLINDAJE: Nunca sobrescribir campos sensibles con valores vacÃ­os
    whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), agentes.whatsapp),
    foto_url = COALESCE(NULLIF(EXCLUDED.foto_url, ''), agentes.foto_url),
    pin = COALESCE(NULLIF(EXCLUDED.pin, ''), agentes.pin),
    is_ai_profile_pending = EXCLUDED.is_ai_profile_pending,
    tactical_stats = EXCLUDED.tactical_stats,
    tactor_summary = EXCLUDED.tactor_summary,
    talent = EXCLUDED.talent,
    baptism_status = EXCLUDED.baptism_status,
    status = EXCLUDED.status,
    user_role = EXCLUDED.user_role,
    joined_date = EXCLUDED.joined_date,
    birthday = EXCLUDED.birthday,
    relationship_with_god = EXCLUDED.relationship_with_god,
    security_question = EXCLUDED.security_question,
    security_answer = COALESCE(NULLIF(EXCLUDED.security_answer, ''), agentes.security_answer),
    must_change_password = EXCLUDED.must_change_password,
    biometric_credential = COALESCE(NULLIF(EXCLUDED.biometric_credential, ''), agentes.biometric_credential),
    -- BLINDAJE: NUNCA tocar streak desde el sync â€” solo update_agent_streak lo maneja
    streak_count = agentes.streak_count,
    last_streak_date = agentes.last_streak_date,
    -- BLINDAJE: Nunca sobrescribir asistencia o tareas con valores vacÃ­os si ya existen
    last_attendance = COALESCE(NULLIF(EXCLUDED.last_attendance, ''), agentes.last_attendance),
    weekly_tasks = CASE 
      WHEN jsonb_array_length(EXCLUDED.weekly_tasks) > 0 THEN EXCLUDED.weekly_tasks
      ELSE agentes.weekly_tasks
    END,
    notif_prefs = CASE 
      WHEN (EXCLUDED.notif_prefs->'read' IS NOT NULL AND jsonb_array_length(EXCLUDED.notif_prefs->'read') > 0) 
           OR (EXCLUDED.notif_prefs->'deleted' IS NOT NULL AND jsonb_array_length(EXCLUDED.notif_prefs->'deleted') > 0)
      THEN EXCLUDED.notif_prefs
      ELSE agentes.notif_prefs
    END,
    updated_at = timezone('utc'::text, now());
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_agent_profile(JSONB) TO anon;

-- 2. ActualizaciÃ³n especÃ­fica del PIN
CREATE OR REPLACE FUNCTION public.update_agent_pin(p_id TEXT, p_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes SET pin = p_pin, updated_at = timezone('utc'::text, now()) WHERE id = p_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_pin(TEXT, TEXT) TO anon;

-- 3. FCM Token (usado en UseFirebaseMessaging)
CREATE OR REPLACE FUNCTION public.update_agent_fcm(p_id TEXT, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes SET fcm_token = p_token, updated_at = timezone('utc'::text, now()) WHERE id = p_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_fcm(TEXT, TEXT) TO anon;

-- 4. ActualizaciÃ³n de Rachas/Puntos RÃ¡pidos desde App.tsx
CREATE OR REPLACE FUNCTION public.update_agent_streak(p_id TEXT, p_streak INTEGER, p_date TEXT, p_tasks JSONB, p_xp INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  row_count INTEGER;
BEGIN
  UPDATE public.agentes SET 
    streak_count = p_streak, 
    last_streak_date = p_date, 
    weekly_tasks = p_tasks,
    xp = p_xp,
    updated_at = timezone('utc'::text, now()) 
  WHERE id = p_id;
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_streak(TEXT, INTEGER, TEXT, JSONB, INTEGER) TO anon;

-- 6. ActualizaciÃ³n de BiometrÃ­a
CREATE OR REPLACE FUNCTION public.update_agent_biometric(p_id TEXT, p_credential TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes SET biometric_credential = p_credential, updated_at = timezone('utc'::text, now()) WHERE id = p_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_biometric(TEXT, TEXT) TO anon;

-- 5. ActualizaciÃ³n desde el Panel de Admin
CREATE OR REPLACE FUNCTION public.update_agent_admin(
  p_id TEXT, 
  p_nombre TEXT, 
  p_xp INTEGER, 
  p_rango TEXT, 
  p_cargo TEXT, 
  p_whatsapp TEXT, 
  p_pin TEXT, 
  p_foto_url TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes SET 
    nombre = COALESCE(p_nombre, nombre),
    xp = COALESCE(p_xp, xp),
    rango = COALESCE(p_rango, rango),
    cargo = COALESCE(p_cargo, cargo),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    pin = COALESCE(p_pin, pin),
    foto_url = COALESCE(p_foto_url, foto_url),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_admin(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- 10. Incremento AtÃ³mico de Puntos (Blindaje Nuclear contra condiciones de carrera)
CREATE OR REPLACE FUNCTION public.atomic_increment_points(
  p_agent_id TEXT, 
  p_type TEXT, 
  p_amount INTEGER, 
  p_multiplier FLOAT DEFAULT 1.0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_adjusted_amount INTEGER;
BEGIN
  v_adjusted_amount := round(p_amount * p_multiplier);
  
  IF p_type = 'BIBLIA' THEN
    UPDATE public.agentes SET bible = bible + p_amount, xp = xp + v_adjusted_amount, updated_at = now() WHERE id = p_agent_id;
  ELSIF p_type = 'APUNTES' THEN
    UPDATE public.agentes SET notes = notes + p_amount, xp = xp + v_adjusted_amount, updated_at = now() WHERE id = p_agent_id;
  ELSIF p_type = 'LIDERAZGO' THEN
    UPDATE public.agentes SET leadership = leadership + p_amount, xp = xp + v_adjusted_amount, updated_at = now() WHERE id = p_agent_id;
  ELSIF p_type = 'XP' THEN
    UPDATE public.agentes SET xp = xp + v_adjusted_amount, updated_at = now() WHERE id = p_agent_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.atomic_increment_points(TEXT, TEXT, INTEGER, FLOAT) TO anon;

NOTIFY pgrst, 'reload schema';
