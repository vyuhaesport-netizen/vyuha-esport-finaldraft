-- Create AI usage tracking table
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  request_type TEXT NOT NULL DEFAULT 'support',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  model TEXT NOT NULL,
  response_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all AI logs" 
ON public.ai_usage_logs 
FOR SELECT 
USING (public.is_super_admin(auth.uid()));

-- Anyone can insert logs (edge function needs this)
CREATE POLICY "Anyone can insert AI logs" 
ON public.ai_usage_logs 
FOR INSERT 
WITH CHECK (true);

-- Create AI token limits table
CREATE TABLE public.ai_token_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  limit_type TEXT NOT NULL UNIQUE,
  daily_limit INTEGER NOT NULL DEFAULT 100000,
  monthly_limit INTEGER NOT NULL DEFAULT 3000000,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_token_limits ENABLE ROW LEVEL SECURITY;

-- Admins can manage token limits
CREATE POLICY "Admins can manage token limits" 
ON public.ai_token_limits 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

-- Insert default limit
INSERT INTO public.ai_token_limits (limit_type, daily_limit, monthly_limit, is_enabled)
VALUES ('global', 100000, 3000000, true);

-- Create index for faster queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_status ON public.ai_usage_logs(status);