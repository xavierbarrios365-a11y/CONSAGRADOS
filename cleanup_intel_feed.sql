-- CLEANUP INTEL FEED MEDIA (48H)
-- Este script crea la función para limpiar el Intel Feed de mensajes sociales antiguos,
-- protegiendo siempre los registros de ASISTENCIA.

CREATE OR REPLACE FUNCTION public.cleanup_expired_intel_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Borramos mensajes sociales, noticias de racha e hitos de juegos con más de 48 horas
    -- NO borramos ASISTENCIA, EVENTO_CONFIRMADO ni otros tipos de auditoría.
    DELETE FROM public.asistencia_visitas 
    WHERE tipo IN ('SOCIAL', 'RACHA', 'BIBLE_WAR', 'IQ_GAME', 'DUELO', 'CUMPLEAÑOS')
    AND registrado_en < NOW() - INTERVAL '48 hours';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feed() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feed() TO authenticated;
