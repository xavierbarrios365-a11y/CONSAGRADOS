-- Migration to support social feed threading and tagging
-- Add parent_id column to asistencia_visitas table

ALTER TABLE asistencia_visitas ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Index for performance in threaded queries
CREATE INDEX IF NOT EXISTS idx_asistencia_visitas_parent_id ON asistencia_visitas(parent_id);

-- Update RLS if necessary (assuming existing policies are sufficient for message insertion)
-- If specific SOCIAL type needs different policies, they should be added here.
