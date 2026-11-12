import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
    if (!webhookSecret || token !== webhookSecret) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { order_id, call_status, order_status, meet_link } = await req.json()

    if (!order_id || !call_status) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // A booking the patient cancelled (or that is already finished) can't be rung or
    // changed: the doctor's portal is told so and drops it from the open list.
    const { data: current, error: readError } = await supabaseClient
      .from('orders')
      .select('status')
      .eq('id', order_id)
      .maybeSingle()
    if (readError) throw readError
    if (!current) return json({ error: 'Booking not found', code: 'order_not_found' }, 404)
    const currentStatus = String(current.status ?? '').toLowerCase()
    if (currentStatus === 'cancelled') {
      // Already cancelled: the doctor cancelling too changes nothing (the reason stays).
      if (order_status === 'cancelled') return json({ success: true, data: [] })
      return json({ error: 'The patient cancelled this booking.', code: 'order_cancelled' }, 409)
    }
    if (call_status === 'ringing' && ['completed', 'report_ready', 'report_delivered'].includes(currentStatus)) {
      return json({ error: 'This consultation is already completed.', code: 'order_completed' }, 409)
    }

    // The doctor finished or cancelled the consultation: the patient's booking shows it.
    // call_status_at lets the patient's app ring when it is opened a little late.
    const update: Record<string, unknown> = { call_status, call_status_at: new Date().toISOString() }
    // The Google Meet link the doctor opened: the patient joins from their booking.
    if (typeof meet_link === 'string' && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meet_link)) update.meet_link = meet_link
    if (order_status === 'completed') update.status = 'completed'
    if (order_status === 'cancelled') {
      update.status = 'cancelled'
      update.cancelled_at = new Date().toISOString()
      update.cancellation_reason = 'Cancelled by the doctor'
    }

    // Update the order. A column from a migration that hasn't run yet is left out
    // rather than failing the ring.
    let data, error
    for (let attempt = 0; attempt < 3; attempt++) {
      ;({ data, error } = await supabaseClient.from('orders').update(update).eq('id', order_id).select())
      const missing = ['call_status_at', 'meet_link'].find(
        (column) => error && column in update && new RegExp(column).test(error.message ?? ''),
      )
      if (!missing) break
      console.error(`orders.${missing} is missing; ringing without it`)
      delete update[missing]
    }

    if (error) throw error

    return json({ success: true, data })
  } catch (error) {
    return json({ error: error.message }, 500)
  }
})
