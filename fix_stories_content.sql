-- FIX: Añadir columna content a historias y asegurar permisos
-- Este script habilita los pies de foto en las historias.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='historias' AND column_name='content') THEN
        ALTER TABLE public.historias ADD COLUMN content TEXT;
    END IF;
END $$;

-- Asegurar que expires_at existe (repetido por seguridad)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='historias' AND column_name='expires_at') THEN
        ALTER TABLE public.historias ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '48 hours');
    END IF;
END $$;

-- Refrescar permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias TO authenticated;

-- Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';
