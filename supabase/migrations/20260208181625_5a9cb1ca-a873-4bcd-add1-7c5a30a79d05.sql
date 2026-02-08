
-- Create storage bucket for content media
INSERT INTO storage.buckets (id, name, public) VALUES ('content-media', 'content-media', true);

-- RLS: anyone can view public content media
CREATE POLICY "Public content media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-media');

-- RLS: authenticated users can upload to their clinic folder
CREATE POLICY "Authenticated users can upload content media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);

-- RLS: authenticated users can update their uploads
CREATE POLICY "Authenticated users can update content media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);

-- RLS: authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete content media" ON storage.objects
  FOR DELETE USING (bucket_id = 'content-media' AND auth.uid() IS NOT NULL);
