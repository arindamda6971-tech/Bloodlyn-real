import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConsultationFlowState, Doctor } from "@/types/consultation";
import { matchSymptomToSpecialty } from "@/utils/symptomMatching";
import { MapPin, Search, ChevronRight, SlidersHorizontal, Edit2, Sparkles, CheckCircle2, Building2, Calendar, AlertTriangle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoctorCard } from "./DoctorCard";
import { Input } from "@/components/ui/input";
import { sanitizePincode } from "@/utils/inputSanitizers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
        <DoctorListStep key="doctors" state={state} updateState={updateState} updateOfflineState={updateOfflineState} doctors={doctors} onBook={onBook} />
      )}
    </AnimatePresence>
  );
};

// --- Step 2: Location ---
const LocationStep = ({ updateOfflineState, onNext }: any) => {
  const { user } = useAuth();
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; type?: string; pincode: string; address_line1?: string; is_default?: boolean }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("addresses")
          .select("id, type, pincode, address_line1, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setSavedAddresses(data.filter(a => a.pincode && /^\d{6}$/.test(a.pincode)));
        }
      } catch (e) {
        console.error("Failed to load saved addresses", e);
      }
    })();
  }, [user]);

  const handlePincodeSubmit = () => {
    if (pincode.length < 6) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    updateOfflineState({ locationType: "pincode", pincode });
    onNext();
  };

  const handleShowAll = () => {
    updateOfflineState({ locationType: null, pincode: "" });
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Where would you like to visit?</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your pincode or select a saved location to find nearby clinics and doctors.</p>
      </div>

      {/* Saved Locations / Pincodes System */}
      {savedAddresses.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 px-0.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Saved Locations & Pincodes
          </label>
          <div className="grid grid-cols-1 gap-2">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  setPincode(addr.pincode);
                  updateOfflineState({ locationType: "pincode", pincode: addr.pincode });
                  onNext();
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                  pincode === addr.pincode
                    ? "bg-primary/10 border-primary shadow-sm"
                    : "bg-card border-border/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground truncate">{addr.type || "Saved Location"}</span>
                      {addr.is_default && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-primary/20 text-primary rounded-md">Default</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                      Pincode: <span className="font-bold text-foreground">{addr.pincode}</span> {addr.address_line1 ? `• ${addr.address_line1}` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
      
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
            type="text"
            value={pincode} 
            onChange={(e) => { setPincode(sanitizePincode(e.target.value)); setError(""); }}
            placeholder="Enter 6-digit Pincode (e.g. 700001)" 
            className="h-14 rounded-2xl pl-4 border-border/60 font-medium"
            inputMode="numeric"
            maxLength={6}
          />
        </div>
        <Button onClick={handlePincodeSubmit} className="h-14 px-6 rounded-2xl font-bold bg-foreground text-background hover:bg-foreground/90">
          Sync
        </Button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium px-2">{error}</p>}

      <button
        onClick={handleShowAll}
        className="w-full py-3.5 rounded-2xl border border-dashed border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span>Skip & View All Available Doctors</span>
      </button>
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
      </div>

      <button
        onClick={() => { updateState({ healthConcern: "All Doctors", selectedSpecialty: null }); onNext(); }}
        className="w-full py-3 mt-2 text-xs font-bold text-primary hover:underline text-center"
      >
        Show All Specialties & Doctors →
      </button>
    </motion.div>
  );
};// --- Step 4: Filters & 7-Day Booking System ---
const FiltersStep = ({ state, updateOfflineState, onNext }: any) => {
  // Generate next 7 days list dynamically
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const dateFormatted = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const isoDate = d.toISOString().split("T")[0];
    return { dayName, dateFormatted, isoDate, isToday: i === 0, isTomorrow: i === 1 };
  });

  const selectedDate = state?.appointmentDate || next7Days[0].isoDate;

  const handleSelectDate = (day: any) => {
    const avail = day.isToday ? "today" : day.isTomorrow ? "tomorrow" : "this-week";
    updateOfflineState({
      appointmentDate: day.isoDate,
      filters: { ...(state?.filters || {}), availability: avail },
    });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Select Date & Filter</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a booking slot over the next 7 days.</p>
      </div>

      <div className="space-y-6">
        {/* 7-Day Booking System */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Booking Date (Next 7 Days)
            </label>
            <span className="text-xs font-bold text-primary">
              {next7Days.find(d => d.isoDate === selectedDate)?.dateFormatted || "Today"}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {next7Days.map((day) => {
              const isSelected = selectedDate === day.isoDate;
              return (
                <button
                  key={day.isoDate}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border min-w-[76px] shrink-0 transition-all active:scale-95 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                      : "bg-card border-border/60 text-foreground hover:border-primary/40"
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85">{day.dayName}</span>
                  <span className="text-sm font-black mt-0.5">{day.dateFormatted.split(" ")[0]}</span>
                  <span className="text-[9px] font-bold opacity-75">{day.dateFormatted.split(" ")[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctor Gender */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Doctor Gender</label>
          <div className="flex gap-2">
            {["any", "male", "female"].map((opt) => {
              const currentGender = state?.filters?.gender || "any";
              return (
                <button 
                  key={opt}
                  type="button"
                  onClick={() => updateOfflineState({ filters: { ...(state?.filters || {}), gender: opt } })}
                  className={`flex-1 py-3 rounded-2xl border font-bold text-xs capitalize transition-all active:scale-95 ${
                    currentGender === opt
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border/60 hover:border-primary/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Button onClick={onNext} className="w-full h-14 rounded-2xl font-bold text-base mt-2 shadow-md bg-primary hover:bg-primary/90">
        Show Doctors
      </Button>
    </motion.div>
  );
};

// --- Step 5: Doctor List ---
const DoctorListStep = ({ state, updateState, updateOfflineState, doctors, onBook }: any) => {
  const [nameQuery, setNameQuery] = useState("");
  const [showFallbackDocs, setShowFallbackDocs] = useState(false);
  const targetPincode = state?.offlineState?.pincode?.trim() || "";
  const filterGender = state?.offlineState?.filters?.gender || "any";

  // Filter logic
  let matchedDoctors = doctors.filter((d: Doctor) => {
    // Search query filter
    if (nameQuery.trim()) {
      const q = nameQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchSpec = d.specialty.toLowerCase().includes(q);
      const matchHosp = (d.hospitalName || "").toLowerCase().includes(q);
      if (!matchName && !matchSpec && !matchHosp) return false;
    }

    // Gender filter
    if (filterGender !== "any") {
      if (d.gender && d.gender.toLowerCase() !== filterGender) return false;
    }

    return true;
  });

  // Pincode matching: check if doctor serves target pincode
  const pincodeFiltered = targetPincode
    ? matchedDoctors.filter((d: Doctor) => {
        if (d.pincode && d.pincode.includes(targetPincode)) return true;
        if (d.service_pincodes && d.service_pincodes.some(p => p.includes(targetPincode))) return true;
        if (d.clinicAddress && d.clinicAddress.includes(targetPincode)) return true;
        return false;
      })
    : matchedDoctors;

  // Check if pincode has NO direct clinic doctors
  const hasNoDirectDoctors = targetPincode.length === 6 && pincodeFiltered.length === 0;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-4 flex flex-col gap-4">
      {/* Location / Pincode Bar */}
      <div className="flex items-center justify-between p-3.5 bg-card border border-border/60 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">Clinic Search Location</span>
            <span className="block text-xs font-bold text-foreground truncate">
              {targetPincode ? `Pincode: ${targetPincode}` : "All Online Locations"}
            </span>
          </div>
        </div>
        <button
          onClick={() => updateState({ currentStep: 2 })}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0 px-2 py-1 bg-primary/5 rounded-lg"
        >
          <Edit2 className="w-3 h-3" /> Change
        </button>
      </div>

      {/* Name / Specialty Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="Search doctor by name or specialty..."
          className="h-12 rounded-2xl pl-10 bg-card border-border/60 font-medium"
        />
      </div>

      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-black text-foreground tracking-tight">Available Doctors</h2>
          <p className="text-xs text-muted-foreground font-medium">
            {state.selectedSpecialty || state.healthConcern || "All Doctors"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full">
          <Building2 className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">{pincodeFiltered.length} Direct Doctors</span>
        </div>
      </div>

      {/* Notice & Doctor List Logic */}
      {hasNoDirectDoctors ? (
        <div className="flex flex-col gap-4">
          {/* Prominent Alert Notice Box */}
          <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-foreground flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                  No Clinic Visit Doctors Found at Pincode {targetPincode}
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300 font-medium mt-1 leading-relaxed">
                  There are currently no registered doctors available for physical clinic visits at pincode <span className="font-black text-amber-950 dark:text-amber-100">{targetPincode}</span>.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2 mt-1 pt-3 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => updateState({ type: "online", currentStep: 2, totalSteps: 6 })}
                className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-all active:scale-95"
              >
                <Video className="w-4 h-4" /> Switch to Online Video/Audio Consult
              </button>

              <button
                type="button"
                onClick={() => updateState({ currentStep: 2 })}
                className="w-full py-3 px-4 rounded-xl bg-background border border-border/80 text-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-muted/50 transition-all active:scale-95"
              >
                <MapPin className="w-4 h-4 text-primary" /> Change Pincode / Location
              </button>
            </div>
          </div>

          {/* Toggle link to view general online doctors */}
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={() => setShowFallbackDocs(!showFallbackDocs)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline transition-colors"
            >
              {showFallbackDocs ? "Hide online doctors list" : "View all active online doctors anyway →"}
            </button>
          </div>

          {showFallbackDocs && (
            <div className="space-y-4 mt-2">
              {matchedDoctors.map((doc: Doctor) => (
                <DoctorCard key={doc.id} doctor={doc} onBook={onBook} allowedTypes={["physical"]} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Doctor List when direct pincode matches exist */
        <div className="space-y-4">
          {pincodeFiltered.length > 0 ? (
            pincodeFiltered.map((doc: Doctor) => (
              <DoctorCard key={doc.id} doctor={doc} onBook={onBook} allowedTypes={["physical"]} />
            ))
          ) : (
            <div className="p-8 text-center bg-card rounded-3xl border border-border/50">
              <p className="font-bold text-foreground">No doctors found</p>
              <p className="text-xs text-muted-foreground mt-2">Try clearing your search query or pincode.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
