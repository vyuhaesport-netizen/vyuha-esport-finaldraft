-- =====================================================
-- PAYMENT GATEWAY CONFIGURATION TABLE
-- This table stores payment gateway settings and API keys
-- Easy to migrate between Supabase accounts
-- =====================================================

-- Create payment_gateway_config table
-- Stores all payment gateway configurations in one place
CREATE TABLE public.payment_gateway_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Gateway identification
  gateway_name TEXT NOT NULL UNIQUE, -- 'razorpay', 'paytm', 'phonepe', etc.
  display_name TEXT NOT NULL, -- 'Razorpay', 'PayTM', 'PhonePe'
  
  -- Enable/Disable switch
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false, -- Only one can be default
  
  -- API Keys (encrypted at rest by Supabase)
  api_key_id TEXT, -- Public/Key ID (e.g., Razorpay Key ID)
  api_key_secret TEXT, -- Secret Key (stored securely)
  webhook_secret TEXT, -- Webhook verification secret
  
  -- Configuration options
  environment TEXT NOT NULL DEFAULT 'test', -- 'test' or 'live'
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Feature flags
  supports_auto_credit BOOLEAN DEFAULT true, -- Auto credit on successful payment
  supports_refunds BOOLEAN DEFAULT true,
  supports_recurring BOOLEAN DEFAULT false,
  
  -- Minimum/Maximum transaction limits
  min_amount NUMERIC(10,2) DEFAULT 10.00,
  max_amount NUMERIC(10,2) DEFAULT 50000.00,
  
  -- Platform fee configuration
  platform_fee_percent NUMERIC(5,2) DEFAULT 0.00,
  platform_fee_fixed NUMERIC(10,2) DEFAULT 0.00,
  
  -- Metadata
  additional_config JSONB DEFAULT '{}'::jsonb, -- Store gateway-specific config
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Add comment for documentation
COMMENT ON TABLE public.payment_gateway_config IS 
'Stores payment gateway configurations. When migrating to new Supabase, export this table data to restore payment settings.';

COMMENT ON COLUMN public.payment_gateway_config.api_key_secret IS 
'Store the secret key securely. Consider using Supabase Vault for production.';

-- =====================================================
-- PAYMENT TRANSACTIONS TABLE
-- Tracks all payment gateway transactions
-- =====================================================

CREATE TABLE public.payment_gateway_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User and gateway reference
  user_id UUID NOT NULL,
  gateway_name TEXT NOT NULL,
  
  -- Transaction details
  order_id TEXT, -- Gateway order ID (e.g., Razorpay order_id)
  payment_id TEXT, -- Gateway payment ID
  signature TEXT, -- Payment signature for verification
  
  -- Amount details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway_fee NUMERIC(10,2) DEFAULT 0.00,
  platform_fee NUMERIC(10,2) DEFAULT 0.00,
  net_amount NUMERIC(10,2), -- Amount after fees
  
  -- Transaction type and status
  transaction_type TEXT NOT NULL DEFAULT 'credit', -- 'credit', 'debit', 'refund'
  status TEXT NOT NULL DEFAULT 'created', -- 'created', 'pending', 'completed', 'failed', 'refunded'
  
  -- Error tracking
  error_code TEXT,
  error_description TEXT,
  
  -- Wallet transaction reference
  wallet_transaction_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Store gateway response, notes, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key to wallet_transactions
  CONSTRAINT fk_wallet_transaction 
    FOREIGN KEY (wallet_transaction_id) 
    REFERENCES public.wallet_transactions(id) 
    ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX idx_pgt_user_id ON public.payment_gateway_transactions(user_id);
CREATE INDEX idx_pgt_gateway_name ON public.payment_gateway_transactions(gateway_name);
CREATE INDEX idx_pgt_order_id ON public.payment_gateway_transactions(order_id);
CREATE INDEX idx_pgt_payment_id ON public.payment_gateway_transactions(payment_id);
CREATE INDEX idx_pgt_status ON public.payment_gateway_transactions(status);
CREATE INDEX idx_pgt_created_at ON public.payment_gateway_transactions(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;

-- Payment Gateway Config - Admin only
CREATE POLICY "Only admins can view payment gateway config"
  ON public.payment_gateway_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Only super admins can modify payment gateway config"
  ON public.payment_gateway_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- Payment Gateway Transactions - Users can view their own, admins can view all
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_gateway_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_gateway_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert payment transactions"
  ON public.payment_gateway_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payment transactions"
  ON public.payment_gateway_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- INSERT DEFAULT RAZORPAY CONFIG (disabled by default)
-- =====================================================

INSERT INTO public.payment_gateway_config (
  gateway_name,
  display_name,
  is_enabled,
  is_default,
  environment,
  supports_auto_credit,
  supports_refunds,
  min_amount,
  max_amount,
  additional_config
) VALUES (
  'razorpay',
  'Razorpay',
  false,
  false,
  'test',
  true,
  true,
  10.00,
  50000.00,
  '{"checkout_theme": "dark", "prefill_contact": true, "prefill_email": true}'::jsonb
);

-- Insert manual payment option (the current system)
INSERT INTO public.payment_gateway_config (
  gateway_name,
  display_name,
  is_enabled,
  is_default,
  environment,
  supports_auto_credit,
  supports_refunds,
  min_amount,
  max_amount,
  additional_config
) VALUES (
  'manual_upi',
  'Manual UPI Payment',
  true,
  true,
  'live',
  false,
  false,
  10.00,
  50000.00,
  '{"requires_admin_approval": true}'::jsonb
);

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_payment_gateway_config_updated_at
  BEFORE UPDATE ON public.payment_gateway_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_gateway_transactions_updated_at
  BEFORE UPDATE ON public.payment_gateway_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTION: Get active payment gateway
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_active_payment_gateway()
RETURNS TABLE (
  gateway_name TEXT,
  display_name TEXT,
  is_enabled BOOLEAN,
  environment TEXT,
  min_amount NUMERIC,
  max_amount NUMERIC,
  api_key_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pgc.gateway_name,
    pgc.display_name,
    pgc.is_enabled,
    pgc.environment,
    pgc.min_amount,
    pgc.max_amount,
    pgc.api_key_id
  FROM payment_gateway_config pgc
  WHERE pgc.is_enabled = true AND pgc.is_default = true
  LIMIT 1;
END;
$$;