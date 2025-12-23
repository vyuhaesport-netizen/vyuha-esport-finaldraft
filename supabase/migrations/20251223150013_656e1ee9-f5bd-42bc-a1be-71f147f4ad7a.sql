-- Create local tournament applications table
CREATE TABLE public.local_tournament_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Organizer Info
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'school', -- 'school' or 'college'
  location_address TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  primary_phone TEXT NOT NULL,
  alternate_phone TEXT,
  
  -- Tournament Info
  tournament_name TEXT NOT NULL,
  game TEXT NOT NULL,
  tournament_mode TEXT NOT NULL DEFAULT 'solo', -- solo, duo, squad
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 50,
  tournament_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Prize Distribution (JSON)
  prize_distribution JSONB DEFAULT '{}',
  
  -- Status and Admin
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Private Access
  private_code TEXT UNIQUE, -- unique code for private access
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create local tournaments table (created from approved applications)
CREATE TABLE public.local_tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES local_tournament_applications(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL,
  
  -- Tournament Details (copied from application)
  institution_name TEXT NOT NULL,
  tournament_name TEXT NOT NULL,
  game TEXT NOT NULL,
  tournament_mode TEXT NOT NULL DEFAULT 'solo',
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 50,
  tournament_date TIMESTAMP WITH TIME ZONE NOT NULL,
  prize_distribution JSONB DEFAULT '{}',
  
  -- Private Access
  private_code TEXT UNIQUE NOT NULL, -- unique code for joining
  qr_code_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  
  -- Participants
  joined_users UUID[] DEFAULT '{}',
  
  -- Financials
  total_fees_collected NUMERIC DEFAULT 0,
  current_prize_pool NUMERIC DEFAULT 0,
  organizer_earnings NUMERIC DEFAULT 0,
  
  -- Winner
  winner_user_id UUID,
  winner_declared_at TIMESTAMP WITH TIME ZONE,
  
  -- Room Details
  room_id TEXT,
  room_password TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.local_tournament_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_tournaments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for local_tournament_applications
CREATE POLICY "Users can view own applications"
ON public.local_tournament_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
ON public.local_tournament_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications"
ON public.local_tournament_applications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
ON public.local_tournament_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can update applications"
ON public.local_tournament_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- RLS Policies for local_tournaments
CREATE POLICY "Organizers can view own tournaments"
ON public.local_tournaments
FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can view tournaments with private code"
ON public.local_tournaments
FOR SELECT
USING (true); -- We'll filter by private_code in the app

CREATE POLICY "System can create local tournaments"
ON public.local_tournaments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Organizers can update own tournaments"
ON public.local_tournaments
FOR UPDATE
USING (auth.uid() = organizer_id);

CREATE POLICY "Admins can manage all local tournaments"
ON public.local_tournaments
FOR ALL
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- Function to generate unique private code
CREATE OR REPLACE FUNCTION public.generate_private_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to approve local tournament application
CREATE OR REPLACE FUNCTION public.approve_local_tournament(p_application_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_application RECORD;
  v_private_code TEXT;
  v_tournament_id UUID;
BEGIN
  -- Get application
  SELECT * INTO v_application
  FROM local_tournament_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  IF v_application.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Application already processed');
  END IF;

  -- Generate unique private code
  LOOP
    v_private_code := generate_private_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM local_tournaments WHERE private_code = v_private_code);
  END LOOP;

  -- Update application
  UPDATE local_tournament_applications
  SET status = 'approved',
      private_code = v_private_code,
      admin_notes = p_admin_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  -- Create local tournament
  INSERT INTO local_tournaments (
    application_id,
    organizer_id,
    institution_name,
    tournament_name,
    game,
    tournament_mode,
    entry_fee,
    max_participants,
    tournament_date,
    prize_distribution,
    private_code
  )
  VALUES (
    p_application_id,
    v_application.user_id,
    v_application.institution_name,
    v_application.tournament_name,
    v_application.game,
    v_application.tournament_mode,
    v_application.entry_fee,
    v_application.max_participants,
    v_application.tournament_date,
    v_application.prize_distribution,
    v_private_code
  )
  RETURNING id INTO v_tournament_id;

  -- Notify user
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_application.user_id,
    'local_tournament_approved',
    '🎉 Local Tournament Approved!',
    'Your tournament "' || v_application.tournament_name || '" at ' || v_application.institution_name || ' has been approved! Private Code: ' || v_private_code,
    v_tournament_id
  );

  RETURN json_build_object(
    'success', true,
    'tournament_id', v_tournament_id,
    'private_code', v_private_code
  );
END;
$$;

-- Function to reject local tournament application
CREATE OR REPLACE FUNCTION public.reject_local_tournament(p_application_id UUID, p_reason TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_application RECORD;
BEGIN
  SELECT * INTO v_application
  FROM local_tournament_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  IF v_application.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Application already processed');
  END IF;

  UPDATE local_tournament_applications
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  -- Notify user
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_application.user_id,
    'local_tournament_rejected',
    '❌ Local Tournament Application Rejected',
    'Your application for "' || v_application.tournament_name || '" was rejected. Reason: ' || p_reason,
    p_application_id
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Function to join local tournament
CREATE OR REPLACE FUNCTION public.join_local_tournament(p_user_id UUID, p_private_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_user_balance NUMERIC;
  v_entry_fee NUMERIC;
  v_prize_pool_share NUMERIC;
  v_organizer_share NUMERIC;
BEGIN
  -- Get tournament by private code
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE private_code = UPPER(p_private_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid tournament code');
  END IF;

  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  IF p_user_id = ANY(COALESCE(v_tournament.joined_users, ARRAY[]::uuid[])) THEN
    RETURN json_build_object('success', false, 'error', 'You have already joined this tournament');
  END IF;

  IF array_length(v_tournament.joined_users, 1) >= v_tournament.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is full');
  END IF;

  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);

  -- Get user balance
  SELECT wallet_balance INTO v_user_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_user_balance IS NULL OR v_user_balance < v_entry_fee THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- Calculate shares (80% prize pool, 20% organizer for local tournaments)
  v_prize_pool_share := v_entry_fee * 0.8;
  v_organizer_share := v_entry_fee * 0.2;

  -- Deduct from user wallet
  UPDATE profiles
  SET wallet_balance = wallet_balance - v_entry_fee,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Update tournament
  UPDATE local_tournaments
  SET joined_users = array_append(COALESCE(joined_users, ARRAY[]::uuid[]), p_user_id),
      total_fees_collected = COALESCE(total_fees_collected, 0) + v_entry_fee,
      current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
      organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
      updated_at = now()
  WHERE id = v_tournament.id;

  -- Create transaction record
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'entry_fee', v_entry_fee, 'completed',
          'Local tournament entry: ' || v_tournament.tournament_name);

  -- Send notification
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    p_user_id,
    'local_tournament_joined',
    '🎮 Joined Local Tournament!',
    'You joined "' || v_tournament.tournament_name || '" at ' || v_tournament.institution_name || '. Entry fee ₹' || v_entry_fee || ' deducted.',
    v_tournament.id
  );

  RETURN json_build_object(
    'success', true,
    'tournament', row_to_json(v_tournament),
    'entry_fee', v_entry_fee
  );
END;
$$;

-- Function to declare local tournament winner (instant, no delay)
CREATE OR REPLACE FUNCTION public.declare_local_winner(p_tournament_id UUID, p_organizer_id UUID, p_winner_positions JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament RECORD;
  v_prize_distribution JSONB;
  v_prize_pool NUMERIC;
  v_user_id TEXT;
  v_position INT;
  v_prize_amount NUMERIC;
  v_total_distributed NUMERIC := 0;
  v_first_winner_id UUID;
  v_organizer_earnings NUMERIC;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament
  FROM local_tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  IF v_tournament.organizer_id != p_organizer_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Winner already declared');
  END IF;

  v_prize_distribution := COALESCE(v_tournament.prize_distribution, '{}'::jsonb);
  v_prize_pool := COALESCE(v_tournament.current_prize_pool, 0);

  -- Process winners
  FOR v_user_id, v_position IN
    SELECT key, value::int FROM jsonb_each_text(p_winner_positions)
  LOOP
    v_prize_amount := 0;
    
    IF v_prize_distribution ? v_position::text THEN
      v_prize_amount := (v_prize_distribution->>v_position::text)::NUMERIC;
    ELSE
      IF v_position = 1 THEN v_prize_amount := v_prize_pool * 0.5;
      ELSIF v_position = 2 THEN v_prize_amount := v_prize_pool * 0.3;
      ELSIF v_position = 3 THEN v_prize_amount := v_prize_pool * 0.2;
      END IF;
    END IF;

    IF v_prize_amount > 0 AND v_total_distributed + v_prize_amount <= v_prize_pool THEN
      -- Credit winner wallet
      UPDATE profiles
      SET wallet_balance = wallet_balance + v_prize_amount,
          updated_at = now()
      WHERE user_id = v_user_id::uuid;

      -- Transaction record
      INSERT INTO wallet_transactions (user_id, type, amount, status, description)
      VALUES (v_user_id::uuid, 'prize', v_prize_amount, 'completed',
              'Position #' || v_position || ' prize - ' || v_tournament.tournament_name);

      -- Notify winner
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (v_user_id::uuid, 'prize_won', '🏆 You Won!',
              'Position #' || v_position || ' in "' || v_tournament.tournament_name || '"! ₹' || v_prize_amount || ' credited.',
              p_tournament_id);

      v_total_distributed := v_total_distributed + v_prize_amount;
      IF v_position = 1 THEN v_first_winner_id := v_user_id::uuid; END IF;
    END IF;
  END LOOP;

  -- Credit organizer earnings directly to wallet (no Dhana, instant)
  v_organizer_earnings := COALESCE(v_tournament.organizer_earnings, 0);
  IF v_organizer_earnings > 0 THEN
    UPDATE profiles
    SET wallet_balance = wallet_balance + v_organizer_earnings,
        updated_at = now()
    WHERE user_id = p_organizer_id;

    INSERT INTO wallet_transactions (user_id, type, amount, status, description)
    VALUES (p_organizer_id, 'organizer_commission', v_organizer_earnings, 'completed',
            'Local tournament commission: ' || v_tournament.tournament_name);

    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (p_organizer_id, 'commission_earned', '💰 Commission Earned!',
            '₹' || v_organizer_earnings || ' commission credited for "' || v_tournament.tournament_name || '"',
            p_tournament_id);
  END IF;

  -- Update tournament
  UPDATE local_tournaments
  SET winner_user_id = COALESCE(v_first_winner_id, (SELECT (jsonb_object_keys(p_winner_positions))::uuid LIMIT 1)),
      winner_declared_at = now(),
      status = 'completed',
      ended_at = now(),
      updated_at = now()
  WHERE id = p_tournament_id;

  RETURN json_build_object(
    'success', true,
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_organizer_earnings
  );
END;
$$;