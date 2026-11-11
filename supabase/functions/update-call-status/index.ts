import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check authorization header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    // We expect the Doctor Portal to send the webhook secret
    const webhookSecret = Deno.env.get('DOCTOR_APPOINTMENT_WEBHOOK_SECRET')
    if (token !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { order_id, call_status, order_status, meet_link } = await req.json()

    if (!order_id || !call_status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // The doctor finished or cancelled the consultation: the patient's booking shows it.
    const update: Record<string, unknown> = { call_status }
    // The Google Meet link the doctor opened: the patient joins from their booking.
    if (typeof meet_link === 'string' && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meet_link)) update.meet_link = meet_link
    if (order_status === 'completed') update.status = 'completed'
    if (order_status === 'cancelled') {
      update.status = 'cancelled'
      update.cancelled_at = new Date().toISOString()
      update.cancellation_reason = 'Cancelled by the doctor'
    }

    // Update the order
    let { data, error } = await supabaseClient
      .from('orders')
      .update(update)
      .eq('id', order_id)
      .select()

    // Before migration 20261111140000 runs there is no meet_link column: still ring.
    if (error && 'meet_link' in update && /meet_link/.test(error.message ?? '')) {
      console.error('orders.meet_link is missing; ringing without the link')
      delete update.meet_link
      ;({ data, error } = await supabaseClient.from('orders').update(update).eq('id', order_id).select())
    }

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
