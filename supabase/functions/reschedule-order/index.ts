import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { COLLECTION_SLOTS, normalizeCollectionSlot, parseSlotCapacities } from "../_shared/slot-capacity.ts";
import {
  addDays, istToday, nextRescheduleDate, RESCHEDULE_DAYS_AHEAD, rescheduleSearchStart, rescheduleTargetProblem, type LabDays,
} from "../_shared/booking-window.ts";
import { fetchLabSchedule } from "../_shared/partner-schedule.ts";

const ALREADY_RESCHEDULED = "This booking has already been rescheduled once. You can still cancel it.";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.slice(7);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const scheduledDate = typeof body.scheduledDate === "string" ? body.scheduledDate.slice(0, 10) : "";
    const scheduledTimeSlot = typeof body.scheduledTimeSlot === "string" ? body.scheduledTimeSlot : "";
    const slot = normalizeCollectionSlot(scheduledTimeSlot);
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !slot) {
      return json({ error: "Invalid reschedule request" }, 400);
    }
    const targetProblem = rescheduleTargetProblem(scheduledDate, slot.normalized);
    if (targetProblem) return json({ error: targetProblem, code: "invalid_target" }, 400);

    const admin = createClient(url, service);
    const { data: order } = await admin.from("orders").select("vendor_id,status,scheduled_date,reschedule_count").eq("id", orderId).eq("user_id", userId).maybeSingle();
    if (!order?.vendor_id) return json({ error: "Order or Partner lab not found" }, 404);
    if (String(order.status).toLowerCase() === "cancelled") return json({ error: "Cancelled orders cannot be rescheduled" }, 409);
    // A booking moves once; the database refuses a second move too (under a row lock).
    if (Number(order.reschedule_count ?? 0) >= 1) {
      return json({ error: ALREADY_RESCHEDULED, code: "already_rescheduled" }, 409);
    }

    const unavailable = () => json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);
    const rows = await fetchLabSchedule(order.vendor_id);
    if (!rows) return unavailable();

    // Places left on each day from the day after the booking, so the one day the
    // booking may move to (the next open day with a free time) can be checked.
    const searchStart = rescheduleSearchStart(order.scheduled_date);
    const searchEnd = addDays(istToday(), RESCHEDULE_DAYS_AHEAD);
    const { data: booked, error: bookedError } = await admin
      .from("orders")
      .select("scheduled_date,scheduled_time_slot,status")
      .eq("vendor_id", order.vendor_id)
      .neq("id", orderId)
      .gte("scheduled_date", searchStart)
      .lte("scheduled_date", searchEnd);
    if (bookedError) return unavailable();
    const bookedCount: Record<string, number> = {};
    for (const other of booked ?? []) {
      if (String(other.status ?? "").toLowerCase() === "cancelled") continue;
      const otherSlot = normalizeCollectionSlot(other.scheduled_time_slot);
      if (otherSlot && other.scheduled_date) {
        const key = `${String(other.scheduled_date).slice(0, 10)}|${otherSlot.id}`;
        bookedCount[key] = (bookedCount[key] ?? 0) + 1;
      }
    }
    const capacitiesOn = (date: string) => {
      const row = rows.find((r) => r.day_of_week === new Date(`${date}T12:00:00+05:30`).getUTCDay());
      return row?.is_open === true ? parseSlotCapacities(row.slot_capacities) : null;
    };
    const labDays: LabDays = {};
    for (let date = searchStart; date <= searchEnd; date = addDays(date, 1)) {
      const capacities = capacitiesOn(date);
      if (!capacities) continue;
      labDays[date] = COLLECTION_SLOTS.map((s) => ({
        normalized: s.normalized,
        remaining: Math.max(0, (capacities[s.id] ?? 0) - (bookedCount[`${date}|${s.id}`] ?? 0)),
      }));
    }
    const nextDay = nextRescheduleDate(order.scheduled_date, labDays);
    if (!nextDay) {
      return json({ error: "The lab has no free collection times on its next open days. Please contact support.", code: "no_open_day" }, 409);
    }
    if (scheduledDate !== nextDay) {
      const label = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
        .format(new Date(`${nextDay}T00:00:00Z`));
      return json({ error: `This booking can only move to ${label}, the next day the lab has free times.`, code: "not_next_open_day", next_date: nextDay }, 409);
    }
    const capacity = capacitiesOn(scheduledDate)?.[slot.id] ?? 0;

    const { data, error } = await admin.rpc("reschedule_order_with_slot_capacity", {
      _order_id: orderId,
      _user_id: userId,
      _scheduled_date: scheduledDate,
      _scheduled_time_slot: scheduledTimeSlot,
      _slot_capacity: capacity,
    }).single();
    if (error) {
      if (error.details === "slot_capacity_reached" || error.message?.includes("fully booked")) {
        return json({ error: "This collection slot has just filled up. Please choose another time.", code: "slot_capacity_reached" }, 409);
      }
      // Stage rules from the database, e.g. a collection partner is already assigned.
      if (error.code === "22023") return json({ error: error.message, code: error.details || "not_changeable" }, 409);
      console.error("Reschedule error:", error);
      return json({ error: "Could not reschedule this order" }, 500);
    }
    return json({ order: data });
  } catch (error) {
    console.error("Unexpected reschedule error:", error);
    return json({ error: "Slot availability is temporarily unavailable. Please try again.", code: "capacity_unavailable" }, 503);
  }
});
