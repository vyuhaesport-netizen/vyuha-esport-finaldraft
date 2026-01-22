-- Add reactions, edit tracking to team_messages
ALTER TABLE public.team_messages
ADD COLUMN reactions jsonb DEFAULT '{}'::jsonb,
ADD COLUMN is_edited boolean DEFAULT false,
ADD COLUMN edited_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_messages_team_created ON public.team_messages(team_id, created_at DESC);