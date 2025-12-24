import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

// Verify Razorpay webhook signature
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Razorpay webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get request body as text for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    
    console.log('Webhook signature present:', !!signature);
    
    // Get webhook secret from database
    const { data: configData, error: configError } = await supabase
      .from('payment_gateway_config')
      .select('webhook_secret')
      .eq('gateway_name', 'razorpay')
      .single();
    
    if (configError) {
      console.error('Error fetching webhook secret:', configError);
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verify signature if webhook secret is configured
    if (configData?.webhook_secret && signature) {
      const isValid = await verifySignature(bodyText, signature, configData.webhook_secret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('Webhook signature verified');
    } else {
      console.log('Webhook secret not configured, skipping signature verification');
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(bodyText);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    
    console.log('Webhook event:', event);
    console.log('Payment ID:', paymentEntity?.id);
    
    // Handle different event types
    switch (event) {
      case 'payment.captured':
      case 'payment.authorized': {
        const paymentId = paymentEntity?.id;
        const amount = paymentEntity?.amount / 100; // Convert paise to rupees
        const orderId = paymentEntity?.order_id;
        const status = paymentEntity?.status;
        const email = paymentEntity?.email;
        const contact = paymentEntity?.contact;
        
        console.log('Processing payment:', { paymentId, amount, orderId, status });
        
        // Find the transaction by payment_id or order_id
        const { data: txnData, error: txnError } = await supabase
          .from('payment_gateway_transactions')
          .select('*')
          .or(`payment_id.eq.${paymentId},order_id.eq.${orderId}`)
          .single();
        
        if (txnError && txnError.code !== 'PGRST116') {
          console.error('Error finding transaction:', txnError);
        }
        
        if (txnData) {
          // Update existing transaction
          const { error: updateError } = await supabase
            .from('payment_gateway_transactions')
            .update({
              status: 'completed',
              payment_id: paymentId,
              completed_at: new Date().toISOString(),
              metadata: {
                ...txnData.metadata,
                webhook_event: event,
                razorpay_status: status,
                contact,
                email,
              }
            })
            .eq('id', txnData.id);
          
          if (updateError) {
            console.error('Error updating transaction:', updateError);
          } else {
            console.log('Transaction updated:', txnData.id);
            
            // Update wallet balance
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('user_id', txnData.user_id)
              .single();
            
            if (profile) {
              const newBalance = (profile.wallet_balance || 0) + amount;
              await supabase
                .from('profiles')
                .update({ wallet_balance: newBalance })
                .eq('user_id', txnData.user_id);
              
              console.log('Wallet balance updated for user:', txnData.user_id);
            }
            
            // Create wallet transaction record if not already exists
            const { error: walletError } = await supabase
              .from('wallet_transactions')
              .insert({
                user_id: txnData.user_id,
                type: 'deposit',
                amount: amount,
                status: 'completed',
                description: `Razorpay Payment - ${paymentId}`,
              });
            
            if (walletError) {
              console.error('Error creating wallet transaction:', walletError);
            }
          }
        } else {
          console.log('Transaction not found, may be a new payment - skipping');
        }
        break;
      }
      
      case 'payment.failed': {
        const paymentId = paymentEntity?.id;
        const orderId = paymentEntity?.order_id;
        const errorCode = paymentEntity?.error_code;
        const errorDescription = paymentEntity?.error_description;
        
        console.log('Payment failed:', { paymentId, errorCode, errorDescription });
        
        // Update transaction status
        const { error: updateError } = await supabase
          .from('payment_gateway_transactions')
          .update({
            status: 'failed',
            error_code: errorCode,
            error_description: errorDescription,
            metadata: {
              webhook_event: event,
              razorpay_error: paymentEntity?.error_reason,
            }
          })
          .or(`payment_id.eq.${paymentId},order_id.eq.${orderId}`);
        
        if (updateError) {
          console.error('Error updating failed transaction:', updateError);
        }
        break;
      }
      
      case 'refund.created':
      case 'refund.processed': {
        const refundEntity = payload.payload?.refund?.entity;
        const refundId = refundEntity?.id;
        const paymentId = refundEntity?.payment_id;
        const amount = refundEntity?.amount / 100;
        
        console.log('Refund processed:', { refundId, paymentId, amount });
        
        // Create refund transaction
        const { data: originalTxn } = await supabase
          .from('payment_gateway_transactions')
          .select('user_id')
          .eq('payment_id', paymentId)
          .single();
        
        if (originalTxn) {
          await supabase
            .from('payment_gateway_transactions')
            .insert({
              user_id: originalTxn.user_id,
              gateway_name: 'razorpay',
              payment_id: refundId,
              amount: amount,
              transaction_type: 'refund',
              status: 'completed',
              metadata: { original_payment_id: paymentId }
            });
        }
        break;
      }
      
      default:
        console.log('Unhandled event type:', event);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
