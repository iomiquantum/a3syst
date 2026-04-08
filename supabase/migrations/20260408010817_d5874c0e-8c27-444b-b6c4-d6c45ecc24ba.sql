
-- Update the trigger to skip clinic creation when user is provisioned via admin
-- (indicated by 'skip_clinic_creation' flag in user metadata)
CREATE OR REPLACE FUNCTION public.handle_new_clinic_setup()
RETURNS TRIGGER AS $$
DECLARE
  new_clinic_id UUID;
BEGIN
  -- Skip auto-creation if user was provisioned by admin with a target clinic
  IF (NEW.raw_user_meta_data->>'skip_clinic_creation')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Create a default clinic for the new user
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
