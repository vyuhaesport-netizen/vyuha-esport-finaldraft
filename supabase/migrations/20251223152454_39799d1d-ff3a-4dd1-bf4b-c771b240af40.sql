-- Add local tournament commission setting
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES ('local_tournament_organizer_commission', '10', 'Commission percentage for local tournament organizers')
ON CONFLICT (setting_key) DO NOTHING;

-- Drop and recreate the declare_local_winner function
DROP FUNCTION IF EXISTS declare_local_winner(UUID, UUID, JSONB);

CREATE FUNCTION public.declare_local_winner(
  p_tournament_id UUID,
  p_organizer_id UUID,
  p_winner_positions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_winner_id UUID;
  v_position TEXT;
  v_amount NUMERIC;
  v_total_distributed NUMERIC := 0;
  v_organizer_commission_percent NUMERIC := 10;
  v_calculated_organizer_earnings NUMERIC;
BEGIN
  SELECT * INTO v_tournament FROM local_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  IF v_tournament.organizer_id != p_organizer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the organizer can declare winners');
  END IF;
  
  IF v_tournament.winner_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Winners already declared');
  END IF;
  
  SELECT COALESCE(setting_value::NUMERIC, 10) INTO v_organizer_commission_percent
  FROM platform_settings WHERE setting_key = 'local_tournament_organizer_commission';
  
  v_calculated_organizer_earnings := v_tournament.total_fees_collected * (v_organizer_commission_percent / 100);
  
  FOR v_position, v_amount IN SELECT * FROM jsonb_each_text(p_winner_positions) LOOP
    v_winner_id := v_position::UUID;
    
    UPDATE profiles 
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount::NUMERIC
    WHERE user_id = v_winner_id;
    
    v_total_distributed := v_total_distributed + v_amount::NUMERIC;
    
    PERFORM create_notification(
      v_winner_id,
      'local_tournament_win',
      '🏆 You Won!',
      'You won ₹' || v_amount || ' in ' || v_tournament.tournament_name,
      p_tournament_id
    );
  END LOOP;
  
  SELECT key::UUID INTO v_winner_id FROM jsonb_each_text(p_winner_positions) LIMIT 1;
  
  UPDATE local_tournaments SET 
    winner_user_id = v_winner_id,
    winner_declared_at = NOW(),
    organizer_earnings = v_calculated_organizer_earnings,
    status = 'completed'
  WHERE id = p_tournament_id;
  
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_calculated_organizer_earnings
  WHERE user_id = p_organizer_id;
  
  PERFORM create_notification(
    p_organizer_id,
    'local_tournament_earnings',
    '💰 Commission Earned!',
    'You earned ₹' || v_calculated_organizer_earnings || ' from ' || v_tournament.tournament_name,
    p_tournament_id
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'total_distributed', v_total_distributed,
    'organizer_earnings', v_calculated_organizer_earnings
  );
END;
$$;

-- Create function to recalculate local tournament prize pool
CREATE OR REPLACE FUNCTION public.recalculate_local_tournament_prizepool(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_commission_percent NUMERIC := 10;
  v_new_prize_pool NUMERIC;
  v_new_organizer_earnings NUMERIC;
BEGIN
  SELECT * INTO v_tournament FROM local_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;
  
  SELECT COALESCE(setting_value::NUMERIC, 10) INTO v_commission_percent
  FROM platform_settings WHERE setting_key = 'local_tournament_organizer_commission';
  
  v_new_organizer_earnings := v_tournament.total_fees_collected * (v_commission_percent / 100);
  v_new_prize_pool := v_tournament.total_fees_collected - v_new_organizer_earnings;
  
  UPDATE local_tournaments SET
    current_prize_pool = v_new_prize_pool,
    organizer_earnings = v_new_organizer_earnings
  WHERE id = p_tournament_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'prize_pool', v_new_prize_pool,
    'organizer_earnings', v_new_organizer_earnings
  );
END;
$$;