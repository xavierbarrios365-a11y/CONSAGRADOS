-- RPC para actualizar preferencias de notificación de forma segura
CREATE OR REPLACE FUNCTION public.update_agent_notif_prefs(p_id TEXT, p_prefs JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes 
  SET notif_prefs = p_prefs, 
      updated_at = timezone('utc'::text, now()) 
  WHERE id = p_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_notif_prefs(TEXT, JSONB) TO anon;

-- Asegurar que asistencia_visitas tenga permisos para el rol anon (usado para noticias de racha)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.asistencia_visitas TO anon;
GRANT ALL ON TABLE public.asistencia_visitas TO authenticated, anon;

-- Asegurar que la función de racha sea accesible
GRANT EXECUTE ON FUNCTION public.update_agent_streak(TEXT, INTEGER, TEXT, JSONB, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_agent_streak(TEXT, INTEGER, TEXT, JSONB, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
