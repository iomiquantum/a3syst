-- Create chat-media storage bucket for WhatsApp media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read media files (public bucket)
CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow service role to upload media (edge functions use service role)
CREATE POLICY "Service role upload for chat media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'chat-media');