import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import RouteFallback from "./RouteFallback";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

// ── Module-level role cache ──────────────────────────────────────────
// Persists across component mounts within the same session so navigating
// back never re-shows RouteFallback.  Keyed by userId.
const roleCache = new Map<string, { authorized: boolean; checked: boolean }>();

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const location = useLocation();

  // Seed initial state from cache so re-mounts are instant
  const cached = userId ? roleCache.get(userId) : undefined;
  const [roleChecked, setRoleChecked] = useState(cached?.checked ?? false);
  const [isAuthorized, setIsAuthorized] = useState(cached?.authorized ?? true);
  // The role check kept failing while online. Not cached, so "Try again" re-checks.
  const [checkFailed, setCheckFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId as string);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    };

    const checkRole = async () => {
      if (!userId) {
        setRoleChecked(true);
        return;
      }

      // If we already have a cached result, render children immediately.
      // The background fetch below will silently refresh the cache.
      if (cached?.checked) {
        setRoleChecked(true);
        setIsAuthorized(cached.authorized);
      }

      // Fail closed on a persistent error: a vendor/admin must never silently
      // land in the consumer app just because one request failed. We retry
      // twice first, and stay permissive only while the device is offline.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const roles = await fetchRoles();
          if (cancelled) return;
          let isAuth = true;
          if (allowedRoles) {
            isAuth = roles.some((r) => allowedRoles.includes(r));
          } else {
            // Default behavior: block vendors/admins from customer routes
            const blocked = roles.some((r) => r === "vendor" || r === "admin");
            isAuth = !blocked;
          }
          // Update cache + state
          roleCache.set(userId, { authorized: isAuth, checked: true });
          setCheckFailed(false);
          setIsAuthorized(isAuth);
          setRoleChecked(true);
          return;
        } catch {
          if (cancelled) return;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        }
      }

      if (cancelled) return;
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      // A known answer from earlier this session still stands.
      if (cached?.checked) return;
      // Still fail closed, but as a retry screen: caching the failure used to leave
      // a customer on "Unauthorized" for the whole session after one bad network moment.
      // Offline stays permissive for the session, as before.
      if (offline) roleCache.set(userId, { authorized: true, checked: true });
      setIsAuthorized(offline);
      setCheckFailed(!offline);
      setRoleChecked(true);
    };

    // Only reset roleChecked if we have NO cached result for this user.
    // This prevents the flash of RouteFallback on back-navigation.
    if (userId && !cached?.checked) setRoleChecked(false);
    checkRole();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, retryCount]);

  if (loading || (user && !roleChecked)) {
    return <RouteFallback />;
  }

  // Guard against a redirect loop.
  const currentPath = location.pathname;

  if (!user) {
    if (currentPath === "/login") return null;
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (checkFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center space-y-3">
          <h1 className="text-lg font-semibold text-foreground">Couldn't check your account</h1>
          <p className="text-sm text-muted-foreground">Check your internet connection and try again.</p>
          <button
            type="button"
            onClick={() => {
              setCheckFailed(false);
              setRoleChecked(false);
              setRetryCount((n) => n + 1);
            }}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    if (currentPath === "/unauthorized") return null;
    return <Navigate to="/unauthorized" replace />;
  }

  // Require location check if not already saved in this device
  if (currentPath !== "/location-check" && currentPath !== "/unauthorized" && currentPath !== "/") {
    const locationChecked = localStorage.getItem(`location_checked_${userId}`);
    if (locationChecked !== "true") {
      return <Navigate to="/location-check" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
