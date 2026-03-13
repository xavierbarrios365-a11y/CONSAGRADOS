-- ==============================================================================
-- CORRECCIÓN FINAL: Función RPC de Agente Destacado (Trofeo de Oro)
-- ==============================================================================

-- Esta función la usa la app para saber quién es el agente con más Likes recibidos 
-- y dibujarle un pequeño trofeo de oro junto a su foto en el Intel Feed.

CREATE OR REPLACE FUNCTION public.get_most_liked_agent()
RETURNS TABLE (
    "agentId" TEXT,
    likes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.agent_id AS "agentId", 
        COUNT(l.id) AS likes
    FROM public.intel_likes l
    JOIN public.intel_feed f ON f.id = l.item_id
    WHERE f.agent_id IS NOT NULL
    GROUP BY f.agent_id
    ORDER BY likes DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos para que los usuarios (la app) puedan consultar la función
GRANT EXECUTE ON FUNCTION public.get_most_liked_agent() TO anon;
GRANT EXECUTE ON FUNCTION public.get_most_liked_agent() TO authenticated;

-- Notificar a Supabase para purgar caché
NOTIFY pgrst, 'reload schema';
