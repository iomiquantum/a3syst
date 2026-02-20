
-- Add columns for editable referral count, position tracking, and fictional flag
ALTER TABLE public.launch_registrations 
ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_position integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_fictional boolean NOT NULL DEFAULT false;

-- Allow super admin to update launch_registrations
CREATE POLICY "Super admin can manage launch_registrations"
ON public.launch_registrations
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());
