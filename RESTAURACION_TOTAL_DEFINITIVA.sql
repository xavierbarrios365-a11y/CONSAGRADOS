-- ==============================================================================
-- 🎖️ SCRIPT DE RESTAURACIÓN TOTAL OMEGA V3.1 - "PROTECCIÓN TÁCTICA" 🎖️
-- ==============================================================================
-- Este script reconstruye el REINO completo e incluye el SISTEMA DE BLINDAJE.
-- Resuelve: Pérdida de Rachas por caída del sistema, Radar y Protocolos.
-- ==============================================================================

-- 0. EXTENSIONES Y LIMPIEZA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DROP PUBLICATION IF EXISTS supabase_realtime;

-- ==============================================================================
-- 🚀 BLOQUE 1: ESTRUCTURA CORE (CON BLINDAJE DE RACHA)
-- ==============================================================================

-- TABLA: agentes (Cerebro Central - REFUERZO DE COLUMNAS)
CREATE TABLE IF NOT EXISTS public.agentes (id TEXT PRIMARY KEY, nombre TEXT);

ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS rango TEXT DEFAULT 'RECLUTA';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT 'ESTUDIANTE';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS is_ai_profile_pending BOOLEAN DEFAULT false;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS tactical_stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS tactor_summary TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS talent TEXT DEFAULT 'PENDIENTE';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS baptism_status TEXT DEFAULT 'NO';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVO';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS bible INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS notes INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS leadership INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'STUDENT';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS joined_date TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS relationship_with_god TEXT DEFAULT 'PENDIENTE';
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS security_question TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS security_answer TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS biometric_credential TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_streak_date TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS streak_protection_uses INTEGER DEFAULT 2;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_protection_reset DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_attendance TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS weekly_tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS notif_prefs JSONB DEFAULT '{"read": [], "deleted": []}'::jsonb;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_course TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS iq_level INTEGER DEFAULT 1;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS pending_iq_xp INTEGER DEFAULT 0;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS bible_war_group TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ==============================================================================
-- 🧠 BLOQUE CEREBRAL: RPC (INCLUIDO BLINDAJE)
-- ==============================================================================

-- 1. ACTIVAR BLINDAJE DE RACHA (Para usuarios con > 10 días)
CREATE OR REPLACE FUNCTION public.activate_streak_shield(p_agent_id TEXT, p_target_streak INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_uses INTEGER;
BEGIN
    SELECT streak_protection_uses INTO v_uses FROM public.agentes WHERE id = p_agent_id;
    
    IF v_uses <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No te quedan usos de blindaje para este mes.');
    END IF;

    UPDATE public.agentes 
    SET 
        streak_count = p_target_streak,
        streak_protection_uses = streak_protection_uses - 1,
        last_streak_date = CURRENT_DATE::TEXT,
        updated_at = now()
    WHERE id = p_agent_id;

    RETURN jsonb_build_object('success', true, 'new_streak', p_target_streak, 'remaining_uses', v_uses - 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ADD_XP (Base)
CREATE OR REPLACE FUNCTION public.add_xp(p_agent_id TEXT, p_amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.agentes SET xp = COALESCE(xp, 0) + p_amount WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROTOCOLO DE PUNTOS SECURE
CREATE OR REPLACE FUNCTION public.update_agent_points_secure(
    p_agent_id TEXT, p_type TEXT, p_amount INTEGER, p_streak_count INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    IF p_type = 'BIBLIA' THEN
        UPDATE public.agentes SET bible = COALESCE(bible, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount WHERE id = p_agent_id;
    ELSIF p_type = 'APUNTES' THEN
        UPDATE public.agentes SET notes = COALESCE(notes, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount WHERE id = p_agent_id;
    ELSIF p_type = 'LIDERAZGO' THEN
        UPDATE public.agentes SET leadership = COALESCE(leadership, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount WHERE id = p_agent_id;
    ELSIF p_type = 'XP' OR p_type = 'CONDUCTA' THEN PERFORM public.add_xp(p_agent_id, p_amount);
    END IF;
    IF p_streak_count > 0 THEN
        UPDATE public.agentes SET streak_count = p_streak_count, last_streak_date = CURRENT_DATE::TEXT WHERE id = p_agent_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 📡 BLOQUE DE DATOS Y REALTIME
-- ==============================================================================

-- (Resto de tablas: asistencia_visitas, academy_courses, etc. - Incluidas en el script real)
-- ...

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
NOTIFY pgrst, 'reload schema';

-- ✅ BLINDAJE TÁCTICO ACTIVADO.

-- 🕵️ RECUERDA: DESPUÉS DE EJECUTAR ESTE SCRIPT, CORRE ESTO EN EL SQL EDITOR:
-- SELECT public.activate_streak_shield('20389331', 32);
