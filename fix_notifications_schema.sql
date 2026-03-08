-- ========================================================
-- CORRECCIÓN DE NOTIFICACIONES Y FEED V39
-- ========================================================

-- 1. Añadir columnas faltantes a notificaciones_push
ALTER TABLE public.notificaciones_push ADD COLUMN IF NOT EXISTS emisor TEXT;
ALTER TABLE public.notificaciones_push ADD COLUMN IF NOT EXISTS agent_id TEXT;

-- 1.1 (Opcional) Asegurar que parent_id existe en asistencia_visitas
-- Ya debería estar por migraciones previas, pero lo aseguramos para consistencia del feed social
ALTER TABLE public.asistencia_visitas ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- 2. Asegurar que 'anon' tiene permisos sobre las nuevas columnas
-- postgresql grants ON TABLE automatically apply to all columns, but just to be safe:
GRANT INSERT (emisor, agent_id) ON public.notificaciones_push TO anon;
GRANT UPDATE (emisor, agent_id) ON public.notificaciones_push TO anon;
GRANT SELECT ON public.notificaciones_push TO anon;

-- Permisos para asistencia_visitas (parent_id)
GRANT INSERT (parent_id) ON public.asistencia_visitas TO anon;
GRANT UPDATE (parent_id) ON public.asistencia_visitas TO anon;

-- Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';
