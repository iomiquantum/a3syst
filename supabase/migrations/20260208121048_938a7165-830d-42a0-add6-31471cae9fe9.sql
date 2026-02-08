
-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'impulsarsolutions@gmail.com'
  );
$$;

-- Super admin can manage ALL clinics
CREATE POLICY "Super admin can manage all clinics"
ON public.clinics
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can view all profiles
CREATE POLICY "Super admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Super admin can manage all user_roles
CREATE POLICY "Super admin can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can view all user_roles
CREATE POLICY "Super admin can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Super admin can manage all branches
CREATE POLICY "Super admin can manage all branches"
ON public.branches
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all professionals
CREATE POLICY "Super admin can manage all professionals"
ON public.professionals
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all patients
CREATE POLICY "Super admin can manage all patients"
ON public.patients
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all treatments
CREATE POLICY "Super admin can manage all treatments"
ON public.treatments
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all specialties
CREATE POLICY "Super admin can manage all specialties"
ON public.specialties
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all appointments
CREATE POLICY "Super admin can manage all appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all sales
CREATE POLICY "Super admin can manage all sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Super admin can manage all payment methods
CREATE POLICY "Super admin can manage all payment_methods"
ON public.payment_methods
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
