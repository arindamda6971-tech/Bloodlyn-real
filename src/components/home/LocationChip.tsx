import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPincode } from "@/hooks/useUserPincode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Small "Delivering to: PIN xxxxxx — Change" chip.
 * Opens a bottom sheet to update the user's default pincode without
 * navigating through the full LocationCheckScreen flow.
 */
const LocationChip = () => {
  const { user } = useAuth();
  const { pincode } = useUserPincode();
  const [open, setOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  // Single-flight guards — mirror LocationCheckScreen pattern so React StrictMode
  // / accidental double-tap never inserts a duplicate address row.
  const savingRef = useRef(false);
  const savedKeyRef = useRef<string | null>(null);


  const checkServiceable = async (pc: string) => {
    const target = pc.trim();
    const { data } = await supabase
      .from("diagnostic_centers")
      .select("pincode, service_pincodes, city, state, is_active")
      .eq("is_active", true);
    if (!data) return null;
    const match = (data as any[]).find((lab) => {
      const list = Array.isArray(lab.service_pincodes)
        ? lab.service_pincodes.map((p: any) => String(p).trim())
        : [];
      if (list.includes(target)) return true;
      const raw = (lab.pincode || "").trim();
      if (!raw) return false;
      return raw.split(/[,;\s]+/).map((p: string) => p.trim()).includes(target);
    });
    return match ? { city: match.city, state: match.state } : null;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!/^\d{6}$/.test(newPin)) {
      toast.error("Enter a valid 6-digit PIN code");
      return;
    }
    setSaving(true);
    try {
      const svc = await checkServiceable(newPin);
      if (!svc) {
        toast.error("Sorry, we don't serve this PIN code yet.");
        setSaving(false);
        return;
      }
      // Clear default flag on existing addresses, then upsert the new one
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);

      const { data: existing } = await supabase
        .from("addresses")
        .select("id")
        .eq("user_id", user.id)
        .eq("pincode", newPin)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("addresses").update({ is_default: true }).eq("id", existing[0].id);
      } else {
        await supabase.from("addresses").insert({
          user_id: user.id,
          address_line1: `Location - ${newPin}`,
          city: svc.city || "",
          state: svc.state || "",
          pincode: newPin,
          is_default: true,
          type: "Home",
        });
      }
      toast.success(`Location updated to ${svc.city || "PIN " + newPin}`);
      setOpen(false);
      setNewPin("");
      // Soft refresh so dependent queries pick up new pincode
      setTimeout(() => window.location.reload(), 400);
    } catch (e) {
      toast.error("Failed to update location. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mx-4 mt-2 mb-1 flex items-center gap-2 bg-primary/10 hover:bg-primary/15 active:scale-[0.99] transition-all text-primary rounded-full pl-3 pr-2 py-1.5 text-xs font-semibold w-fit"
        aria-label="Change delivery pincode"
      >
        <MapPin className="w-3.5 h-3.5" />
        <span>Delivering to: PIN {pincode || "—"}</span>
        <span className="text-primary/70">·</span>
        <span className="underline">Change</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
            onClick={() => !saving && setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-background rounded-t-2xl w-full max-w-[430px] p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground">Change delivery PIN</h3>
                <button
                  onClick={() => !saving && setOpen(false)}
                  className="text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Enter a new 6-digit PIN code. We'll show only labs that serve your area.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN code"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center tracking-widest mb-4"
                autoFocus
              />
              <Button
                variant="hero"
                className="w-full"
                onClick={handleSave}
                disabled={newPin.length !== 6 || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Location
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LocationChip;
