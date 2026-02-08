
-- Block anonymous access to patients table (sensitive medical data)
CREATE POLICY "Block anonymous access to patients"
ON public.patients
FOR ALL
TO anon
USING (false);

-- Block anonymous access to profiles table (personal user data)
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Also block anonymous access to other sensitive tables
CREATE POLICY "Block anonymous access to appointments"
ON public.appointments
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to sales"
ON public.sales
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to clinics"
ON public.clinics
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to professionals"
ON public.professionals
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to branches"
ON public.branches
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to treatments"
ON public.treatments
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to specialties"
ON public.specialties
FOR ALL
TO anon
USING (false);

CREATE POLICY "Block anonymous access to payment_methods"
ON public.payment_methods
FOR ALL
TO anon
USING (false);
