-- Update process_tournament_join to block registrations within 2 minutes of start
CREATE OR REPLACE FUNCTION public.process_tournament_join(p_user_id uuid, p_tournament_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_user_balance NUMERIC;
  v_entry_fee NUMERIC;
  v_organizer_share NUMERIC;
  v_platform_share NUMERIC;
  v_prize_pool_share NUMERIC;
  v_organizer_pct NUMERIC;
  v_platform_pct NUMERIC;
  v_prize_pool_pct NUMERIC;
  v_time_until_start INTERVAL;
BEGIN
  -- Lock tournament row
  SELECT * INTO v_tournament 
  FROM tournaments 
  WHERE id = p_tournament_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  -- Check if tournament starts within 2 minutes (registration locked)
  v_time_until_start := v_tournament.start_date - now();
  IF v_time_until_start <= interval '2 minutes' THEN
    RETURN json_build_object('success', false, 'error', 'Registration is closed. Tournament starts in less than 2 minutes.');
  END IF;

  -- Check registration deadline
  IF v_tournament.registration_deadline IS NOT NULL AND v_tournament.registration_deadline < now() THEN
    RETURN json_build_object('success', false, 'error', 'Registration deadline has passed');
  END IF;
  
  IF v_tournament.joined_users IS NOT NULL AND p_user_id = ANY(v_tournament.joined_users) THEN
    RETURN json_build_object('success', false, 'error', 'You have already joined this tournament');
  END IF;
  
  IF v_tournament.joined_users IS NOT NULL AND 
     array_length(v_tournament.joined_users, 1) >= v_tournament.max_participants THEN
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
  
  -- Get platform fee percentages
  SELECT 
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'organizer_fee_percentage'), 10),
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'platform_fee_percentage'), 10),
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'prize_pool_percentage'), 80)
  INTO v_organizer_pct, v_platform_pct, v_prize_pool_pct;
  
  v_organizer_share := (v_entry_fee * v_organizer_pct) / 100;
  v_platform_share := (v_entry_fee * v_platform_pct) / 100;
  v_prize_pool_share := v_entry_fee - v_organizer_share - v_platform_share;
  
  -- Deduct from user wallet
  UPDATE profiles 
  SET wallet_balance = wallet_balance - v_entry_fee,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Update tournament
  UPDATE tournaments 
  SET 
    joined_users = array_append(COALESCE(joined_users, ARRAY[]::uuid[]), p_user_id),
    total_fees_collected = COALESCE(total_fees_collected, 0) + v_entry_fee,
    organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
    platform_earnings = COALESCE(platform_earnings, 0) + v_platform_share,
    current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
    updated_at = now()
  WHERE id = p_tournament_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (user_id, type, amount, status, description)
  VALUES (p_user_id, 'entry_fee', v_entry_fee, 'completed', 
          'Entry fee for tournament: ' || v_tournament.title);
  
  -- Create registration record
  INSERT INTO tournament_registrations (user_id, tournament_id, status)
  VALUES (p_user_id, p_tournament_id, 'registered')
  ON CONFLICT DO NOTHING;
  
  -- Send notification
  PERFORM create_notification(
    p_user_id,
    'Tournament Joined',
    'tournament_join',
    '🎮 You have successfully joined "' || v_tournament.title || '"! Entry fee ₹' || v_entry_fee || ' deducted. Good luck!',
    p_tournament_id
  );
  
  RETURN json_build_object(
    'success', true, 
    'entry_fee', v_entry_fee,
    'new_balance', v_user_balance - v_entry_fee,
    'participants', COALESCE(array_length(v_tournament.joined_users, 1), 0) + 1
  );
END;
$function$;

-- Update process_team_tournament_join to block registrations within 2 minutes of start
CREATE OR REPLACE FUNCTION public.process_team_tournament_join(p_tournament_id uuid, p_leader_id uuid, p_team_name text, p_team_member_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament RECORD;
  v_entry_fee NUMERIC;
  v_member_id uuid;
  v_member_balance NUMERIC;
  v_all_balances_ok BOOLEAN := true;
  v_insufficient_members TEXT[] := ARRAY[]::TEXT[];
  v_organizer_share NUMERIC;
  v_platform_share NUMERIC;
  v_prize_pool_share NUMERIC;
  v_organizer_pct NUMERIC;
  v_platform_pct NUMERIC;
  v_prize_pool_pct NUMERIC;
  v_team_size INT;
  v_time_until_start INTERVAL;
BEGIN
  v_team_size := array_length(p_team_member_ids, 1);
  
  IF v_team_size IS NULL OR v_team_size < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Team must have at least 2 members');
  END IF;

  -- Lock tournament row
  SELECT * INTO v_tournament 
  FROM tournaments 
  WHERE id = p_tournament_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  IF v_tournament.status != 'upcoming' THEN
    RETURN json_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  -- Check if tournament starts within 2 minutes (registration locked)
  v_time_until_start := v_tournament.start_date - now();
  IF v_time_until_start <= interval '2 minutes' THEN
    RETURN json_build_object('success', false, 'error', 'Registration is closed. Tournament starts in less than 2 minutes.');
  END IF;

  -- Check registration deadline
  IF v_tournament.registration_deadline IS NOT NULL AND v_tournament.registration_deadline < now() THEN
    RETURN json_build_object('success', false, 'error', 'Registration deadline has passed');
  END IF;

  -- Check if tournament mode matches team size
  IF v_tournament.tournament_mode = 'duo' AND v_team_size != 2 THEN
    RETURN json_build_object('success', false, 'error', 'Duo tournament requires exactly 2 players');
  END IF;
  
  IF v_tournament.tournament_mode = 'squad' AND v_team_size != 4 THEN
    RETURN json_build_object('success', false, 'error', 'Squad tournament requires exactly 4 players');
  END IF;
  
  -- Check if any team member is already registered
  IF EXISTS (
    SELECT 1 FROM tournament_registrations 
    WHERE tournament_id = p_tournament_id 
    AND user_id = ANY(p_team_member_ids)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'One or more team members are already registered');
  END IF;
  
  v_entry_fee := COALESCE(v_tournament.entry_fee, 0);
  
  -- Check all member balances FIRST before any deduction
  FOREACH v_member_id IN ARRAY p_team_member_ids LOOP
    SELECT wallet_balance INTO v_member_balance 
    FROM profiles 
    WHERE user_id = v_member_id;
    
    IF v_member_balance IS NULL OR v_member_balance < v_entry_fee THEN
      v_all_balances_ok := false;
      v_insufficient_members := array_append(v_insufficient_members, v_member_id::text);
    END IF;
  END LOOP;
  
  IF NOT v_all_balances_ok THEN
    RETURN json_build_object('success', false, 'error', 'One or more team members have insufficient balance');
  END IF;
  
  -- Get platform fee percentages
  SELECT 
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'organizer_fee_percentage'), 10),
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'platform_fee_percentage'), 10),
    COALESCE((SELECT setting_value::numeric FROM platform_settings WHERE setting_key = 'prize_pool_percentage'), 80)
  INTO v_organizer_pct, v_platform_pct, v_prize_pool_pct;
  
  -- Now deduct from ALL team members
  FOREACH v_member_id IN ARRAY p_team_member_ids LOOP
    UPDATE profiles 
    SET wallet_balance = wallet_balance - v_entry_fee,
        updated_at = now()
    WHERE user_id = v_member_id;
    
    -- Create transaction record for each member
    INSERT INTO wallet_transactions (user_id, type, amount, status, description)
    VALUES (v_member_id, 'entry_fee', v_entry_fee, 'completed', 
            'Team entry fee for tournament: ' || v_tournament.title || ' (Team: ' || p_team_name || ')');
    
    -- Create registration record for each member
    INSERT INTO tournament_registrations (user_id, tournament_id, status, team_name, team_members, is_team_leader)
    VALUES (
      v_member_id, 
      p_tournament_id, 
      'registered',
      p_team_name,
      p_team_member_ids,
      v_member_id = p_leader_id
    )
    ON CONFLICT DO NOTHING;
    
    -- Send notification to each member
    PERFORM create_notification(
      v_member_id,
      'Team Tournament Joined',
      'tournament_join',
      '🎮 Your team "' || p_team_name || '" has joined "' || v_tournament.title || '"! Entry fee ₹' || v_entry_fee || ' deducted. Good luck!',
      p_tournament_id
    );
  END LOOP;
  
  -- Calculate shares for total team entry
  v_organizer_share := (v_entry_fee * v_team_size * v_organizer_pct) / 100;
  v_platform_share := (v_entry_fee * v_team_size * v_platform_pct) / 100;
  v_prize_pool_share := (v_entry_fee * v_team_size) - v_organizer_share - v_platform_share;
  
  -- Update tournament with all team members
  UPDATE tournaments 
  SET 
    joined_users = array_cat(COALESCE(joined_users, ARRAY[]::uuid[]), p_team_member_ids),
    total_fees_collected = COALESCE(total_fees_collected, 0) + (v_entry_fee * v_team_size),
    organizer_earnings = COALESCE(organizer_earnings, 0) + v_organizer_share,
    platform_earnings = COALESCE(platform_earnings, 0) + v_platform_share,
    current_prize_pool = COALESCE(current_prize_pool, 0) + v_prize_pool_share,
    updated_at = now()
  WHERE id = p_tournament_id;
  
  RETURN json_build_object(
    'success', true, 
    'entry_fee_per_member', v_entry_fee,
    'total_deducted', v_entry_fee * v_team_size,
    'team_size', v_team_size
  );
END;
$function$;