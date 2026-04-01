
-- Fix marketing_tags RLS: add WITH CHECK for insert/update/delete
DROP POLICY IF EXISTS clinic_access_tags ON public.marketing_tags;
CREATE POLICY "clinic_access_tags" ON public.marketing_tags
  FOR ALL TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));

-- Fix pipeline_stages RLS: add WITH CHECK for insert/update/delete
DROP POLICY IF EXISTS clinic_access_pipeline ON public.pipeline_stages;
CREATE POLICY "clinic_access_pipeline" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (user_has_clinic_access(auth.uid(), clinic_id))
  WITH CHECK (user_has_clinic_access(auth.uid(), clinic_id));
