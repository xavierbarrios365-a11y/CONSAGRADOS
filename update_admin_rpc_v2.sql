-- ========================================================
-- RPC: update_agent_admin (VERSIÓN EXPANDIDA V2)
-- Permite editar todos los campos críticos desde el Panel Admin
-- ========================================================

CREATE OR REPLACE FUNCTION public.update_agent_admin(
  p_id TEXT, 
  p_nombre TEXT DEFAULT NULL, 
  p_xp INTEGER DEFAULT NULL, 
  p_rango TEXT DEFAULT NULL, 
  p_cargo TEXT DEFAULT NULL, 
  p_whatsapp TEXT DEFAULT NULL, 
  p_pin TEXT DEFAULT NULL, 
  p_foto_url TEXT DEFAULT NULL,
  p_birthday TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_user_role TEXT DEFAULT NULL,
  p_talent TEXT DEFAULT NULL,
  p_baptism_status TEXT DEFAULT NULL,
  p_relationship_with_god TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.agentes SET 
    nombre = COALESCE(p_nombre, nombre),
    xp = COALESCE(p_xp, xp),
    rango = COALESCE(p_rango, rango),
    cargo = COALESCE(p_cargo, cargo),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    pin = COALESCE(p_pin, pin),
    foto_url = COALESCE(p_foto_url, foto_url),
    birthday = COALESCE(p_birthday, birthday),
    status = COALESCE(p_status, status),
    user_role = COALESCE(p_user_role, user_role),
    talent = COALESCE(p_talent, talent),
    baptism_status = COALESCE(p_baptism_status, baptism_status),
    relationship_with_god = COALESCE(p_relationship_with_god, relationship_with_god),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_agent_admin(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Notificar recarga de esquema si es necesario (PostgREST)
NOTIFY pgrst, 'reload schema';
