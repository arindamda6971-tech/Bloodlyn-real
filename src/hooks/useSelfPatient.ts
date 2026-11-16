import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  phone: string;
}

/** The signed-in patient's own details from their profile, for booking for themself. */
export function useSelfPatient(): PatientDetails | null {
  const { user } = useAuth();
  const [self, setSelf] = useState<PatientDetails | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, gender, date_of_birth").eq("id", user.id).maybeSingle();
      if (cancelled || !data) return;
      const dob = data.date_of_birth ? new Date(data.date_of_birth) : null;
      const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
      setSelf({
        name: data.full_name || "Me",
        age: age && age > 0 ? String(age) : "",
        gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : "",
        phone: (data.phone || "").replace(/\D/g, "").slice(-10),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return self;
}
