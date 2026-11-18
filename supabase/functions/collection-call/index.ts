import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2.110.0/cors";
import { cleanCollectionDetails, isLinkToken, linkState } from "../_shared/collection-link.ts";
import {
  RING_SECONDS,
  callStartProblem,
  canMove,
  iceServers,
  isLive,
  newRoom,
  type CallStatus,
} from "../_shared/collection-call.ts";

/**
 * The collection partner's page and the call from it to the patient's app.
 *
 * Partner (no account, holds the link): { action: "view" | "start" | "status" | "end", token, callId? }
 * Patient (signed in to BloodLyn):      { action: "answer" | "decline" | "hangup", callId }
 *
 * Nobody ever receives the other side's phone number. The voice itself goes between
 * the two phones (WebRTC); this function only rings, answers and ends.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    if (action === "answer" || action === "decline" || action === "hangup") {
      const jwt = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!jwt) return json({ error: "Unauthorized" }, 401);
      const { data: auth } = await createClient(url, anon).auth.getUser(jwt);
      if (!auth?.user) return json({ error: "Unauthorized" }, 401);
      if (!UUID.test(callId)) return json({ error: "callId is required" }, 400);

      const { data: call } = await admin.from("collection_calls").select("*").eq("id", callId).maybeSingle();
      if (!call || call.user_id !== auth.user.id) return json({ error: "Call not found" }, 404);

      if (action === "answer") {
        if (call.status !== "ringing" || !isLive(call, now)) return json({ error: "This call has ended.", status: call.status }, 409);
        const { error } = await admin
          .from("collection_calls")
          .update({ status: "accepted", answered_at: now.toISOString() })
          .eq("id", callId)
          .eq("status", "ringing");
        if (error) throw error;
        return json({ room: call.room, iceServers: ice });
      }
      const to: CallStatus = action === "decline" ? "declined" : body?.failed === true ? "failed" : "ended";
      if (canMove(call.status, to)) {
        await admin.from("collection_calls").update({ status: to, ended_at: now.toISOString() }).eq("id", callId).eq("status", call.status);
      }
      return json({ status: canMove(call.status, to) ? to : call.status });
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
      return json({ state, details, ring_seconds: RING_SECONDS });
    }

    if (action === "start") {
      if (state !== "active" || !order?.user_id) return json({ error: "This link has stopped working.", state }, 409);
      const { data: recent } = await admin
        .from("collection_calls")
        .select("id, status, created_at, answered_at")
        .eq("link_id", link.id)
        .gte("created_at", new Date(now.getTime() - 3_600_000).toISOString())
        .order("created_at", { ascending: false });
      // Rings nobody answered are tidied up as missed before counting.
      for (const c of recent ?? []) {
        if (c.status === "ringing" && !isLive(c, now)) {
          await admin.from("collection_calls").update({ status: "missed", ended_at: now.toISOString() }).eq("id", c.id).eq("status", "ringing");
          c.status = "missed";
        }
      }
      const problem = callStartProblem(recent ?? [], now);
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
        })
        .select("id")
        .single();
      if (error) throw error;
      return json({ callId: call.id, room, iceServers: ice, ring_seconds: RING_SECONDS });
    }

    if (action === "status" || action === "end") {
      if (!UUID.test(callId)) return json({ error: "callId is required" }, 400);
      const { data: call } = await admin.from("collection_calls").select("id, link_id, status, created_at, answered_at").eq("id", callId).maybeSingle();
      if (!call || call.link_id !== link.id) return json({ error: "Call not found" }, 404);

      let status = call.status as string;
      if (status === "ringing" && !isLive(call, now)) status = "missed";
      if (action === "end") {
        // Ended before the patient answered: a missed call. Otherwise ended (or failed).
        status = call.status === "ringing" ? "missed" : body?.failed === true ? "failed" : "ended";
      }
      if (status !== call.status && canMove(call.status, status as CallStatus)) {
        await admin.from("collection_calls").update({ status, ended_at: now.toISOString() }).eq("id", callId).eq("status", call.status);
      }
      return json({ status });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("collection-call error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
