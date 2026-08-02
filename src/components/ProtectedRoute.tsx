import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import RouteFallback from "./RouteFallback";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

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

      // Fail closed on a persistent error: a vendor/admin must never silently
      // land in the consumer app just because one request failed. We retry
      // twice first, and stay permissive only while the device is offline.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const roles = await fetchRoles();
          if (cancelled) return;
          const blocked = roles.some((r) => r === "vendor" || r === "admin");
          setIsAuthorized(!blocked);
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
      setIsAuthorized(offline);
      setRoleChecked(true);
    };

    // Depend on the stable user id, not the user object: Supabase hands back a
    // fresh object on every auth event, which would otherwise re-run this
    // effect (and reset roleChecked) on every token refresh.
    if (userId) setRoleChecked(false);
    checkRole();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading || (user && !roleChecked)) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthorized && location.pathname !== "/unauthorized") {
    return <Navigate to="/unauthorized" replace />;
  }

  // Require location check if not already saved in this device
  if (location.pathname !== "/location-check" && location.pathname !== "/unauthorized" && location.pathname !== "/") {
    const locationChecked = localStorage.getItem(`location_checked_${userId}`);
    if (locationChecked !== "true") {
      return <Navigate to="/location-check" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
