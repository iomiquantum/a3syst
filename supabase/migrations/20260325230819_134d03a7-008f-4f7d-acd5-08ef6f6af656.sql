-- Proteger delete/update para que solo el dueño pueda modificar sus archivos

-- content-media
DROP POLICY IF EXISTS "Authenticated users can update content media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete content media" ON storage.objects;
CREATE POLICY "Owner can update content media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-media' AND (auth.uid()::text = owner_id::text OR public.is_super_admin()));
CREATE POLICY "Owner can delete content media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-media' AND (auth.uid()::text = owner_id::text OR public.is_super_admin()));

-- brand-references
DROP POLICY IF EXISTS "Users can delete their brand references" ON storage.objects;
CREATE POLICY "Owner delete brand refs" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-references' AND (auth.uid()::text = owner_id::text OR public.is_super_admin()));

-- clinic-logos
DROP POLICY IF EXISTS "Users can manage their logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their logos" ON storage.objects;
CREATE POLICY "Owner delete logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clinic-logos' AND (auth.uid()::text = owner_id::text OR public.is_super_admin()));
CREATE POLICY "Owner update logos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clinic-logos' AND (auth.uid()::text = owner_id::text OR public.is_super_admin()));