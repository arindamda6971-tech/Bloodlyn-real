import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { doctorsFromDirectory } from "@/lib/doctor-directory";
import type { Doctor } from "@/types/consultation";

/**
 * The doctors a patient can book: approved by the admin and accepting consultations
 * in the Partner Portal. There is no sample list: a patient must never be able to book
 * (and pay) a doctor who doesn't exist.
 */
export function useDoctors() {
  return useQuery<Doctor[]>({
    queryKey: ["doctor-directory"],
    queryFn: async () => {
      // The time stops a browser or proxy from answering with an old copy of the list.
      const { data, error } = await supabase.functions.invoke(`doctor-directory?_ts=${Date.now()}`, { method: "GET" });
      if (error) throw error;
      return doctorsFromDirectory(data);
    },
    // Doctors switch "Accepting consultations" on and off during the day.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** One doctor, from the list already loaded when there is one. */
export function useDoctor(id: string | undefined) {
  const query = useDoctors();
  const doctor = id ? query.data?.find((d) => String(d.id) === id) ?? null : null;
  return { ...query, doctor };
}
