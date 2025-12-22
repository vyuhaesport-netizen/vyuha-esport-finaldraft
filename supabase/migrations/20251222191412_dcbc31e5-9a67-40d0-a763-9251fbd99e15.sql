-- Create admin_process_withdrawal function for secure withdrawal rejection with refund
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_withdrawal_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_email TEXT;
  v_new_balance NUMERIC;
BEGIN
  -- Validate inputs
  IF p_withdrawal_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal ID is required');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action. Must be approve or reject');
  END IF;

  -- Authorize: only admin emails or explicit permission
  SELECT u.email
  INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unable to resolve admin identity');
  END IF;

  IF NOT (
    public.is_admin_email(v_email)
    OR public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_admin_permission(auth.uid(), 'withdrawals:manage')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Lock the withdrawal transaction row
  SELECT * INTO v_tx
  FROM public.wallet_transactions
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_tx IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_tx.type <> 'withdrawal' THEN
    RETURN json_build_object('success', false, 'error', 'Transaction is not a withdrawal');
  END IF;

  IF v_tx.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal is not pending');
  END IF;

  IF p_action = 'approve' THEN
    -- Just mark as completed (money already deducted when user requested)
    UPDATE public.wallet_transactions
    SET status = 'completed',
        processed_by = auth.uid(),
        updated_at = now()
    WHERE id = p_withdrawal_id;

    RETURN json_build_object('success', true, 'status', 'completed');
  END IF;

  -- REJECT: refund the amount back to user's wallet atomically
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + ABS(COALESCE(v_tx.amount, 0)),
      updated_at = now()
  WHERE user_id = v_tx.user_id
  RETURNING wallet_balance INTO v_new_balance;

  UPDATE public.wallet_transactions
  SET status = 'rejected',
      processed_by = auth.uid(),
      reason = COALESCE(NULLIF(TRIM(p_reason), ''), 'Rejected by admin'),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  RETURN json_build_object('success', true, 'status', 'rejected', 'new_balance', v_new_balance);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;