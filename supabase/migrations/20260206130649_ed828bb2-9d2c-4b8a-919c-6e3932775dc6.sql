-- Create function to auto-assign player to local tournament room
CREATE OR REPLACE FUNCTION public.auto_assign_local_tournament_room(
  p_tournament_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game TEXT;
  v_max_per_room INT;
  v_current_room local_tournament_rooms%ROWTYPE;
  v_room_count INT;
  v_assignment_count INT;
BEGIN
  -- Get tournament game type
  SELECT game INTO v_game
  FROM local_tournaments
  WHERE id = p_tournament_id;

  IF v_game IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Set max players per room based on game
  IF v_game = 'BGMI' THEN
    v_max_per_room := 100;
  ELSIF v_game = 'Free Fire' OR v_game = 'Free Fire MAX' THEN
    v_max_per_room := 48;
  ELSE
    v_max_per_room := 100; -- Default
  END IF;

  -- Check if user already assigned
  SELECT COUNT(*) INTO v_assignment_count
  FROM local_tournament_room_assignments lra
  JOIN local_tournament_rooms lr ON lr.id = lra.room_id
  WHERE lr.tournament_id = p_tournament_id
  AND lra.user_id = p_user_id;

  IF v_assignment_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already assigned');
  END IF;

  -- Find room with available slots
  SELECT lr.* INTO v_current_room
  FROM local_tournament_rooms lr
  WHERE lr.tournament_id = p_tournament_id
  AND lr.status = 'waiting'
  AND (
    SELECT COUNT(*)
    FROM local_tournament_room_assignments
    WHERE room_id = lr.id
  ) < v_max_per_room
  ORDER BY lr.room_number ASC
  LIMIT 1;

  -- If no room available, create new one
  IF v_current_room.id IS NULL THEN
    SELECT COUNT(*) + 1 INTO v_room_count
    FROM local_tournament_rooms
    WHERE tournament_id = p_tournament_id;

    INSERT INTO local_tournament_rooms (
      tournament_id,
      room_number,
      room_name,
      status
    )
    VALUES (
      p_tournament_id,
      v_room_count,
      'Room ' || v_room_count,
      'waiting'
    )
    RETURNING * INTO v_current_room;
  END IF;

  -- Get next slot number
  SELECT COALESCE(MAX(slot_number), 0) + 1 INTO v_assignment_count
  FROM local_tournament_room_assignments
  WHERE room_id = v_current_room.id;

  -- Assign player to room
  INSERT INTO local_tournament_room_assignments (
    room_id,
    user_id,
    slot_number
  )
  VALUES (
    v_current_room.id,
    p_user_id,
    v_assignment_count
  );

  RETURN jsonb_build_object(
    'success', true,
    'room_id', v_current_room.id,
    'room_number', v_current_room.room_number,
    'room_name', v_current_room.room_name
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_assign_local_tournament_room(UUID, UUID) TO authenticated;