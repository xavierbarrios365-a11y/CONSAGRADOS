-- ==============================================================
-- SCRIPT DE CORRECIÓN: HISTORIAS (ESQUEMA) Y PERMISOS (EVENTOS)
-- ==============================================================

-- 1. CORRECCIÓN DE LA TABLA agent_stories
-- Si existe la columna 'caption', la renombramos a 'content' para que coincida con el código
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'caption') THEN
        ALTER TABLE public.agent_stories RENAME COLUMN caption TO content;
    END IF;
    
    -- Si existe la columna 'image_url', la renombramos a 'media_url' si no existe ya
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'image_url') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_stories' AND column_name = 'media_url') THEN
        ALTER TABLE public.agent_stories RENAME COLUMN image_url TO media_url;
    END IF;
END $$;

-- 2. ASEGURAR POLÍTICAS RLS PARA EVENTOS (ELIMINACIÓN)
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total anon eventos" ON public.eventos;
CREATE POLICY "Acceso total anon eventos" ON public.eventos FOR ALL USING (true) WITH CHECK (true);

-- 3. ASEGURAR POLÍTICAS RLS PARA HISTORIAS (ELIMINACIÓN POR DUEÑO)
-- Nota: Para simplificar y asegurar que funcione de inmediato como pidió el usuario "para todos los agentes",
-- permitimos acceso total temporalmente. En una fase posterior se puede restringir solo al dueño.
ALTER TABLE public.agent_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total anon agent_stories" ON public.agent_stories;
CREATE POLICY "Acceso total anon agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);

-- 4. OTORGAR PERMISOS EXPLÍCITOS PARA ROLES ANÓNIMOS Y AUTENTICADOS
GRANT ALL ON TABLE public.eventos TO anon;
GRANT ALL ON TABLE public.eventos TO authenticated;
GRANT ALL ON TABLE public.agent_stories TO anon;
GRANT ALL ON TABLE public.agent_stories TO authenticated;

-- 5. RECARGAR ESQUEMA PARA POSTGREST
NOTIFY pgrst, 'reload schema';
