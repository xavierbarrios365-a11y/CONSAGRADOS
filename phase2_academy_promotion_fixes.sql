-- ==========================================
-- FASE 2: RECUPERACIÓN DE ACADEMIA Y ASCENSOS
-- ==========================================

-- 1. CORRECCIÓN DE ESQUEMA: academy_lessons
-- Agrega la columna order_index necesaria para el ordenamiento en el frontend
ALTER TABLE public.academy_lessons ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 2. FUNCIÓN: get_promotion_status
-- Reconstruye el estado de promoción del agente combinando XP, certificados y tareas
CREATE OR REPLACE FUNCTION public.get_promotion_status(p_agent_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_xp INTEGER;
    v_rank TEXT;
    v_certs_count INTEGER;
    v_tasks_completed INTEGER;
    v_tasks_pending INTEGER;
    v_result JSONB;
BEGIN
    -- Obtenemos datos básicos del agente
    SELECT xp, rango INTO v_xp, v_rank
    FROM public.agentes
    WHERE id = p_agent_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agente no encontrado');
    END IF;

    -- Conteo de certificados (Cursos completados en la academia)
    -- Asumimos que un curso se considera certificado si tiene una entrada completada en academy_progress
    -- o si se prefiere contar por curso_id único completado.
    SELECT COUNT(DISTINCT course_id) INTO v_certs_count
    FROM public.academy_progress
    WHERE agent_id = p_agent_id AND is_completed = true;

    -- Conteo de misiones/tareas completadas
    SELECT COUNT(*) INTO v_tasks_completed
    FROM public.progreso_tareas
    WHERE agent_id = p_agent_id AND status = 'VERIFICADO';

    -- Conteo de misiones/tareas pendientes de verificación
    SELECT COUNT(*) INTO v_tasks_pending
    FROM public.progreso_tareas
    WHERE agent_id = p_agent_id AND status IN ('SOLICITADO', 'EN_PROGRESO', 'ENTREGADO');

    -- Construcción del objeto de respuesta
    v_result := jsonb_build_object(
        'success', true,
        'rank', v_rank,
        'xp', v_xp,
        'certificates', v_certs_count,
        'tasksCompleted', v_tasks_completed,
        'tasksPending', v_tasks_pending,
        'promotionHistory', '[]'::jsonb -- Historial simplificado por ahora
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION public.get_promotion_status(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_promotion_status(TEXT) TO authenticated;

-- Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';
