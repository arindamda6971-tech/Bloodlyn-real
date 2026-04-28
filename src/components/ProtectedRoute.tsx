import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
          // Fail-open for the customer app: missing role row = default 'user'
          setIsAuthorized(true);
        } else {
          const roles = (data ?? []).map((r) => r.role);
          // Customer app: block vendor / admin accounts
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-[430px] mx-auto">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthorized && location.pathname !== "/unauthorized") {
    return <Navigate to="/unauthorized" replace />;
  }

  // Always require location check on every login session
  if (location.pathname !== "/location-check" && location.pathname !== "/unauthorized") {
    const locationChecked = sessionStorage.getItem(`location_checked_${user.id}`);
    if (locationChecked !== "true") {
      return <Navigate to="/location-check" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
