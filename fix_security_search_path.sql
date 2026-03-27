-- ============================================
-- FIX: Security Linter — search_path mutable
-- VERSIÓN 2: Maneja funciones con múltiples firmas
-- Ejecutar en: Supabase > SQL Editor
-- ============================================

DO $$
DECLARE
    func_record RECORD;
    alter_sql TEXT;
BEGIN
    -- Itera sobre TODAS las funciones en public que NO tienen search_path fijado
    FOR func_record IN
        SELECT p.oid, p.proname, 
               pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (p.proconfig IS NULL 
             OR NOT EXISTS (
                SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
             ))
    LOOP
        alter_sql := format(
            'ALTER FUNCTION public.%I(%s) SET search_path = public',
            func_record.proname,
            func_record.args
        );
        BEGIN
            EXECUTE alter_sql;
            RAISE NOTICE 'OK: %', func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'SKIP: % — %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- ============================================
-- VERIFICACIÓN: Todas las funciones deben tener search_path
-- ============================================
SELECT p.proname AS funcion,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS argumentos,
       CASE 
         WHEN p.proconfig IS NOT NULL 
              AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%')
         THEN '✅ FIJADO'
         ELSE '❌ PENDIENTE'
       END AS estado
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY estado DESC, p.proname;
