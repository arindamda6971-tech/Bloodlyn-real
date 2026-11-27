import { supabase } from "@/integrations/supabase/client";

/**
 * Tells us when something breaks in someone's browser.
 *
 * Without this, a patient hits an error and we only find out if they telephone. Errors go
 * into the `client_errors` table in our own Supabase and are read in its dashboard.
 *
 * Deliberately cheap and deliberately quiet:
 *  - at most MAX_PER_VISIT errors per page visit, so an error inside a render loop
 *    can't write thousands of rows (the one way this could ever cost anything);
 *  - the same message is sent once per visit;
 *  - the message and stack are trimmed, and only the path is sent, never the query
 *    string, which can carry a patient's name or id;
 *  - it never throws and never blocks: if reporting fails, the app carries on.
 *
 * When a hosted service is wanted later, `send` is the only function to change.
 */

const MAX_PER_VISIT = 8;
const MAX_MESSAGE = 500;
const MAX_STACK = 2000;

/** Which app this is, for the `app` column. */
const APP = "patient-app";

let sent = 0;
const alreadySent = new Set<string>();

const trim = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** The page, without the query string: `/lab/orders`, never `?patient=Rahul+Das`. */
const pathOnly = () => {
  try {
    return window.location.pathname.slice(0, 200);
  } catch {
    return "";
  }
};

/** The build, when the bundler was told about it. */
const release = () => {
  try {
    return (import.meta.env?.VITE_RELEASE as string | undefined) ?? null;
  } catch {
    return null;
  }
};

interface ErrorRow {
  app: string;
  user_id: string | null;
  path: string;
  message: string;
  stack: string | null;
  user_agent: string;
  release: string | null;
}

/**
 * `client_errors` is write-only and isn't in the generated database types, so the
 * client is narrowed here by hand rather than silenced with `any`.
 */
const errorsTable = () =>
  (supabase as unknown as { from: (table: string) => { insert: (row: ErrorRow) => PromiseLike<unknown> } }).from("client_errors");

async function send(message: string, stack: string | null) {
  const { data: auth } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  await errorsTable().insert({
    app: APP,
    user_id: auth?.user?.id ?? null,
    path: pathOnly(),
    message,
    stack,
    user_agent: trim(navigator.userAgent, 300),
    release: release(),
  });
}

/**
 * Report one error. Safe to call from anywhere, including inside a `catch`:
 * it resolves whatever happens.
 */
export async function reportError(error: unknown, context?: string): Promise<void> {
  try {
    // A phone with no signal isn't a bug, and the report couldn't be sent anyway.
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (sent >= MAX_PER_VISIT) return;
    const raw = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const message = trim(context ? `${context}: ${raw}` : raw, MAX_MESSAGE);
    if (!message || alreadySent.has(message)) return;
    alreadySent.add(message);
    sent += 1;
    await send(message, error instanceof Error && error.stack ? trim(error.stack, MAX_STACK) : null);
  } catch {
    // Reporting a failure must never cause one.
  }
}

/** A React Query key's name and never its ids: `["orders", userId]` → `orders`. */
const keyName = (key: unknown) => (Array.isArray(key) && typeof key[0] === "string" ? key[0].slice(0, 60) : "");

/** For `QueryCache({ onError })`: a read that still failed after its retries. */
export function reportQueryError(error: unknown, query: { queryKey: unknown }): Promise<void> {
  const name = keyName(query.queryKey);
  return reportError(error, name ? `Load failed (${name})` : "Load failed");
}

/**
 * For `MutationCache({ onError })`: a save that failed. It is named by the mutation's
 * `meta.reportAs` or its key, and an order's new status is added (`→ cancelled`). Nothing
 * else from the variables is sent: they can hold a patient's name or phone number.
 */
export function reportMutationError(
  error: unknown,
  variables: unknown,
  mutation: { options: { mutationKey?: unknown; meta?: Record<string, unknown> } },
): Promise<void> {
  const reportAs = mutation.options.meta?.reportAs;
  const label = typeof reportAs === "string" ? reportAs : keyName(mutation.options.mutationKey);
  const rawStatus = variables && typeof variables === "object" ? (variables as { status?: unknown }).status : undefined;
  const status = typeof rawStatus === "string" && /^[a-z_]{1,40}$/.test(rawStatus) ? rawStatus : "";
  const what = [label, status && `→ ${status}`].filter(Boolean).join(" ");
  return reportError(error, what ? `Save failed (${what})` : "Save failed");
}

/**
 * Catch what nobody caught: errors thrown outside React, and promises that were
 * rejected with no `.catch`. Call once, as the app starts.
 */
export function installErrorReporting(): void {
  window.addEventListener("error", (event) => {
    // A failed image or script fires this too, with no error object; it isn't a crash.
    if (!event.error) return;
    void reportError(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    void reportError(event.reason, "Unhandled promise");
  });
}
