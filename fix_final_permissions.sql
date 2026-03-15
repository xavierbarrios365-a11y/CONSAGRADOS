-- SCRIPT DE PERMISOS FINALES (EVENTOS, HISTORIAS Y VERSÍCULOS)
-- Este script otorga permisos totales a los agentes para gestionar sus contenidos.

-- 1. Permisos para la tabla de eventos (Soluciona "Permission Denied")
DROP POLICY IF EXISTS "Acceso total anon eventos" ON public.eventos;
DROP POLICY IF EXISTS "Acceso total authenticated eventos" ON public.eventos;

CREATE POLICY "Acceso total anon eventos" ON public.eventos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total authenticated eventos" ON public.eventos FOR ALL USING (true) WITH CHECK (true);

-- 2. Permisos para la tabla de historias (Asegurar eliminación y creación)
DROP POLICY IF EXISTS "Acceso total anon agent_stories" ON public.agent_stories;
DROP POLICY IF EXISTS "Acceso total authenticated agent_stories" ON public.agent_stories;

CREATE POLICY "Acceso total anon agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total authenticated agent_stories" ON public.agent_stories FOR ALL USING (true) WITH CHECK (true);

-- 3. Asegurar lectura de versículos para todos
DROP POLICY IF EXISTS "Lectura pública versiculos_diarios" ON public.versiculos_diarios;
CREATE POLICY "Lectura pública versiculos_diarios" ON public.versiculos_diarios FOR SELECT USING (true);

-- 4. Notificaciones push (Permitir inserción en tiempo real)
DROP POLICY IF EXISTS "Permitir inserción notificaciones anon" ON public.notificaciones_push;
CREATE POLICY "Permitir inserción notificaciones anon" ON public.notificaciones_push FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura propia notificaciones" ON public.notificaciones_push FOR SELECT USING (true);
