-- SOLUCIÓN DEFINITIVA: PERMISOS SOCIALES Y HISTORIAS (ELITE)
-- Ejecute este script completo para habilitar el sistema de compartido.

-- 1. Eliminar funciones antiguas para evitar conflictos de firma
DROP FUNCTION IF EXISTS public.cleanup_expired_stories();

-- 2. Asegurar estructura de la tabla historias
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='historias' AND column_name='expires_at') THEN
        ALTER TABLE historias ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

ALTER TABLE public.historias ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');
UPDATE public.historias SET expires_at = (now() + interval '48 hours') WHERE expires_at IS NULL;

-- 3. Otorgar Permisos de PROTOCOLO (ANON)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historia_reactions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.asistencia_visitas TO anon;

-- 4. Re-crear función de limpieza (Segura)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.historias 
    WHERE expires_at < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories() TO anon;

-- 5. Forzar actualización de Cache de API
NOTIFY pgrst, 'reload schema';
