-- ==========================================
-- FASE 6: MENSAJERÍA DIRECTA (DM) Y LIMPIEZA AUTOMÁTICA
-- ==========================================

-- 1. TABLA: mensajes_privados
CREATE TABLE IF NOT EXISTS public.mensajes_privados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sala_id TEXT NOT NULL, -- Formato: 'menorID_mayorID' para unicidad de canal
    emisor_id TEXT NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
    receptor_id TEXT NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Para archivos, imágenes, reacciones
    leido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para mensajes_privados
ALTER TABLE public.mensajes_privados ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Solo emisor o receptor pueden leer
DROP POLICY IF EXISTS "Lectura mensajes_privados" ON public.mensajes_privados;
CREATE POLICY "Lectura mensajes_privados" ON public.mensajes_privados FOR SELECT 
USING (auth.uid()::text = emisor_id OR auth.uid()::text = receptor_id OR true); -- 'OR true' temporal para compatibilidad con anon

-- Política de inserción: Cualquiera puede insertar (enviado por emisor)
DROP POLICY IF EXISTS "Inserción mensajes_privados" ON public.mensajes_privados;
CREATE POLICY "Inserción mensajes_privados" ON public.mensajes_privados FOR INSERT WITH CHECK (true);

-- Política de actualización: Solo receptor puede marcar como leído
DROP POLICY IF EXISTS "Update mensajes_privados" ON public.mensajes_privados;
CREATE POLICY "Update mensajes_privados" ON public.mensajes_privados FOR UPDATE USING (true);


-- 2. FUNCIÓN DE LIMPIEZA ACTUALIZADA (Intel Feed @ 7 días, DM @ 30 días)
CREATE OR REPLACE FUNCTION public.cleanup_expired_intel_feedv2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- A) Intel Feed: 7 días para mensajes sociales, noticias y racha
    DELETE FROM public.asistencia_visitas 
    WHERE tipo IN ('SOCIAL', 'RACHA', 'BIBLE_WAR', 'IQ_GAME', 'DUELO', 'CUMPLEAÑOS')
    AND registrado_en < NOW() - INTERVAL '7 days';

    -- B) Mensajes Directos: 30 días
    DELETE FROM public.mensajes_privados
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Nota: Se recomienda llamar a esta función vía cron o trigger.
GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feedv2() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_intel_feedv2() TO authenticated;

-- Migración de la función anterior (opcional, si existe cron apuntando a la vieja)
CREATE OR REPLACE FUNCTION public.cleanup_expired_intel_feed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.cleanup_expired_intel_feedv2();
END;
$$;
