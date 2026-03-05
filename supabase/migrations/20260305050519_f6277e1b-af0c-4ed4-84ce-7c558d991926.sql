
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apellido text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notas text DEFAULT '';

-- Create actividad_usuarios table
CREATE TABLE IF NOT EXISTS public.actividad_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  accion text NOT NULL,
  detalle jsonb DEFAULT '{}'::jsonb,
  realizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.actividad_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage all actividad_usuarios"
  ON public.actividad_usuarios FOR ALL TO authenticated
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Block anonymous access to actividad_usuarios"
  ON public.actividad_usuarios FOR ALL TO anon
  USING (false);

CREATE POLICY "Clinic admins can view activity of their users"
  ON public.actividad_usuarios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.clinic_id = ur2.clinic_id
      WHERE ur1.user_id = auth.uid()
      AND ur2.user_id = actividad_usuarios.usuario_id
      AND ur1.role = 'admin'
    )
  );

-- Helper function for role nivel
CREATE OR REPLACE FUNCTION public.get_role_nivel(r app_role)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE r
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'secretary' THEN 4
    WHEN 'professional' THEN 4
    WHEN 'empleado' THEN 4
    WHEN 'vendedor' THEN 5
    ELSE 99
  END;
$$;
