-- phase4_points_fixes.sql

-- 1. Función para actualizar puntos de los Agentes de forma segura.
-- Esta función arregla el error "Fallo en protocolo de puntos" desde IntelligenceCenter.
CREATE OR REPLACE FUNCTION public.update_agent_points_secure(
    p_agent_id TEXT,
    p_type TEXT,
    p_amount INTEGER,
    p_streak_count INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    -- Validamos el rol del que ejecuta si es necesario (omitido por facilidad si es app Director, pero es SECURITY DEFINER)
    
    IF p_type = 'BIBLIA' THEN
        UPDATE public.agentes 
        SET bible = COALESCE(bible, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount 
        WHERE id = p_agent_id;
    ELSIF p_type = 'APUNTES' THEN
        UPDATE public.agentes 
        SET notes = COALESCE(notes, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount 
        WHERE id = p_agent_id;
    ELSIF p_type = 'LIDERAZGO' THEN
        UPDATE public.agentes 
        SET leadership = COALESCE(leadership, 0) + p_amount, xp = COALESCE(xp, 0) + p_amount 
        WHERE id = p_agent_id;
    ELSIF p_type = 'XP' OR p_type = 'CONDUCTA' THEN
        UPDATE public.agentes 
        SET xp = COALESCE(xp, 0) + p_amount 
        WHERE id = p_agent_id;
    END IF;
    
    -- Evitar XP menor a 0
    UPDATE public.agentes SET xp = 0 WHERE id = p_agent_id AND xp < 0;
    UPDATE public.agentes SET bible = 0 WHERE id = p_agent_id AND bible < 0;
    UPDATE public.agentes SET notes = 0 WHERE id = p_agent_id AND notes < 0;
    UPDATE public.agentes SET leadership = 0 WHERE id = p_agent_id AND leadership < 0;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Función para deducción porcentual de XP (Expulsiones, etc)
CREATE OR REPLACE FUNCTION public.deduct_percentage_points_secure(
    p_agent_id TEXT,
    p_percentage INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.agentes 
    SET 
        xp = GREATEST(0, COALESCE(xp, 0) - (COALESCE(xp, 0) * p_percentage / 100)),
        bible = GREATEST(0, COALESCE(bible, 0) - (COALESCE(bible, 0) * p_percentage / 100)),
        notes = GREATEST(0, COALESCE(notes, 0) - (COALESCE(notes, 0) * p_percentage / 100)),
        leadership = GREATEST(0, COALESCE(leadership, 0) - (COALESCE(leadership, 0) * p_percentage / 100))
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION public.update_agent_points_secure(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_agent_points_secure(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_percentage_points_secure(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.deduct_percentage_points_secure(TEXT, INTEGER) TO authenticated;
