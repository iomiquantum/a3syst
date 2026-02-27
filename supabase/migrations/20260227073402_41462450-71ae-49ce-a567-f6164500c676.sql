
-- Storage bucket for clinic logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clinic-logos');

-- Allow public reads
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'clinic-logos');

-- Allow owners to update/delete their logos
CREATE POLICY "Users can manage their logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'clinic-logos');

CREATE POLICY "Users can update their logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'clinic-logos');
