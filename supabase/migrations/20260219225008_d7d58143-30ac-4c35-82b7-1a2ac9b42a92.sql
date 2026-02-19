CREATE POLICY "Super admin can delete launch_registrations"
ON public.launch_registrations
FOR DELETE
USING (public.is_super_admin());