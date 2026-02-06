
-- ==============================================
-- STATS POINTS SYSTEM OVERHAUL
-- Points ONLY when explicit rank is assigned
-- Team members all get same rank
-- ==============================================

-- Add best_team columns to user_stats for tracking team wins
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS best_team_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_wins INTEGER DEFAULT 0;

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_stats_on_prize ON public.wallet_transactions;

-- Create improved function that ONLY awards points for explicit ranks
CREATE OR REPLACE FUNCTION public.update_user_stats_on_win()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  position_number INTEGER := NULL;
  points_to_add INTEGER := 0;
  matched_position TEXT;
  team_name_extracted TEXT := NULL;
BEGIN
  -- Only process prize transactions
  IF NEW.type NOT IN ('prize', 'prize_won') THEN
    RETURN NEW;
  END IF;
  
  -- Extract position from description using multiple patterns
  -- Pattern 1: "Position #1" or "Position #2" etc
  IF NEW.description ~ 'Position #[0-9]+' THEN
    matched_position := substring(NEW.description from 'Position #([0-9]+)');
    IF matched_position IS NOT NULL AND matched_position ~ '^[0-9]+$' THEN
      position_number := matched_position::INTEGER;
    END IF;
  END IF;
  
  -- Pattern 2: Check for "position.?1" format (legacy support)
  IF position_number IS NULL THEN
    IF NEW.description ~* 'position[^0-9]*1[^0-9]' OR NEW.description ~* '#1[^0-9]' THEN
      position_number := 1;
    ELSIF NEW.description ~* 'position[^0-9]*2[^0-9]' OR NEW.description ~* '#2[^0-9]' THEN
      position_number := 2;
    ELSIF NEW.description ~* 'position[^0-9]*3[^0-9]' OR NEW.description ~* '#3[^0-9]' THEN
      position_number := 3;
    ELSIF NEW.description ~* 'position[^0-9]*([4-9]|10)[^0-9]' OR NEW.description ~* '#([4-9]|10)[^0-9]' THEN
      -- Extract position 4-10
      matched_position := substring(NEW.description from 'Position #([0-9]+)');
      IF matched_position IS NOT NULL THEN
        position_number := matched_position::INTEGER;
      END IF;
    END IF;
  END IF;
  
  -- CRITICAL: If no explicit position found, DO NOT award any points
  -- This prevents participation-only entries from getting points
  IF position_number IS NULL THEN
    -- Still track earnings but NO stats points
    INSERT INTO user_stats (
      user_id,
      tournament_wins,
      first_place_count,
      second_place_count,
      third_place_count,
      total_earnings,
      stats_points,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      0,
      0,
      0,
      0,
      NEW.amount,
      0,  -- NO POINTS without explicit rank
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      total_earnings = user_stats.total_earnings + NEW.amount,
      updated_at = now();
    
    RETURN NEW;
  END IF;
  
  -- Calculate stats points based on EXPLICIT position only
  IF position_number = 1 THEN
    points_to_add := 50;
  ELSIF position_number = 2 THEN
    points_to_add := 30;
  ELSIF position_number = 3 THEN
    points_to_add := 20;
  ELSIF position_number <= 10 THEN
    points_to_add := 10;
  ELSE
    points_to_add := 5;  -- For positions 11+
  END IF;
  
  -- Extract team name if this is a team tournament win
  -- Format: "Team TEAMNAME Position #X prize..."
  IF NEW.description ~ '^Team .+ Position #' THEN
    team_name_extracted := substring(NEW.description from 'Team (.+) Position #');
    IF team_name_extracted IS NOT NULL THEN
      team_name_extracted := trim(team_name_extracted);
    END IF;
  END IF;
  
  -- Insert or update user_stats with rank-based points
  INSERT INTO user_stats (
    user_id,
    tournament_wins,
    first_place_count,
    second_place_count,
    third_place_count,
    total_earnings,
    stats_points,
    team_wins,
    best_team_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    CASE WHEN position_number = 1 THEN 1 ELSE 0 END,
    CASE WHEN position_number = 1 THEN 1 ELSE 0 END,
    CASE WHEN position_number = 2 THEN 1 ELSE 0 END,
    CASE WHEN position_number = 3 THEN 1 ELSE 0 END,
    NEW.amount,
    points_to_add,
    CASE WHEN team_name_extracted IS NOT NULL AND position_number = 1 THEN 1 ELSE 0 END,
    CASE WHEN team_name_extracted IS NOT NULL AND position_number = 1 THEN team_name_extracted ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tournament_wins = user_stats.tournament_wins + CASE WHEN position_number = 1 THEN 1 ELSE 0 END,
    first_place_count = user_stats.first_place_count + CASE WHEN position_number = 1 THEN 1 ELSE 0 END,
    second_place_count = user_stats.second_place_count + CASE WHEN position_number = 2 THEN 1 ELSE 0 END,
    third_place_count = user_stats.third_place_count + CASE WHEN position_number = 3 THEN 1 ELSE 0 END,
    total_earnings = user_stats.total_earnings + NEW.amount,
    stats_points = COALESCE(user_stats.stats_points, 0) + points_to_add,
    team_wins = user_stats.team_wins + CASE WHEN team_name_extracted IS NOT NULL AND position_number = 1 THEN 1 ELSE 0 END,
    best_team_name = CASE 
      WHEN team_name_extracted IS NOT NULL AND position_number = 1 THEN team_name_extracted 
      ELSE user_stats.best_team_name 
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_stats_on_prize
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_on_win();

-- Add comment for documentation
COMMENT ON FUNCTION public.update_user_stats_on_win() IS 
'Awards stats points ONLY when explicit rank (Position #X) is found in transaction description. 
Team members all receive the same rank. No fallback/participation points are awarded.
Points: 1st=50, 2nd=30, 3rd=20, 4th-10th=10, 11+=5. No position = 0 points.';
