-- =====================================================
-- HISTORIAS: Reacciones + Limpieza Automática
-- =====================================================

-- 1. Tabla de reacciones a historias
CREATE TABLE IF NOT EXISTS public.historia_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    historia_id UUID NOT NULL REFERENCES public.historias(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL DEFAULT '',
    emoji TEXT NOT NULL DEFAULT '❤️',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único: un agente solo puede reaccionar una vez por historia con el mismo emoji
CREATE UNIQUE INDEX IF NOT EXISTS idx_historia_reactions_unique 
    ON public.historia_reactions(historia_id, agent_id, emoji);

-- 2. Permisos
GRANT SELECT, INSERT, DELETE ON public.historia_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.historia_reactions TO authenticated;

-- RLS
ALTER TABLE public.historia_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_historia_reactions" ON public.historia_reactions;
CREATE POLICY "anon_all_historia_reactions" ON public.historia_reactions
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_historia_reactions" ON public.historia_reactions;
CREATE POLICY "auth_all_historia_reactions" ON public.historia_reactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Permisos para historias (asegurar DELETE para cleanup)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias TO authenticated;

DROP POLICY IF EXISTS "anon_all_historias" ON public.historias;
CREATE POLICY "anon_all_historias" ON public.historias
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_historias" ON public.historias;
CREATE POLICY "auth_all_historias" ON public.historias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Función de limpieza automática (elimina historias > 48h)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.historias
    WHERE created_at < NOW() - INTERVAL '48 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories() TO authenticated;

-- 5. Reload schema
NOTIFY pgrst, 'reload schema';
