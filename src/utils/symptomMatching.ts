import { DoctorSpecialty } from "@/types/consultation";

const SYMPTOM_TO_SPECIALTY_MAP: Record<string, DoctorSpecialty> = {
  // General
  "Fever": "General Physician",
  "Cold": "General Physician",
  "Cold & Cough": "General Physician",
  "Headache": "General Physician",
  "General Consultation": "General Physician",
  
  // Skin & Hair
  "Skin": "Dermatologist",
  "Skin Rash": "Dermatologist",
  "Hair": "Dermatologist",
  "Hair Fall": "Dermatologist",
  
  // Cardio
  "Heart": "Cardiologist",
  "Chest Pain": "Cardiologist",
  "High Blood Pressure": "Cardiologist",
  
  // Ortho / Physio
  "Bone": "Orthopedic",
  "Bone & Joint": "Orthopedic",
  "Back Pain": "Orthopedic",
  "Joint Pain": "Orthopedic",
  "Physiotherapy": "Physiotherapist",
  "Muscle Pain": "Physiotherapist",
  
  // ENT / Eye / Dental
  "Eye": "Ophthalmologist",
  "Eye Pain": "Ophthalmologist",
  "Vision Problem": "Ophthalmologist",
  "ENT": "ENT Specialist",
  "Ear Pain": "ENT Specialist",
  "Sore Throat": "ENT Specialist",
  "Dental": "Dentist",
  "Toothache": "Dentist",

  // Endo / Nutrition
  "Diabetes": "Endocrinologist",
  "Thyroid": "Endocrinologist",
  "Nutrition": "Dietitian",
  "Weight Loss": "Dietitian",
  "Weight Gain": "Dietitian",
  
  // Neuro / Psych
  "Neurology": "Neurologist",
  "Nerve Pain": "Neurologist",
  "Psychiatry": "Psychiatrist",
  "Mental Health": "Psychiatrist",
  "Depression": "Psychiatrist",
  "Anxiety": "Psychiatrist",
  
  // Women & Children
  "Women's Health": "Gynecologist",
  "Pregnancy": "Gynecologist",
  "Periods Issue": "Gynecologist",
  "Child Care": "Pediatrician",
  "Child Specialist": "Pediatrician",
  "Child Fever": "Pediatrician",
  
  // Internal Organs
  "Kidney": "Nephrologist",
  "Liver": "Hepatologist",
  "Lungs": "Pulmonologist",
  "Asthma": "Pulmonologist",
  "Breathing Issue": "Pulmonologist",
  "Urine Infection": "Urologist",
  "Sexual Health": "Other",
  "Other": "Other"
};

export const matchSymptomToSpecialty = (symptom: string | null): DoctorSpecialty => {
  if (!symptom) return "General Physician";
  
  // Exact match first
  if (SYMPTOM_TO_SPECIALTY_MAP[symptom]) {
    return SYMPTOM_TO_SPECIALTY_MAP[symptom];
  }
  
  // Case-insensitive partial match
  const normalizedInput = symptom.toLowerCase();
  for (const [key, specialty] of Object.entries(SYMPTOM_TO_SPECIALTY_MAP)) {
    if (normalizedInput.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedInput)) {
      return specialty;
    }
  }

  // Fallback
  return "General Physician";
};
