-- Add acting_leader_id column to player_teams table
ALTER TABLE public.player_teams 
ADD COLUMN IF NOT EXISTS acting_leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_teams_acting_leader ON public.player_teams(acting_leader_id);

-- Add RLS policy for acting leader to manage requests
CREATE POLICY "Acting leaders can view team requests"
ON public.player_team_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = team_id 
    AND (leader_id = auth.uid() OR acting_leader_id = auth.uid())
  )
);

CREATE POLICY "Acting leaders can update team requests"
ON public.player_team_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.player_teams 
    WHERE id = team_id 
    AND (leader_id = auth.uid() OR acting_leader_id = auth.uid())
  )
);