import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const UnauthorizedScreen = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center max-w-[430px] mx-auto px-6">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            This account is not authorized to use the BloodLyn customer app. Vendor and admin
            accounts must use the partner or admin portal.
          </p>
        </div>
        <Button onClick={handleSignOut} className="w-full">
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default UnauthorizedScreen;
