import type { NavigateFunction } from "react-router-dom";

/**
 * Leave a form after saving by going back to the page that opened it, so the
 * Back button doesn't reopen the form. Opened directly (nothing to go back to),
 * it goes to `fallback` instead.
 */
export const goBackOr = (navigate: NavigateFunction, fallback: string) => {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate(fallback, { replace: true });
};
