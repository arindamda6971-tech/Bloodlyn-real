import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.110.0/cors";
import { CLOSED_ORDER_STATUSES, cleanCollectionDetails, isLinkToken, linkState } from "../_shared/collection-link.ts";
import {
  RING_SECONDS,
  callStartProblem,
  canMove,
  iceServers,
  isLive,
  newRoom,
  partnerCallProblem,
  shouldAlertLab,
  type CallStatus,
} from "../_shared/collection-call.ts";
import { checkCode, isCodeShape, slotHasEnded } from "../_shared/collection-code.ts";
import { PAYMENT_PAID, collectionConfirmationPays, isConsultationName, isVitalsOnlyName } from "../_shared/payment-status.ts";
import { alertUser, collectionCallAlert, collectionMissedAlert, parseServiceAccount, wait } from "../_shared/push-alerts.ts";

/**
 * In-app calls between a collection partner and a patient, both ways. Nobody ever
 * receives the other side's phone number: the voice goes between the two phones
 * (WebRTC), and this function only rings, answers and ends.
 *
 * Partner → patient (the partner holds the link; the patient's app rings):
 *   partner: { action: "view" | "start" | "status" | "end", token, callId? }
 *   patient: { action: "answer" | "decline" | "hangup", callId }   (signed in)
 *
 * Patient → partner (rings in the BloodLyn Partner app and as an alert on his phone):
 *   patient: { action: "call_partner", orderId } → { callId, room, iceServers, partner_name }
 *            { action: "call_status" | "hangup", callId }
 *   partner: "view" also returns `incoming`; { action: "partner_answer" | "partner_decline", token, callId }
 *            and "status" / "end" as above.
 * A call the partner doesn't take is a missed call on his phone; the second in an hour
 * also goes to the lab. The Partner project does the alerts (partner-notify).
 *
 * Collected: { action: "confirm_collected", token, code } — the partner enters the
 * patient's 4-digit collection code (_shared/collection-code.ts), which marks the
 * booking collected in place of the patient's "Yes".
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOUR_MS = 3_600_000;

/** The Partner project, which knows the partner's phones and his lab (server to server). */
async function partnerNotify(body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const secret = Deno.env.get("PARTNER_WEBHOOK_SECRET");
  if (!secret) return { status: 503, data: null };
  const url = Deno.env.get("PARTNER_NOTIFY_URL") || "https://wkhwuzsiehrcvlxfeytf.supabase.co/functions/v1/partner-notify";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  } catch (err) {
    console.error("partner-notify unreachable:", err instanceof Error ? err.message : err);
    return { status: 0, data: null };
  }
}

/** Work that may finish after the response (alerts), without making anyone wait. */
function inBackground(task: Promise<unknown>) {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  const safe = task.catch((err) => console.error("background task failed:", err));
  if (runtime) runtime.waitUntil(safe);
  return safe;
}

/** The partner's call rings the patient's phone; still ringing at the end, it's a missed call. */
async function ringPatientPhone(admin: SupabaseClient, userId: string, orderId: string, callId: string) {
  const account = parseServiceAccount(Deno.env.get("FCM_SERVICE_ACCOUNT"));
  const rang = await alertUser(admin, userId, collectionCallAlert(orderId), account);
  if (rang.sent === 0) return;
  await wait((RING_SECONDS + 3) * 1000);
  const { data: call } = await admin.from("collection_calls").select("status, answered_at").eq("id", callId).maybeSingle();
  // Answered, declined or ended in the meantime: the alert stays as it is.
  if (!call || call.answered_at || !["ringing", "missed"].includes(String(call.status))) return;
  await alertUser(admin, userId, collectionMissedAlert(orderId), account);
}

/** A Realtime message to the partner's open app or page ("a patient is calling"). */
async function broadcast(admin: SupabaseClient, topic: string, event: string, payload: Record<string, unknown>) {
  const channel = admin.channel(topic);
  try {
    await channel.send({ type: "broadcast", event, payload });
  } finally {
    await admin.removeChannel(channel);
  }
}

interface CallRow {
  id: string;
  order_id: string;
  direction: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
}

/**
 * A patient's call the partner didn't take: a missed-call alert on his phone (unless he
 * declined it himself), and the lab hears on the second in an hour.
 */
async function afterPartnerMissed(admin: SupabaseClient, orderId: string, now: Date, tellPartner: boolean) {
  const { count } = await admin
    .from("collection_calls")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("direction", "to_partner")
    .in("status", ["missed", "declined"])
    .gte("created_at", new Date(now.getTime() - HOUR_MS).toISOString());
  const alertLab = shouldAlertLab(count ?? 0);
  if (!tellPartner && !alertLab) return;
  await partnerNotify({ action: "missed", order_id: orderId, alert_lab: alertLab });
}

/** Rings nobody answered still read "ringing": settle them as missed. */
async function settleRungOut(admin: SupabaseClient, calls: CallRow[], now: Date) {
  for (const c of calls) {
    if (c.status === "ringing" && !isLive(c, now)) {
      const { data } = await admin
        .from("collection_calls")
        .update({ status: "missed", ended_at: now.toISOString() })
        .eq("id", c.id)
        .eq("status", "ringing")
        .select("id");
      c.status = "missed";
      if (data?.length && c.direction === "to_partner") inBackground(afterPartnerMissed(admin, c.order_id, now, true));
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !key) return json({ error: "Calling is temporarily unavailable" }, 503);
  const admin = createClient(url, key);
  const ice = iceServers((name) => Deno.env.get(name));

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action ?? "");
    const callId = String(body?.callId ?? "");
    const now = new Date();

    // ── The patient, in the BloodLyn app ──────────────────────────────────────
    if (["answer", "decline", "hangup", "call_partner", "call_status"].includes(action)) {
      const jwt = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!jwt) return json({ error: "Unauthorized" }, 401);
      const { data: auth } = await createClient(url, anon).auth.getUser(jwt);
      if (!auth?.user) return json({ error: "Unauthorized" }, 401);
      const userId = auth.user.id;

      // Calling the collection partner.
      if (action === "call_partner") {
        const orderId = String(body?.orderId ?? "");
        if (!UUID.test(orderId)) return json({ error: "orderId is required" }, 400);
        const { data: order } = await admin
          .from("orders")
          .select("id, user_id, status, is_escalated, delivery_partner_name")
          .eq("id", orderId)
          .maybeSingle();
        if (!order || order.user_id !== userId) return json({ error: "Order not found" }, 404);
        if (order.is_escalated || CLOSED_ORDER_STATUSES.includes(String(order.status ?? "").toLowerCase()) || !order.delivery_partner_name) {
          return json({ error: "There's no collection partner to call for this booking now." }, 409);
        }

        const { data: recent } = await admin
          .from("collection_calls")
          .select("id, order_id, direction, status, created_at, answered_at")
          .eq("order_id", orderId)
          .gte("created_at", new Date(now.getTime() - HOUR_MS).toISOString())
          .order("created_at", { ascending: false });
        const calls = (recent ?? []) as CallRow[];
        await settleRungOut(admin, calls, now);
        const problem = partnerCallProblem(calls, now);
        if (problem) return json({ error: problem }, 429);

        // The Partner project finds the partner, makes sure he has the order's call link,
        // and puts "patient calling" on his phone.
        const ring = await partnerNotify({ action: "ring", order_id: orderId });
        const token = ring.data?.token;
        if (ring.status !== 200 || !isLinkToken(token)) {
          if (ring.status === 404) {
            // He can't take app calls (no BloodLyn Partner app): the lab helps instead.
            inBackground(partnerNotify({ action: "missed", order_id: orderId, alert_lab: true, reason: "unavailable" }));
            return json({ error: "unavailable", partner_name: order.delivery_partner_name }, 409);
          }
          return json({ error: "Couldn't reach your collection partner. Please try again." }, 502);
        }
        const { data: link } = await admin.from("collection_links").select("id, details").eq("token", token).maybeSingle();
        if (!link) return json({ error: "Couldn't reach your collection partner. Please try again." }, 502);
        const details = cleanCollectionDetails(link.details);

        const room = newRoom();
        const { data: call, error } = await admin
          .from("collection_calls")
          .insert({
            link_id: link.id,
            order_id: orderId,
            user_id: userId,
            room,
            caller_name: details.patient_name || "Patient",
            lab_name: details.lab_name || null,
            direction: "to_partner",
          })
          .select("id, created_at")
          .single();
        if (error) throw error;
        // His app or page, if it's open, rings straight away.
        inBackground(broadcast(admin, `collection-ring-${token}`, "ring", { callId: call.id, caller_name: details.patient_name, created_at: call.created_at }));
        return json({
          callId: call.id,
          room,
          iceServers: ice,
          ring_seconds: RING_SECONDS,
          partner_name: String(ring.data?.partner_name || order.delivery_partner_name),
        });
      }

      if (!UUID.test(callId)) return json({ error: "callId is required" }, 400);
      const { data: call } = await admin.from("collection_calls").select("*").eq("id", callId).maybeSingle();
      if (!call || call.user_id !== userId) return json({ error: "Call not found" }, 404);
      const toPartner = call.direction === "to_partner";

      if (action === "call_status") {
        if (call.status === "ringing" && !isLive(call, now)) {
          await settleRungOut(admin, [call as CallRow], now);
          return json({ status: "missed" });
        }
        return json({ status: call.status });
      }

      if (action === "answer") {
        if (toPartner) return json({ error: "This is your own call." }, 409);
        if (call.status !== "ringing" || !isLive(call, now)) return json({ error: "This call has ended.", status: call.status }, 409);
        const { error } = await admin
          .from("collection_calls")
          .update({ status: "accepted", answered_at: now.toISOString() })
          .eq("id", callId)
          .eq("status", "ringing");
        if (error) throw error;
        return json({ room: call.room, iceServers: ice });
      }

      if (action === "decline" && toPartner) return json({ error: "This is your own call." }, 409);
      // The patient giving up on their own call before he answers: a missed call for him.
      const to: CallStatus =
        action === "decline" ? "declined" : toPartner && call.status === "ringing" ? "missed" : body?.failed === true ? "failed" : "ended";
      let moved = false;
      if (canMove(call.status, to)) {
        const { data } = await admin
          .from("collection_calls")
          .update({ status: to, ended_at: now.toISOString() })
          .eq("id", callId)
          .eq("status", call.status)
          .select("id");
        moved = !!data?.length;
      }
      if (moved && toPartner && to === "missed") inBackground(afterPartnerMissed(admin, call.order_id, now, true));
      return json({ status: moved ? to : call.status });
    }

    // ── The collection partner, holding the link ──────────────────────────────
    const token = body?.token;
    if (!isLinkToken(token)) return json({ error: "This link isn't valid." }, 404);
    const { data: link } = await admin
      .from("collection_links")
      .select("id, order_id, partner_name, details, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();
    if (!link) return json({ error: "This link isn't valid." }, 404);
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, status, is_escalated")
      .eq("id", link.order_id)
      .maybeSingle();
    const state = linkState(link, order, now);
    const details = cleanCollectionDetails(link.details);

    if (action === "view") {
      // A link that's done its job shows only who to contact, not the patient's details.
      if (state !== "active") return json({ state, lab_name: details.lab_name, lab_phone: details.lab_phone });
      // A patient calling him right now.
      const { data: ringing } = await admin
        .from("collection_calls")
        .select("id, status, created_at, caller_name")
        .eq("order_id", link.order_id)
        .eq("direction", "to_partner")
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(1);
      const live = ringing?.[0] && isLive(ringing[0], now) ? ringing[0] : null;
      return json({
        state,
        details,
        ring_seconds: RING_SECONDS,
        incoming: live ? { callId: live.id, created_at: live.created_at, caller_name: live.caller_name } : null,
      });
    }

    if (action === "start") {
      if (state !== "active" || !order?.user_id) return json({ error: "This link has stopped working.", state }, 409);
      const { data: recent } = await admin
        .from("collection_calls")
        .select("id, order_id, direction, status, created_at, answered_at")
        .eq("order_id", link.order_id)
        .gte("created_at", new Date(now.getTime() - HOUR_MS).toISOString())
        .order("created_at", { ascending: false });
      const calls = (recent ?? []) as CallRow[];
      await settleRungOut(admin, calls, now);
      // Any live call blocks a new one; the hourly limit counts only his own calls.
      const problem = calls.some((c) => isLive(c, now))
        ? "A call with this patient is already going on."
        : callStartProblem(calls.filter((c) => c.direction !== "to_partner"), now);
      if (problem) return json({ error: problem }, 429);

      const room = newRoom();
      const { data: call, error } = await admin
        .from("collection_calls")
        .insert({
          link_id: link.id,
          order_id: link.order_id,
          user_id: order.user_id,
          room,
          caller_name: details.partner_name || link.partner_name || "Collection partner",
          lab_name: details.lab_name || null,
          direction: "to_patient",
        })
        .select("id")
        .single();
      if (error) throw error;
      // The patient's phone rings even with BloodLyn closed; unanswered, it becomes a
      // missed call they can return from the app.
      inBackground(ringPatientPhone(admin, order.user_id, link.order_id, call.id));
      return json({ callId: call.id, room, iceServers: ice, ring_seconds: RING_SECONDS });
    }

    // The partner has collected the sample: the patient's code proves he was there.
    if (action === "confirm_collected") {
      const code = String(body?.code ?? "").trim();
      if (!isCodeShape(code)) return json({ error: "Enter the patient's 4-digit code." }, 400);
      if (state !== "active") return json({ error: "This collection is already closed." }, 409);
      const { data: full } = await admin
        .from("orders")
        .select("id, status, payment_status, test_name, scheduled_date, scheduled_time_slot")
        .eq("id", link.order_id)
        .maybeSingle();
      if (!full) return json({ error: "Order not found" }, 404);
      if (isVitalsOnlyName(full.test_name) || isConsultationName(full.test_name)) {
        return json({ error: "This booking has no sample to collect." }, 409);
      }
      const { data: row } = await admin
        .from("collection_codes")
        .select("code, used_at, failed_attempts, locked_until")
        .eq("order_id", link.order_id)
        .maybeSingle();
      if (!row) return json({ error: "This booking has no code yet. Please ask the lab." }, 409);
      const check = checkCode(row, code, now);
      if (!check.ok) {
        if (check.save) await admin.from("collection_codes").update(check.save).eq("order_id", link.order_id).is("used_at", null);
        return json({ error: check.error }, check.status);
      }

      const late = slotHasEnded(full.scheduled_date, full.scheduled_time_slot, now);
      // Only the first right code counts, even if two arrive at once.
      const { data: used } = await admin
        .from("collection_codes")
        .update({ used_at: now.toISOString(), used_late: late, failed_attempts: 0, locked_until: null })
        .eq("order_id", link.order_id)
        .is("used_at", null)
        .select("order_id");
      if (!used?.length) return json({ error: "This collection is already confirmed." }, 409);
      // Same as the patient's "Yes" used to do (confirm-collection): collected, and in the
      // testing phase that's also the payment for a blood test.
      const update: Record<string, unknown> = { status: "sample_collected", updated_at: now.toISOString() };
      if (collectionConfirmationPays(full)) update.payment_status = PAYMENT_PAID;
      const { error: updateError } = await admin.from("orders").update(update).eq("id", link.order_id);
      if (updateError) {
        console.error("collected update failed", updateError);
        // Let him try again: the code isn't spent until the order is marked.
        await admin.from("collection_codes").update({ used_at: null, used_late: null }).eq("order_id", link.order_id);
        return json({ error: "Couldn't mark it collected. Please try again." }, 500);
      }
      return json({ ok: true, status: "sample_collected", late });
    }

    if (!["status", "end", "partner_answer", "partner_decline"].includes(action)) return json({ error: "Unknown action" }, 400);
    if (!UUID.test(callId)) return json({ error: "callId is required" }, 400);
    const { data: call } = await admin
      .from("collection_calls")
      .select("id, order_id, room, direction, status, created_at, answered_at")
      .eq("id", callId)
      .maybeSingle();
    // Any of his working links for the order will do.
    if (!call || call.order_id !== link.order_id) return json({ error: "Call not found" }, 404);
    const toPartner = call.direction === "to_partner";

    if (action === "partner_answer") {
      if (!toPartner || state !== "active") return json({ error: "This call has ended." }, 409);
      if (call.status !== "ringing" || !isLive(call, now)) return json({ error: "The patient has hung up.", status: call.status }, 409);
      const { data: moved, error } = await admin
        .from("collection_calls")
        .update({ status: "accepted", answered_at: now.toISOString() })
        .eq("id", callId)
        .eq("status", "ringing")
        .select("id");
      if (error) throw error;
      if (!moved?.length) return json({ error: "The patient has hung up." }, 409);
      return json({ room: call.room, iceServers: ice });
    }

    let status = call.status as string;
    if (status === "ringing" && !isLive(call, now)) status = "missed";
    if (action === "end" || action === "partner_decline") {
      // Before it's answered: his own call was missed by the patient; a patient's call he declined.
      status = call.status === "ringing" ? (toPartner ? "declined" : "missed") : body?.failed === true ? "failed" : "ended";
    }
    if (status !== call.status && canMove(call.status, status as CallStatus)) {
      const { data: moved } = await admin
        .from("collection_calls")
        .update({ status, ended_at: now.toISOString() })
        .eq("id", callId)
        .eq("status", call.status)
        .select("id");
      // A patient's call he let ring out or turned down counts towards telling the lab.
      if (moved?.length && toPartner && (status === "missed" || status === "declined")) {
        inBackground(afterPartnerMissed(admin, call.order_id, now, status === "missed"));
      }
    }
    return json({ status });
  } catch (err) {
    console.error("collection-call error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
