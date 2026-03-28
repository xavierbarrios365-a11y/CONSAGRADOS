-- MIGRACIÓN: AÑADIR TUTOR A AUTORIZACIONES
ALTER TABLE deployment_authorizations 
ADD COLUMN tutor_name TEXT;

COMMENT ON COLUMN deployment_authorizations.tutor_name IS 'Nombre del líder responsable (tutor) asignado 1 a 1.';
