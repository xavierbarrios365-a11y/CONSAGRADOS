-- ==============================================================================
-- 🪪 CONSAGRADOS 2026: AGREGAR COLUMNAS NATIVAS DIRECTAS DE IDENTIDAD Y CONTACTO
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/dnzrnpslfabowgtikora/sql/new
-- ==============================================================================

-- 1. Agregar columnas nativas directas en la tabla public.agentes
ALTER TABLE public.agentes 
    ADD COLUMN IF NOT EXISTS cedula TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS telegram TEXT,
    ADD COLUMN IF NOT EXISTS redes_sociales TEXT;

-- 2. Crear índice único anti-duplicados para la cédula a nivel de base de datos
CREATE UNIQUE INDEX IF NOT EXISTS idx_agentes_cedula_unique 
ON public.agentes (cedula) 
WHERE cedula IS NOT NULL AND cedula <> '';

-- 3. Crear índice para búsquedas ultra-rápidas por correo y teléfono
CREATE INDEX IF NOT EXISTS idx_agentes_email 
ON public.agentes (email) 
WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS idx_agentes_whatsapp 
ON public.agentes (whatsapp) 
WHERE whatsapp IS NOT NULL AND whatsapp <> '';

-- 4. Notificación de éxito
DO $$
BEGIN
    RAISE NOTICE '🟢 COLUMNAS NATIVAS CREADAS: cedula, email, telegram y redes_sociales ahora son columnas oficiales en la tabla agentes.';
END $$;
