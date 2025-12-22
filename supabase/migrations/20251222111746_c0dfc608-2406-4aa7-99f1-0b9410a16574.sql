-- Add new columns to admin_broadcasts for rich media and scheduling
ALTER TABLE public.admin_broadcasts 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS scheduled_for timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS video_link text,
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Add comment for media_type options
COMMENT ON COLUMN public.admin_broadcasts.media_type IS 'Options: text, audio, image, video, pdf, banner';

-- Create index for scheduled broadcasts
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_scheduled ON public.admin_broadcasts(scheduled_for) WHERE scheduled_for IS NOT NULL AND is_published = false;

-- Enable realtime for admin_broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_broadcasts;