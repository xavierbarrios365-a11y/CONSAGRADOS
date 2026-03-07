-- CONSAGRADOS 2026 - MIGRACION DE CREDENCIALES Y DATOS TÁCTICOS
-- Este script otorga permisos de lectura al rol publico (anon) 
-- para todas las columnas necesarias en el Admin Dashboard.

GRANT SELECT (
  pin, 
  whatsapp, 
  is_ai_profile_pending, 
  tactical_stats, 
  tactor_summary
) ON public.agentes TO anon;

-- Verificacion: estas columnas ahora deberian ser visibles en SELECTs de anon.
