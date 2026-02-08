
-- Fix psycho_matrix_services policies: drop restrictive, create permissive
DROP POLICY IF EXISTS "Block anonymous access to psycho_matrix_services" ON public.psycho_matrix_services;
DROP POLICY IF EXISTS "Clinic members can view psycho_matrix_services" ON public.psycho_matrix_services;
DROP POLICY IF EXISTS "Clinic members can manage psycho_matrix_services" ON public.psycho_matrix_services;
DROP POLICY IF EXISTS "Super admin can manage all psycho_matrix_services" ON public.psycho_matrix_services;

CREATE POLICY "Clinic members can view psycho_matrix_services"
ON public.psycho_matrix_services FOR SELECT
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can insert psycho_matrix_services"
ON public.psycho_matrix_services FOR INSERT
TO authenticated
WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can update psycho_matrix_services"
ON public.psycho_matrix_services FOR UPDATE
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can delete psycho_matrix_services"
ON public.psycho_matrix_services FOR DELETE
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all psycho_matrix_services"
ON public.psycho_matrix_services FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Fix psycho_matrix_strategies policies
DROP POLICY IF EXISTS "Block anonymous access to psycho_matrix_strategies" ON public.psycho_matrix_strategies;
DROP POLICY IF EXISTS "Clinic members can view psycho_matrix_strategies" ON public.psycho_matrix_strategies;
DROP POLICY IF EXISTS "Clinic members can manage psycho_matrix_strategies" ON public.psycho_matrix_strategies;
DROP POLICY IF EXISTS "Super admin can manage all psycho_matrix_strategies" ON public.psycho_matrix_strategies;

CREATE POLICY "Clinic members can view psycho_matrix_strategies"
ON public.psycho_matrix_strategies FOR SELECT
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can insert psycho_matrix_strategies"
ON public.psycho_matrix_strategies FOR INSERT
TO authenticated
WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can update psycho_matrix_strategies"
ON public.psycho_matrix_strategies FOR UPDATE
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can delete psycho_matrix_strategies"
ON public.psycho_matrix_strategies FOR DELETE
TO authenticated
USING (user_has_clinic_access(auth.uid(), clinic_id));

CREATE POLICY "Super admin can manage all psycho_matrix_strategies"
ON public.psycho_matrix_strategies FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());
