import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * One live channel per signed-in user, shared by every screen that wants to hear
 * about that user's orders.
 *
 * Each `postgres_changes` subscription is checked by Supabase Realtime on every
 * matching row change, and every channel is a separate join on the socket. The app
 * opened a separate one on `orders` for the same user in notifications, the order
 * list, My Orders, Reports and tracking. Now those share one subscription and the
 * changes fan out in-app. (The doctor-call listeners keep their own channels.)
 */

export type RowChange = RealtimePostgresChangesPayload<Record<string, any>>;
export type LiveTable = "orders";
type Listener = (change: RowChange) => void;

interface Registration {
  table: LiveTable;
  userId: string;
}

const registrations = new Map<Listener, Registration>();
let channel: RealtimeChannel | null = null;
let channelUserId: string | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

const emit = (table: LiveTable) => (change: RowChange) => {
  for (const [listener, reg] of [...registrations]) {
    if (reg.table !== table || reg.userId !== channelUserId) continue;
    try {
      listener(change);
    } catch (error) {
      console.error(`[userLive] ${table} listener failed`, error);
    }
  }
};

const close = () => {
  const old = channel;
  channel = null;
  channelUserId = null;
  if (!old) return;
  try {
    supabase.removeChannel(old);
  } catch (error) {
    console.warn("[userLive] could not remove channel", error);
  }
};

const open = (userId: string) => {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (channel && channelUserId === userId) return;
  close();
  channelUserId = userId;
  try {
    const next = supabase.channel(`user-live-${userId}`);
    next.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
      emit("orders"),
    );
    next.subscribe();
    channel = next;
  } catch (error) {
    // Live updates are a nicety: screens still load and refetch without them.
    console.warn("[userLive] could not open live channel", error);
    channel = null;
  }
};

/**
 * Hear about changes to the user's own rows in `table`. Returns an unsubscribe
 * function. Delivers INSERT, UPDATE and DELETE (check `change.eventType`).
 */
export function subscribeUserLive(table: LiveTable, userId: string, listener: Listener): () => void {
  registrations.set(listener, { table, userId });
  open(userId);

  return () => {
    registrations.delete(listener);
    if (registrations.size > 0) return;
    // Wait a tick: a screen re-subscribing on re-render shouldn't drop and re-join.
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (registrations.size === 0) close();
    }, 0);
  };
}
