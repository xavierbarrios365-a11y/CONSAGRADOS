-- ============================================================================
-- 🔄 CONSAGRADOS 2026: SCRIPT MAESTRO DE REINICIO TOTAL EN CERO
-- ============================================================================
-- Propósito: Poner todas las métricas, puntos, asistencias, historial y
-- agentes en CERO ABSOLUTO para iniciar el nuevo ciclo desde hoy.
-- Mantiene intacta la estructura de tablas, las Sedes y el Catálogo de Cursos.
-- ============================================================================

DO $$
BEGIN
    -- 1. Desactivar temporalmente restricciones de clave foránea si fuera necesario
    SET session_replication_role = 'replica';

    -- 2. Limpiar registros sociales y de interacción
    TRUNCATE TABLE public.asistencia_visitas CASCADE;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'noticia_likes') THEN
        TRUNCATE TABLE public.noticia_likes CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historias') THEN
        TRUNCATE TABLE public.historias CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notificaciones') THEN
        TRUNCATE TABLE public.notificaciones CASCADE;
    END IF;

    -- 3. Limpiar progresos académicos y de juegos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academy_progress') THEN
        TRUNCATE TABLE public.academy_progress CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tactical_duels') THEN
        TRUNCATE TABLE public.tactical_duels CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tactical_iq_progress') THEN
        TRUNCATE TABLE public.tactical_iq_progress CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bible_war_answers') THEN
        TRUNCATE TABLE public.bible_war_answers CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bible_war_sessions') THEN
        TRUNCATE TABLE public.bible_war_sessions CASCADE;
    END IF;

    -- 4. Limpiar agentes para registro desde cero
    TRUNCATE TABLE public.agentes CASCADE;

    -- 5. Reactivar restricciones normales
    SET session_replication_role = 'origin';

    -- 6. Asegurar que la Sede Principal "JESÚS ES EL CENTRO" permanezca activa
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sedes') THEN
        INSERT INTO public.sedes (id, nombre, ciudad, pais, responsable_nombre, is_active)
        VALUES ('SEDE-JESUS-ES-EL-CENTRO', 'JESÚS ES EL CENTRO', 'Caracas', 'Venezuela', 'DIRECCIÓN GENERAL', true)
        ON CONFLICT (id) DO UPDATE 
        SET nombre = 'JESÚS ES EL CENTRO', is_active = true, updated_at = NOW();
    END IF;

    RAISE NOTICE '🟢 REINICIO TOTAL EXITOSO: Base de datos en CERO ABSOLUTO para el ciclo 2026.';
END $$;
