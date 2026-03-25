-- Allow clinic members with management roles to manage treatments
CREATE POLICY "Clinic admins can manage treatments"
ON public.treatments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = treatments.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = treatments.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
);

-- Allow clinic members with management roles to manage specialties
CREATE POLICY "Clinic admins can manage specialties"
ON public.specialties
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = specialties.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = specialties.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
);

-- Allow clinic members with management roles to manage professionals
CREATE POLICY "Clinic admins can manage professionals"
ON public.professionals
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = professionals.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinic_id = professionals.clinic_id
    AND ur.role IN ('admin', 'manager', 'secretary')
  )
);