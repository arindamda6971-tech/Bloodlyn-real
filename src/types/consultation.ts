export type ConsultationType = "offline" | "online" | null;

export interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  reviews: number;
  available: boolean;
  nextSlot: string;
  videoCallFee: number;
  audioCallFee: number;
  physicalCallFee: number;
  qualification: string;
  image?: string;
  hospitalName?: string;
  distance?: number;
  gender?: "Male" | "Female" | "Any";
  languages?: string[];
  clinicAddress?: string;
  pincode?: string;
  service_pincodes?: string[];
  treated_symptoms?: string[];
}

export type DoctorSpecialty =
  | "General Physician"
  | "Dermatologist"
  | "Ophthalmologist"
  | "ENT Specialist"
  | "Cardiologist"
  | "Endocrinologist"
  | "Dentist"
  | "Orthopedic"
  | "Neurologist"
  | "Psychiatrist"
  | "Gynecologist"
  | "Pediatrician"
  | "Nephrologist"
  | "Hepatologist"
  | "Pulmonologist"
  | "Urologist"
  | "Dietitian"
  | "Physiotherapist"
  | "Other";

export interface ConsultationFlowState {
  // Step tracking
  currentStep: number;
  totalSteps: number;
  
  // Selection
  type: ConsultationType;

  // Common details
  healthConcern: string | null;
  selectedSpecialty: DoctorSpecialty | null;
  selectedDoctorId: string | null;

  // Offline Specific
  offlineState: {
    locationType: "current" | "pincode" | null;
    pincode: string;
    filters: {
      availability: "today" | "tomorrow" | "this-week" | null;
      gender: "any" | "male" | "female";
      minExperience: number;
      maxFee: number;
      maxDistance: number;
      language: string | null;
      rating: number;
    };
    appointmentDate: string | null;
    appointmentTime: string | null;
    patientId: string | null;
  };

  // Online Specific
  onlineState: {
    language: string | null;
    basicInfo: {
      weight: string;
      height: string;
      bloodPressure: string;
      bloodSugar: string;
      bodyTemperature: string;
      pulseRate: string;
      oxygenSaturation: string;
      allergies: string;
      medications: string;
      symptomsDuration: string;
    };
    consultationType: "video" | "audio" | null;
    filters: {
      sort: "lowest-fee" | "highest-rating" | "fastest-available" | "most-experienced" | null;
    };
  };
}

export const initialConsultationState: ConsultationFlowState = {
  currentStep: 1,
  totalSteps: 6,
  type: null,
  healthConcern: null,
  selectedSpecialty: null,
  selectedDoctorId: null,
  offlineState: {
    locationType: null,
    pincode: "",
    filters: {
      availability: null,
      gender: "any",
      minExperience: 0,
      maxFee: 5000,
      maxDistance: 50,
      language: null,
      rating: 0,
    },
    appointmentDate: null,
    appointmentTime: null,
    patientId: null,
  },
  onlineState: {
    language: null,
    basicInfo: {
      weight: "",
      height: "",
      bloodPressure: "",
      bloodSugar: "",
      bodyTemperature: "",
      pulseRate: "",
      oxygenSaturation: "",
      allergies: "",
      medications: "",
      symptomsDuration: "",
    },
    consultationType: null,
    filters: {
      sort: null,
    },
  },
};
