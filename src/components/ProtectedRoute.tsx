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
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkRole = async () => {
      if (!user) {
        setRoleChecked(true);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (cancelled) return;

        if (error) {
          setIsAuthorized(true);
        } else {
          const roles = (data ?? []).map((r) => r.role);
          const blocked = roles.some((r) => r === "vendor" || r === "admin");
          setIsAuthorized(!blocked);
        }
      } catch {
        if (!cancelled) setIsAuthorized(true);
      } finally {
        if (!cancelled) setRoleChecked(true);
      }
    };
    setRoleChecked(false);
    checkRole();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    const locationChecked = localStorage.getItem(`location_checked_${user.id}`);
    if (locationChecked !== "true") {
      return <Navigate to="/location-check" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
