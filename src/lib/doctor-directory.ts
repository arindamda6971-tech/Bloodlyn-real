import type { Doctor } from "@/types/consultation";

const money = (...values: unknown[]) => {
  for (const v of values) {
    const n = Number(v);
    if (v != null && Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

/**
 * Doctors from the doctor-directory function (approved by the admin, active in the
 * partner portal), shaped for the booking screens. Nothing is made up: no sample
 * doctors, no rating without reviews, no fee the doctor didn't set (0 = not offered),
 * and doctors who switched off "Accepting consultations" are left out.
 */
export function doctorsFromDirectory(data: unknown): Doctor[] {
  const body = data as { doctors?: unknown } | unknown[] | null;
  const raw: any[] = Array.isArray(body) ? body : Array.isArray((body as any)?.doctors) ? (body as any).doctors : [];
  return raw
    .filter((d) => d && (d.id || d.user_id) && (d.name || d.full_name))
    .map((d) => {
      const base = money(d.consultation_fee);
      const clinicAddress = String(d.clinicAddress || d.clinic_address || "");
      return {
        id: String(d.id || d.user_id),
        name: d.name || d.full_name,
        specialty: d.specialty || d.specialization || "General Physician",
        qualification: d.qualification || "",
        experience: Number(d.experience ?? d.experience_years ?? 0) || 0,
        rating: Number(d.rating ?? 0) || 0,
        reviews: Number(d.reviews ?? d.reviews_count ?? 0) || 0,
        available: d.available !== false && d.is_online !== false,
        nextSlot: "Available today",
        videoCallFee: money(d.videoCallFee, d.video_call_fee, base),
        audioCallFee: money(d.audioCallFee, d.audio_call_fee, base),
        physicalCallFee: money(d.physicalCallFee, d.in_clinic_fee, clinicAddress ? base : 0),
        image: d.image || d.photo_url || d.photo || undefined,
        hospitalName: d.hospitalName || d.clinic_name || d.clinicName || "",
        clinicAddress,
        pincode: String(d.pincode || clinicAddress.match(/\b\d{6}\b/)?.[0] || ""),
        service_pincodes: Array.isArray(d.service_pincodes)
          ? d.service_pincodes.map(String)
          : d.pincode
            ? [String(d.pincode)]
            : [],
        gender: d.gender || "Any",
        languages: d.languages || ["English", "Hindi"],
      } as Doctor;
    })
    .filter((d) => d.available);
}

/**
 * The cart id create-order reads the consultation mode from: doc-video-{id},
 * doc-audio-{id}, or doc-{id} for a clinic visit.
 */
export function doctorCartId(type: "video" | "audio" | "physical", doctorId: string): string {
  return type === "physical" ? `doc-${doctorId}` : `doc-${type}-${doctorId}`;
}
