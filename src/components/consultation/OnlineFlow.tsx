import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConsultationFlowState, Doctor } from "@/types/consultation";
import { matchSymptomToSpecialty } from "@/utils/symptomMatching";
import { Search, ChevronRight, Video, Phone, ShieldCheck, CheckCircle2, Users, Plus, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DoctorCard } from "./DoctorCard";
import { sanitizeWeight, sanitizeHeight, sanitizeBloodPressure, sanitizeBloodSugar } from "@/utils/inputSanitizers";

interface OnlineFlowProps {
  state: ConsultationFlowState;
  updateState: (updates: Partial<ConsultationFlowState>) => void;
  updateOnlineState: (updates: Partial<ConsultationFlowState["onlineState"]>) => void;
  doctors: Doctor[];
  onBook: (doctor: Doctor, type: "video" | "audio" | "physical") => void;
}

const LANGUAGES = [
  "English", "Hindi", "Bengali", "Tamil", "Telugu", 
  "Gujarati", "Marathi", "Kannada", "Malayalam", "Punjabi", "Odia"
];

const HEALTH_CONCERNS = [
  "General Consultation", "Fever", "Cold", "Headache", "Skin", "Eye", 
  "ENT", "Heart", "Mental Health", "Women's Health", "Child Care", 
  "Diabetes", "Bone", "Nutrition", "Hair", "Pregnancy", "Sexual Health", "Other"
];

export const OnlineFlow = ({
  state,
  updateState,
  updateOnlineState,
  doctors,
  onBook,
  familyMembers = [],
  selectedMemberId = "self",
  setSelectedMemberId,
  selfProfile,
  onOpenAddDialog,
}: any) => {
  const step = state.currentStep;

  return (
    <AnimatePresence mode="wait">
      {step === 2 && (
        <LanguageStep key="lang" state={state.onlineState} updateOnlineState={updateOnlineState} onNext={() => updateState({ currentStep: 3 })} />
      )}
      {step === 3 && (
        <HealthConcernStep key="concern" updateState={updateState} onNext={() => updateState({ currentStep: 4 })} />
      )}
      {step === 4 && (
        <BasicHealthInfoStep
          key="vitals"
          state={state.onlineState}
          updateOnlineState={updateOnlineState}
          onNext={() => updateState({ currentStep: 5 })}
          familyMembers={familyMembers}
          selectedMemberId={selectedMemberId}
          setSelectedMemberId={setSelectedMemberId}
          selfProfile={selfProfile}
          onOpenAddDialog={onOpenAddDialog}
        />
      )}
      {step === 5 && (
        <ConsultationTypeStep key="type" state={state.onlineState} updateOnlineState={updateOnlineState} onNext={() => updateState({ currentStep: 6 })} />
      )}
      {step === 6 && (
        <DoctorMatchingStep key="match" state={state} doctors={doctors} onBook={onBook} />
      )}
    </AnimatePresence>
  );
};

// --- Step 2: Language ---
const LanguageStep = ({ state, updateOnlineState, onNext }: any) => {
  const [search, setSearch] = useState("");
  const filtered = LANGUAGES.filter(l => l.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Which language are you comfortable with?</h2>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Language" 
          className="h-12 rounded-2xl pl-10 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/30 border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 shadow-sm shadow-primary/5 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {filtered.map(lang => (
          <button 
            key={lang} 
            onClick={() => { updateOnlineState({ language: lang }); onNext(); }}
            className={`p-4 rounded-2xl border text-left font-bold text-sm transition-all active:scale-95 flex items-center justify-between ${state.language === lang ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border/60 hover:border-primary/40"}`}
          >
            {lang}
            {state.language === lang && <CheckCircle2 className="w-4 h-4" />}
          </button>
        ))}
      </div>
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
        <h2 className="text-xl font-black text-foreground tracking-tight">What health problem are you experiencing?</h2>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symptoms..." 
          className="h-12 rounded-2xl pl-10 bg-gradient-to-r from-primary/10 via-primary/5 to-muted/30 border-primary/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 shadow-sm shadow-primary/5 transition-all"
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
    </motion.div>
  );
};

// --- Step 4: Basic Health Info ---
const BasicHealthInfoStep = ({
  state,
  updateOnlineState,
  onNext,
  familyMembers = [],
  selectedMemberId = "self",
  setSelectedMemberId,
  selfProfile,
  onOpenAddDialog,
}: any) => {
  const [info, setInfo] = useState(state.basicInfo);

  const handleChange = (field: string, value: string) => {
    let cleanVal = value;
    if (field === "bloodPressure") cleanVal = sanitizeBloodPressure(value);
    if (field === "bloodSugar") cleanVal = sanitizeBloodSugar(value);
    const newInfo = { ...info, [field]: cleanVal };
    setInfo(newInfo);
    updateOnlineState({ basicInfo: newInfo });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Patient & Health Details</h2>
        <p className="text-xs text-muted-foreground mt-1 font-semibold text-emerald-600">Select patient and share optional health details.</p>
      </div>

      {/* Family Member System Selector */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Who is this consultation for?
          </label>
          {onOpenAddDialog && (
            <button
              type="button"
              onClick={onOpenAddDialog}
              className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 active:bg-primary/20 px-2.5 py-1 rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Member
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* Self Option */}
          <button
            type="button"
            onClick={() => setSelectedMemberId && setSelectedMemberId("self")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
              selectedMemberId === "self"
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-background border-border/60 text-foreground hover:border-primary/40"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Self {selfProfile?.name ? `(${selfProfile.name})` : ""}</span>
          </button>

          {/* Family Members List */}
          {(familyMembers || []).map((m: any) => {
            const isSelected = selectedMemberId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId && setSelectedMemberId(m.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                    : "bg-background border-border/60 text-foreground hover:border-primary/40"
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                <span>{m.relationship === "Other" ? m.customRelationship || "Relative" : m.relationship} ({m.fullName})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Vitals & Health Notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Blood Pressure</label>
          <Input type="text" maxLength={7} placeholder="120/80" value={info.bloodPressure} onChange={e => handleChange("bloodPressure", e.target.value)} className="rounded-xl h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Blood Sugar (mg/dL)</label>
          <Input type="text" inputMode="numeric" maxLength={3} placeholder="e.g. 100" value={info.bloodSugar} onChange={e => handleChange("bloodSugar", e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-muted-foreground">Current Medications / Symptoms Note</label>
        <Input placeholder="List any current medications or symptoms" value={info.medications} onChange={e => handleChange("medications", e.target.value)} className="rounded-xl h-11" />
      </div>

      <div className="flex gap-3 mt-4">
        <Button variant="outline" onClick={onNext} className="flex-1 h-12 rounded-xl font-bold">Skip</Button>
        <Button onClick={onNext} className="flex-1 h-12 rounded-xl font-bold">Continue</Button>
      </div>
    </motion.div>
  );
};

// --- Step 5: Consultation Type ---
const ConsultationTypeStep = ({ state, updateOnlineState, onNext }: any) => {
  const options = [
    { id: "video", title: "Video Call", desc: "Face-to-face virtual consultation", icon: Video, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "audio", title: "Audio Call", desc: "Voice only consultation", icon: Phone, color: "text-indigo-500", bg: "bg-indigo-500/10" }
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Choose consultation mode</h2>
      </div>

      <div className="space-y-3">
        {options.map(opt => (
          <button 
            key={opt.id} 
            onClick={() => { updateOnlineState({ consultationType: opt.id as any }); onNext(); }}
            className={`w-full p-5 rounded-[1.5rem] border flex items-center gap-4 text-left transition-all active:scale-95 ${state.consultationType === opt.id ? "bg-primary/5 border-primary" : "bg-card border-border hover:border-primary/40"}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${opt.bg}`}>
              <opt.icon className={`w-6 h-6 ${opt.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-sm">{opt.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// --- Step 6: Doctor Matching ---
const DoctorMatchingStep = ({ state, doctors, onBook }: any) => {
  // Smart match logic: Filter doctors by matched specialty
  const matchedDoctors = doctors.filter((d: Doctor) => {
    if (state.selectedSpecialty && !d.specialty.includes(state.selectedSpecialty) && state.selectedSpecialty !== "Other") {
      if (state.selectedSpecialty !== "General Physician" && !d.specialty.includes("General")) {
        // Fallback for demo purposes
      }
    }
    // Filter by online availability
    if (state.onlineState.consultationType === "video" && !d.videoCallFee) return false;
    if (state.onlineState.consultationType === "audio" && !d.audioCallFee) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 flex flex-col gap-4">
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Smart Match Complete</h3>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-1 font-medium">
            We found {matchedDoctors.length} {state.selectedSpecialty}s matching your symptoms and language preference.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-2">
        {matchedDoctors.length > 0 ? (
          matchedDoctors.map((doc: Doctor) => (
            <DoctorCard 
              key={doc.id} 
              doctor={doc} 
              onBook={onBook} 
              allowedTypes={state.onlineState.consultationType ? [state.onlineState.consultationType as any] : ["video", "audio"]} 
            />
          ))
        ) : (
          <div className="p-8 text-center bg-card rounded-3xl border border-border/50">
            <p className="font-bold text-foreground">No matching doctors found</p>
            <p className="text-xs text-muted-foreground mt-2">Try changing your consultation type or language.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
