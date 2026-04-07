-- ========================================================
-- FIX: Permitir eliminación de eventos desde el panel admin
-- ========================================================

-- Opción A: Política RLS para permitir DELETE en eventos
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Borrar políticas duplicadas si existen
DROP POLICY IF EXISTS "Eventos visibles para todos" ON public.eventos;
DROP POLICY IF EXISTS "Eventos eliminables por todos" ON public.eventos;
DROP POLICY IF EXISTS "Eventos insertables por todos" ON public.eventos;

-- Permitir SELECT a todos
CREATE POLICY "Eventos visibles para todos" ON public.eventos FOR SELECT USING (true);
-- Permitir INSERT a todos
CREATE POLICY "Eventos insertables por todos" ON public.eventos FOR INSERT WITH CHECK (true);
-- Permitir DELETE a todos
CREATE POLICY "Eventos eliminables por todos" ON public.eventos FOR DELETE USING (true);
-- Permitir UPDATE a todos
CREATE POLICY "Eventos actualizables por todos" ON public.eventos FOR UPDATE USING (true);

NOTIFY pgrst, 'reload schema';
