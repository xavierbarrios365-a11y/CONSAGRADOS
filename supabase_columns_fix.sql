-- ========================================================
-- CORRECCIÓN DE COLUMNAS FALTANTES Y PERMISOS V38
-- ========================================================

-- 1. Añadir columnas faltantes si no existen
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS biometric_credential TEXT;
ALTER TABLE public.agentes ADD COLUMN IF NOT EXISTS last_course TEXT;

-- 2. Asegurar que 'anon' tiene permisos sobre las nuevas columnas
-- postgresql grants ON TABLE automatically apply to all columns, but just to be safe:
GRANT INSERT (biometric_credential, last_course) ON public.agentes TO anon;
GRANT UPDATE (biometric_credential, last_course) ON public.agentes TO anon;

-- Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';
