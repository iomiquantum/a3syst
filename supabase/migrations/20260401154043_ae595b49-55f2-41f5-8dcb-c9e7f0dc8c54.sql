-- Fix branches INSERT: add WITH CHECK to owner policy
DROP POLICY "Clinic owners can manage branches" ON public.branches;

CREATE POLICY "Clinic owners can manage branches"
ON public.branches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clinics
    WHERE clinics.id = branches.clinic_id
    AND clinics.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clinics
    WHERE clinics.id = branches.clinic_id
    AND clinics.owner_id = auth.uid()
  )
);

-- Also allow admin/manager roles to manage branches
CREATE POLICY "Clinic admins can manage branches"
ON public.branches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.clinic_id = branches.clinic_id
    AND user_roles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.clinic_id = branches.clinic_id
    AND user_roles.role IN ('admin', 'manager')
  )
);