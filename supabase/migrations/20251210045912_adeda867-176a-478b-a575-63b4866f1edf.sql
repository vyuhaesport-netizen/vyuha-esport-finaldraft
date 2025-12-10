-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  request_callback BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can create their own support tickets
CREATE POLICY "Users can create own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- Admins can update tickets (respond)
CREATE POLICY "Admins can update tickets"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_super_admin(auth.uid()));

-- Fix user_roles INSERT policy - Allow super admin to insert roles for other users
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  is_super_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin')
);

-- Allow admins/super admin to update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Allow admins/super admin to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Add trigger for updated_at on support_tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();