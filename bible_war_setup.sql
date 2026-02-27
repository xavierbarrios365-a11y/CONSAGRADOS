-- TABLA DE SESIÓN DE GUERRA BÍBLICA (Realtime)
CREATE TABLE IF NOT EXISTS public.bible_war_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'WAITING', -- 'WAITING', 'ACTIVE', 'FINISHED'
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    current_question_id TEXT,
    active_team TEXT, -- 'A', 'B' o NULL
    stakes_xp INTEGER DEFAULT 100,
    show_answer BOOLEAN DEFAULT false,
    roulette_category TEXT,
    answer_a TEXT,
    answer_b TEXT,
    accumulated_pot INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.bible_war_sessions;

-- POLÍTICAS RLS (Seguridad)
ALTER TABLE public.bible_war_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Todo el mundo puede leer el estado (para el Display público)
CREATE POLICY "Lectura pública de sesiones" 
ON public.bible_war_sessions FOR SELECT 
TO public 
USING (true);

-- 2. Solo el Director puede crear o modificar la sesión
CREATE POLICY "Director gestiona sesiones" 
ON public.bible_war_sessions FOR ALL 
TO public 
USING (true); -- Nota: En producción esto debería filtrarse por rol, pero para facilidad de setup lo dejamos abierto si la app ya maneja la lógica de rol.

-- INSERTAR SESIÓN INICIAL (Si no existe)
INSERT INTO public.bible_war_sessions (id, status, score_a, score_b)
VALUES ('00000000-0000-0000-0000-000000000001', 'WAITING', 0, 0)
ON CONFLICT (id) DO NOTHING;
