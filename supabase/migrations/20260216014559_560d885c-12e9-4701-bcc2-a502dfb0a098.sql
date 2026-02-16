
-- Add business_type column to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'general';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS business_category text NOT NULL DEFAULT '';

-- Update the handle_new_clinic_setup function to use generic names
CREATE OR REPLACE FUNCTION public.handle_new_clinic_setup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_clinic_id UUID;
BEGIN
  -- Create a default business for the new user
  INSERT INTO public.clinics (owner_id, name, description)
  VALUES (NEW.id, 'Mi Negocio', 'Negocio principal')
  RETURNING id INTO new_clinic_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, clinic_id, role, permissions)
  VALUES (NEW.id, new_clinic_id, 'admin', '{"agenda":true,"pacientes":true,"ventas":true,"configuracion":true,"reportes":true}');

  -- Create default payment methods
  INSERT INTO public.payment_methods (clinic_id, name) VALUES
    (new_clinic_id, 'Efectivo'),
    (new_clinic_id, 'Tarjeta'),
    (new_clinic_id, 'Transferencia');

  RETURN NEW;
END;
$function$;
