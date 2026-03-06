-- =====================================================
-- GRANT ALL PERMISSIONS TO 'authenticated' ROLE
-- This ensures the app works whether the browser sends
-- an anon key or an authenticated JWT token
-- =====================================================

-- 1. FULL TABLE PERMISSIONS (match what anon has)
GRANT SELECT ON public.agentes TO authenticated;
GRANT INSERT ON public.agentes TO authenticated;
GRANT UPDATE ON public.agentes TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencia_visitas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticia_likes TO authenticated;
GRANT SELECT ON public.academy_courses TO authenticated;
GRANT SELECT ON public.academy_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_progress TO authenticated;

-- 2. RPC PERMISSIONS (match anon grants from supabase_secure_rpcs.sql)
GRANT EXECUTE ON FUNCTION public.sync_agent_profile(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_fcm(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_streak(TEXT, INTEGER, TEXT, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_biometric(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_admin(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3. RPC from security_hardening.sql
GRANT EXECUTE ON FUNCTION public.verify_agent_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recovery_agent_pin(TEXT, TEXT) TO authenticated;

-- 4. RLS POLICIES for authenticated (if not already existing)
DO $$
BEGIN
    -- agentes policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_select_agentes') THEN
        EXECUTE 'CREATE POLICY "auth_select_agentes" ON public.agentes FOR SELECT TO authenticated USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_insert_agentes') THEN
        EXECUTE 'CREATE POLICY "auth_insert_agentes" ON public.agentes FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_update_agentes') THEN
        EXECUTE 'CREATE POLICY "auth_update_agentes" ON public.agentes FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
    END IF;

    -- asistencia_visitas policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_asistencia') THEN
        EXECUTE 'CREATE POLICY "auth_all_asistencia" ON public.asistencia_visitas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;

    -- noticia_likes policies  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_likes') THEN
        EXECUTE 'CREATE POLICY "auth_all_likes" ON public.noticia_likes FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;

    -- academy tables
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_select_courses') THEN
        EXECUTE 'CREATE POLICY "auth_select_courses" ON public.academy_courses FOR SELECT TO authenticated USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_select_lessons') THEN
        EXECUTE 'CREATE POLICY "auth_select_lessons" ON public.academy_lessons FOR SELECT TO authenticated USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_progress') THEN
        EXECUTE 'CREATE POLICY "auth_all_progress" ON public.academy_progress FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
