-- Add CHECK constraint to validate permissions JSON structure
ALTER TABLE public.user_roles ADD CONSTRAINT valid_permissions
CHECK (
  permissions ?& ARRAY['agenda', 'pacientes', 'ventas', 'configuracion', 'reportes']
  AND jsonb_typeof(permissions->'agenda') = 'boolean'
  AND jsonb_typeof(permissions->'pacientes') = 'boolean'
  AND jsonb_typeof(permissions->'ventas') = 'boolean'
  AND jsonb_typeof(permissions->'configuracion') = 'boolean'
  AND jsonb_typeof(permissions->'reportes') = 'boolean'
);