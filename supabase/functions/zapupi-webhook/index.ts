import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'ZapUPI webhook endpoint is active',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse webhook data
    let webhookData;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      webhookData = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData);
    } else {
      const text = await req.text();
      try {
        webhookData = JSON.parse(text);
      } catch {
        // Try to parse as URL encoded
        webhookData = Object.fromEntries(new URLSearchParams(text));
      }
    }

    console.log('ZapUPI Webhook received:', webhookData);

    const { order_id, status, transaction_id, amount } = webhookData;

    if (!order_id || !status) {
      console.error('Invalid webhook data - missing order_id or status');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the transaction
    const { data: txnData, error: fetchError } = await supabase
      .from('payment_gateway_transactions')
      .select('*')
      .eq('order_id', order_id)
      .eq('gateway_name', 'zapupi')
      .single();

    if (fetchError || !txnData) {
      console.error('Transaction not found:', order_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed
    if (txnData.status === 'completed') {
      console.log('Transaction already processed:', order_id);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on status
    if (status.toLowerCase() === 'success') {
      console.log('Processing successful payment:', order_id);

      // Update transaction
      await supabase
        .from('payment_gateway_transactions')
        .update({
          status: 'completed',
          payment_id: transaction_id || null,
          completed_at: new Date().toISOString(),
          metadata: {
            ...txnData.metadata,
            webhook_received_at: new Date().toISOString(),
            zapupi_transaction_id: transaction_id
          }
        })
        .eq('id', txnData.id);

      // Create wallet transaction
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: txnData.user_id,
          type: 'deposit',
          amount: txnData.amount,
          status: 'completed',
          description: `ZapUPI Payment - ${order_id}`,
        });

      if (walletError) {
        console.error('Error creating wallet transaction:', walletError);
      }

      // Update wallet balance
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', txnData.user_id)
        .single();

      const currentBalance = profileData?.wallet_balance || 0;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: currentBalance + txnData.amount })
        .eq('user_id', txnData.user_id);

      if (balanceError) {
        console.error('Error updating wallet balance:', balanceError);
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: txnData.user_id,
          type: 'payment',
          title: 'Deposit Successful',
          message: `₹${txnData.amount} has been added to your wallet via ZapUPI`,
          related_id: txnData.id
        });

      console.log('Payment processed successfully:', order_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Payment failed
      console.log('Payment failed:', order_id, status);

      await supabase
        .from('payment_gateway_transactions')
        .update({
          status: 'failed',
          error_description: `Payment ${status}`,
          metadata: {
            ...txnData.metadata,
            webhook_received_at: new Date().toISOString(),
            failure_status: status
          }
        })
        .eq('id', txnData.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Failure recorded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error in zapupi-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
