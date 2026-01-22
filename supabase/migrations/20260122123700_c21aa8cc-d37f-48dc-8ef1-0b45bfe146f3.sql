-- Add reply_to column for reply/quote feature
ALTER TABLE public.team_messages
ADD COLUMN reply_to uuid REFERENCES public.team_messages(id) ON DELETE SET NULL;