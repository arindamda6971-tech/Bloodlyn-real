import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConsultationFlowState, Doctor } from "@/types/consultation";
import { matchSymptomToSpecialty } from "@/utils/symptomMatching";
import { MapPin, Search, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoctorCard } from "./DoctorCard";
import { Input } from "@/components/ui/input";

interface OfflineFlowProps {
  state: ConsultationFlowState;
  updateState: (updates: Partial<ConsultationFlowState>) => void;
  updateOfflineState: (updates: Partial<ConsultationFlowState["offlineState"]>) => void;
  doctors: Doctor[];
  onBook: (doctor: Doctor, type: "video" | "audio" | "physical") => void;
}

const HEALTH_CONCERNS = [
  "General Physician", "Fever", "Cold & Cough", "Skin", "Eye", "ENT", 
  "Heart", "Diabetes", "Dental", "Bone & Joint", "Neurology", "Psychiatry", 
  "Women's Health", "Child Specialist", "Pregnancy", "Kidney", "Liver", 
  "Lungs", "Sexual Health", "Nutrition", "Physiotherapy", "Other"
];

export const OfflineFlow = ({ state, updateState, updateOfflineState, doctors, onBook }: OfflineFlowProps) => {
  // Offline flow starts at currentStep = 2 (since step 1 is choosing offline vs online)
  // Step 2: Location
  // Step 3: Health Concern
  // Step 4: Filters
  // Step 5: Doctor List
  
  const step = state.currentStep;

  return (
    <AnimatePresence mode="wait">
      {step === 2 && (
        <LocationStep key="location" updateOfflineState={updateOfflineState} onNext={() => updateState({ currentStep: 3 })} />
      )}
      {step === 3 && (
        <HealthConcernStep key="concern" updateState={updateState} onNext={() => updateState({ currentStep: 4 })} />
      )}
      {step === 4 && (
        <FiltersStep key="filters" state={state.offlineState} updateOfflineState={updateOfflineState} onNext={() => updateState({ currentStep: 5 })} />
      )}
      {step === 5 && (
        <DoctorListStep key="doctors" state={state} doctors={doctors} onBook={onBook} />
      )}
    </AnimatePresence>
  );
};

// --- Step 2: Location ---
const LocationStep = ({ updateOfflineState, onNext }: any) => {
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");

  const handlePincodeSubmit = () => {
    if (pincode.length < 6) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    updateOfflineState({ locationType: "pincode", pincode });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Where would you like to visit?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select your location to find nearby clinics.</p>
      </div>
      
      <button onClick={() => { updateOfflineState({ locationType: "current" }); onNext(); }} className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5" />
          <span className="font-bold">Use Current Location</span>
        </div>
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="relative flex items-center gap-2">
        <div className="flex-1 relative">
          <Input 
            value={pincode} 
            onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            placeholder="Enter Pincode Manually" 
            className="h-14 rounded-2xl pl-4 border-border/60 font-medium"
            inputMode="numeric"
          />
        </div>
        <Button onClick={handlePincodeSubmit} className="h-14 px-6 rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90">
          Search
        </Button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium px-2">{error}</p>}
    </motion.div>
  );
};

// --- Step 3: Health Concern ---
const HealthConcernStep = ({ updateState, onNext }: any) => {
  const [search, setSearch] = useState("");
  const filtered = HEALTH_CONCERNS.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (concern: string) => {
    const specialty = matchSymptomToSpecialty(concern);
    updateState({ healthConcern: concern, selectedSpecialty: specialty });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">What health issue are you facing?</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a category or search for symptoms.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symptoms or specialities..." 
          className="h-12 rounded-2xl pl-10 bg-muted/30 border-transparent focus:bg-background transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {filtered.map(concern => (
          <button 
            key={concern} onClick={() => handleSelect(concern)}
            className="px-4 py-2 rounded-xl bg-card border border-border/60 text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-95"
          >
            {concern}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground p-4">No matching concerns found.</p>}
      </div>
    </motion.div>
  );
};

// --- Step 4: Filters ---
const FiltersStep = ({ state, updateOfflineState, onNext }: any) => {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Filter Doctors</h2>
        <p className="text-sm text-muted-foreground mt-1">Refine your search for the best match.</p>
      </div>

      <div className="space-y-6">
        {/* Availability */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</label>
          <div className="flex gap-2">
            {["today", "tomorrow", "this-week"].map(opt => (
              <button 
                key={opt} onClick={() => updateOfflineState({ filters: { ...state.filters, availability: opt } })}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-xs capitalize transition-all ${state.filters.availability === opt ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border/60"}`}
              >
                {opt.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Doctor Gender</label>
          <div className="flex gap-2">
            {["any", "male", "female"].map(opt => (
              <button 
                key={opt} onClick={() => updateOfflineState({ filters: { ...state.filters, gender: opt } })}
                className={`flex-1 py-2.5 rounded-xl border font-semibold text-xs capitalize transition-all ${state.filters.gender === opt ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border/60"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Simple mock for sliders */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience</label>
            <span className="text-xs font-bold">{state.filters.minExperience}+ Years</span>
          </div>
          <input 
            type="range" min="0" max="30" step="5" value={state.filters.minExperience} 
            onChange={(e) => updateOfflineState({ filters: { ...state.filters, minExperience: parseInt(e.target.value) } })}
            className="w-full accent-primary" 
          />
        </div>
      </div>

      <Button onClick={onNext} className="w-full h-14 rounded-2xl font-bold text-base mt-4 shadow-md bg-primary hover:bg-primary/90">
        Show Doctors
      </Button>
    </motion.div>
  );
};

// --- Step 5: Doctor List ---
const DoctorListStep = ({ state, doctors, onBook }: any) => {
  const filteredDoctors = doctors.filter((d: Doctor) => {
    // Basic specialty matching based on selected symptom mapping
    if (state.selectedSpecialty && !d.specialty.includes(state.selectedSpecialty) && state.selectedSpecialty !== "Other") {
      // Allow fallback to generic physician if no direct match in mock data
      if (state.selectedSpecialty !== "General Physician" && !d.specialty.includes("General")) {
        // Just for demo, we are very lenient. In prod, strictly match.
      }
    }
    if (state.offlineState.filters.gender !== "any") {
      // Assume "dr." gender mapping if real gender missing (mock logic)
    }
    if (d.experience < state.offlineState.filters.minExperience) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-black text-foreground tracking-tight">Available Doctors</h2>
          <p className="text-xs text-muted-foreground font-medium">{state.selectedSpecialty || state.healthConcern}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">{filteredDoctors.length} found</span>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doc: Doctor) => (
            <DoctorCard key={doc.id} doctor={doc} onBook={onBook} allowedTypes={["physical"]} />
          ))
        ) : (
          <div className="p-8 text-center bg-card rounded-3xl border border-border/50">
            <p className="font-bold text-foreground">No doctors found</p>
            <p className="text-xs text-muted-foreground mt-2">Try adjusting your filters or location.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
