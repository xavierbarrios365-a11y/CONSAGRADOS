-- ==============================================================
-- SCRIPT DE AJUSTE: UMBRAL DE APROBACIÓN ACADEMIA (60%)
-- ==============================================================

-- 1. Actualizar el estado is_completed para registros que no alcanzan el 60%
-- Aquellos con puntaje menor a 60 ahora se marcarán como NO completados
UPDATE public.academy_progress
SET is_completed = false
WHERE score < 60 AND is_completed = true;

-- 2. Asegurar que registros con 60% o más estén marcados como completados
-- (Por si alguno quedó como fallido con puntaje suficiente)
UPDATE public.academy_progress
SET is_completed = true
WHERE score >= 60 AND is_completed = false;

-- 3. Recargar esquema (opcional pero recomendado)
NOTIFY pgrst, 'reload schema';

-- INFO: Este script sincroniza la base de datos con el nuevo criterio de aprobación del 60%.
