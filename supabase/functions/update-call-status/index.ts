import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  RING_SECONDS,
  alertUser,
  doctorCallAlert,
  doctorCancelledAlert,
  doctorMissedAlert,
  parseServiceAccount,
  sameMoment,
  wait,
  type PushResult,
} from '../_shared/push-alerts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** Work that may finish after the response (the missed-call alert), without making anyone wait. */
function inBackground(task: Promise<unknown>) {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
  const safe = task.catch((err) => console.error('background task failed:', err))
  if (runtime) runtime.waitUntil(safe)
  return safe
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
    if (!webhookSecret || token !== webhookSecret) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { order_id, call_status, order_status, meet_link, reason } = await req.json()

    if (!order_id || !call_status) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // A booking the patient cancelled (or that is already finished) can't be rung or
    // changed: the doctor's portal is told so and drops it from the open list.
    const { data: current, error: readError } = await supabaseClient
      .from('orders')
      .select('status, user_id')
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
    const ringAt = new Date().toISOString()
    const update: Record<string, unknown> = { call_status, call_status_at: ringAt }
    // The Google Meet link the doctor opened: the patient joins from their booking.
    if (typeof meet_link === 'string' && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meet_link)) update.meet_link = meet_link
    // The doctor ended the call or closed the consultation: the link is removed so the
    // patient can't rejoin the call from the app.
    if (['ended', 'completed', 'cancelled'].includes(call_status) || order_status === 'completed' || order_status === 'cancelled') {
      update.meet_link = null
    }
    if (order_status === 'completed') update.status = 'completed'
    if (order_status === 'cancelled') {
      update.status = 'cancelled'
      update.cancelled_at = new Date().toISOString()
      // "Cancelled by the doctor: <their reason>", which the patient's appointment shows.
      const said = typeof reason === 'string' ? reason.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
      update.cancellation_reason = said ? `Cancelled by the doctor: ${said}` : 'Cancelled by the doctor'
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

    // The patient's phone rings even when BloodLyn is closed. The doctor's portal is told
    // whether the alert went out, so they know to phone a patient whose phone can't ring.
    // The ring itself is saved already, so an alert that fails never fails the ring.
    let alert: PushResult | undefined
    const account = parseServiceAccount(Deno.env.get('FCM_SERVICE_ACCOUNT'))
    const userId = current.user_id as string | null
    const noAlert = (err: unknown) => {
      console.error('Phone alert failed:', err)
      return undefined
    }
    if (call_status === 'ringing') {
      alert = await alertUser(supabaseClient, userId, doctorCallAlert(order_id), account).catch(noAlert)
      // Nobody answered by the end of the ring: the ringing alert becomes "Missed call".
      // A newer ring, an answer or a decline in the meantime leaves it alone.
      if (alert && alert.sent > 0) {
        const rungAt = 'call_status_at' in update ? ringAt : null
        inBackground(
          (async () => {
            await wait((RING_SECONDS + 3) * 1000)
            const { data: now } = await supabaseClient
              .from('orders')
              .select('call_status, call_status_at')
              .eq('id', order_id)
              .maybeSingle()
            if (now?.call_status !== 'ringing') return
            if (rungAt && !sameMoment(now.call_status_at, rungAt)) return
            await alertUser(supabaseClient, userId, doctorMissedAlert(order_id), account)
          })(),
        )
      }
    } else if (order_status === 'cancelled') {
      alert = await alertUser(supabaseClient, userId, doctorCancelledAlert(order_id), account).catch(noAlert)
    }

    return json({ success: true, data, ...(alert ? { alert } : {}) })
  } catch (error) {
    return json({ error: error.message }, 500)
  }
})
