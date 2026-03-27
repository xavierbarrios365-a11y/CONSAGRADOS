-- ============================================
-- FIX: Limpieza de Feed + Trigger automático
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

-- PASO 1: Limpieza MANUAL inmediata
DELETE FROM public.intel_feed WHERE created_at < NOW() - INTERVAL '5 days';
SELECT COUNT(*) AS posts_restantes FROM public.intel_feed;

-- PASO 2: Historias expiradas (> 24h)
DELETE FROM public.agent_stories WHERE created_at < NOW() - INTERVAL '24 hours';
SELECT COUNT(*) AS historias_restantes FROM public.agent_stories;

-- PASO 3: Notificaciones viejas (> 30 días)
DELETE FROM public.notificaciones_push WHERE created_at < NOW() - INTERVAL '30 days';
SELECT COUNT(*) AS notificaciones_restantes FROM public.notificaciones_push;

-- PASO 4: Trigger automático (limpia al publicar)
CREATE OR REPLACE FUNCTION public.auto_cleanup_old_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.intel_feed WHERE created_at < NOW() - INTERVAL '5 days';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_cleanup_feed ON public.intel_feed;
CREATE TRIGGER trg_auto_cleanup_feed
    AFTER INSERT ON public.intel_feed
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.auto_cleanup_old_feed();

-- VERIFICACIÓN
SELECT 'intel_feed' AS tabla, COUNT(*) AS registros FROM public.intel_feed
UNION ALL SELECT 'agent_stories', COUNT(*) FROM public.agent_stories
UNION ALL SELECT 'notificaciones_push', COUNT(*) FROM public.notificaciones_push;
