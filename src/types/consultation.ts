/** A doctor from the doctor-directory function, shaped by lib/doctor-directory. */
export interface Doctor {
  id: string | number;
  name: string;
  /** What the doctor wrote in the Partner Portal, e.g. "Family Medicine". */
  specialty: string;
  experience: number;
  /** Only meaningful when reviews > 0: no reviews means no rating. */
  rating: number;
  reviews: number;
  available: boolean;
  nextSlot: string;
  /** 0 means the doctor doesn't offer that mode. */
  videoCallFee: number;
  audioCallFee: number;
  qualification: string;
  image?: string;
  hospitalName?: string;
  distance?: number;
  gender?: "Male" | "Female" | "Any";
  languages?: string[];
  clinicAddress?: string;
  city?: string;
  pincode?: string;
  service_pincodes?: string[];
  treated_symptoms?: string[];
}
