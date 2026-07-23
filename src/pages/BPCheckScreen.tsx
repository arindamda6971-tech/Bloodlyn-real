import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HeartPulse, MapPin, Calendar, Clock, User, CheckCircle2, ChevronRight, Info, AlertTriangle, FileText, Search, CreditCard } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Flow states
type FlowStep = "ADDRESS" | "AVAILABILITY" | "APPOINTMENT" | "DETAILS" | "SUMMARY" | "SUCCESS";

interface Address {
  id: string;
  type: string;
  fullAddress: string;
}

interface AppointmentDetails {
  date: "Today" | "Tomorrow" | string;
  timeSlot: string;
}

interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  mobile: string;
  notes: string;
}

const MOCK_ADDRESSES: Address[] = [
  { id: "1", type: "Home", fullAddress: "123, Sunrise Apartments, HSR Layout, Sector 2, Bangalore" },
  { id: "2", type: "Office", fullAddress: "Tech Park, Tower B, Electronic City, Bangalore" }
];

const BPCheckScreen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>("ADDRESS");
  
  // Form State
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [pincode, setPincode] = useState("");
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean | null>(null);
  const [appointment, setAppointment] = useState<AppointmentDetails>({ date: "Today", timeSlot: "" });
  const [patient, setPatient] = useState<PatientDetails>({ name: "", age: "", gender: "", mobile: "", notes: "" });

  const handleBack = () => {
    switch (step) {
      case "ADDRESS": navigate(-1); break;
      case "AVAILABILITY": setStep("ADDRESS"); break;
      case "APPOINTMENT": setStep("AVAILABILITY"); break;
      case "DETAILS": setStep("APPOINTMENT"); break;
      case "SUMMARY": setStep("DETAILS"); break;
      case "SUCCESS": navigate("/"); break; // Cannot go back from success
    }
  };

  const checkAvailability = () => {
    // Mock availability check
    if (pincode.startsWith("1")) {
      setIsServiceAvailable(false);
    } else {
      setIsServiceAvailable(true);
      setTimeout(() => setStep("APPOINTMENT"), 1500); // Auto progress on success
    }
  };

  const progressToSummary = () => {
    if (patient.name && patient.age && patient.gender && patient.mobile) {
      setStep("SUMMARY");
    }
  };

  const handlePayment = () => {
    // Mock payment/booking
    setTimeout(() => {
      setStep("SUCCESS");
    }, 1500);
  };

  return (
    <MobileLayout showNav={false}>
      {/* Dynamic Header (hidden on Success) */}
      {step !== "SUCCESS" && (
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40 pb-2">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <button 
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-[17px] font-black text-foreground tracking-tight flex items-center gap-2">
                Home BP Check
                <span className="bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Visit</span>
              </h1>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                {step === "ADDRESS" && "Select Visit Address"}
                {step === "AVAILABILITY" && "Checking Coverage"}
                {step === "APPOINTMENT" && "Choose Date & Time"}
                {step === "DETAILS" && "Patient Information"}
                {step === "SUMMARY" && "Review Booking"}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="px-4 mt-2">
            <div className="flex gap-1 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                className="bg-blue-600 h-full rounded-full"
                initial={{ width: "20%" }}
                animate={{ 
                  width: step === "ADDRESS" ? "20%" :
                         step === "AVAILABILITY" ? "40%" :
                         step === "APPOINTMENT" ? "60%" :
                         step === "DETAILS" ? "80%" : "100%"
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-x-hidden relative min-h-[calc(100vh-100px)]">
        <AnimatePresence mode="wait">
          {/* STEP 1: ADDRESS */}
          {step === "ADDRESS" && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h2 className="text-xl font-black mb-4">Where should we visit?</h2>
              
              <button className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 mb-6 active:scale-[0.98] transition-transform">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <span className="block text-sm font-black text-blue-900">Use Current Location</span>
                  <span className="block text-xs font-semibold text-blue-600/70">Enable GPS for exact address</span>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-300" />
              </button>

              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Saved Addresses</p>
              <div className="space-y-3">
                {MOCK_ADDRESSES.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddress(addr);
                      setStep("AVAILABILITY");
                    }}
                    className="bg-card border border-border/50 rounded-2xl p-4 flex gap-3 items-start shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-foreground/70" />
                    </div>
                    <div>
                      <span className="block text-sm font-black text-foreground mb-1">{addr.type}</span>
                      <span className="block text-xs font-medium text-muted-foreground leading-relaxed">{addr.fullAddress}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-6 bg-muted/50 text-foreground py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform border border-border/50">
                + Add New Address
              </button>
            </motion.div>
          )}

          {/* STEP 2: AVAILABILITY CHECK */}
          {step === "AVAILABILITY" && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-center mb-2">Check Serviceability</h2>
              <p className="text-sm text-center text-muted-foreground font-medium mb-8 max-w-[280px]">
                Please confirm the pincode for {selectedAddress?.type.toLowerCase() || 'your location'} to see if Home BP Check is covered.
              </p>

              <div className="w-full max-w-sm space-y-4">
                <Input 
                  type="number" 
                  placeholder="Enter 6-digit pincode" 
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setIsServiceAvailable(null); // Reset on type
                  }}
                  className="h-14 text-center text-lg font-bold tracking-widest bg-muted/50 rounded-2xl"
                />
                <button
                  onClick={checkAvailability}
                  disabled={pincode.length < 6}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Check Availability
                </button>
              </div>

              {isServiceAvailable === false && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 w-full max-w-sm bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-900">Not available yet</p>
                    <p className="text-xs font-medium text-rose-700/80 mt-1">Sorry, Home BP Check is not available in this area yet. We are expanding rapidly!</p>
                  </div>
                </motion.div>
              )}
              {isServiceAvailable === true && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 w-full max-w-sm bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-900">Service Available!</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 3: APPOINTMENT */}
          {step === "APPOINTMENT" && (
            <motion.div
              key="appointment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h2 className="text-xl font-black mb-6">When should we visit?</h2>
              
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Select Date</p>
              <div className="flex gap-3 mb-8">
                {["Today", "Tomorrow"].map((date) => (
                  <button
                    key={date}
                    onClick={() => setAppointment({ ...appointment, date })}
                    className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all border ${
                      appointment.date === date 
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20" 
                        : "bg-card border-border/50 text-foreground"
                    }`}
                  >
                    {date}
                  </button>
                ))}
                <button
                  className="flex-1 py-4 rounded-2xl font-bold text-sm bg-card border border-border/50 text-foreground flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Pick
                </button>
              </div>

              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Select Time Slot</p>
              <div className="space-y-3">
                {["Morning (8 AM - 12 PM)", "Afternoon (12 PM - 4 PM)", "Evening (4 PM - 8 PM)"].map((slot) => {
                  const isSelected = appointment.timeSlot === slot;
                  return (
                    <div
                      key={slot}
                      onClick={() => setAppointment({ ...appointment, timeSlot: slot })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-card border-border/50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-blue-600" : "bg-muted"}`}>
                        <Clock className={`w-5 h-5 ${isSelected ? "text-white" : "text-foreground/50"}`} />
                      </div>
                      <span className={`text-sm font-bold ${isSelected ? "text-blue-900" : "text-foreground"}`}>{slot}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10">
                <button
                  onClick={() => setStep("DETAILS")}
                  disabled={!appointment.timeSlot}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Continue to Patient Details
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PATIENT DETAILS */}
          {step === "DETAILS" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h2 className="text-xl font-black mb-6">Patient Information</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Full Name</label>
                  <Input 
                    placeholder="Enter patient's name"
                    value={patient.name}
                    onChange={(e) => setPatient({...patient, name: e.target.value})}
                    className="h-14 bg-card rounded-2xl"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Age</label>
                    <Input 
                      type="number"
                      placeholder="e.g. 45"
                      value={patient.age}
                      onChange={(e) => setPatient({...patient, age: e.target.value})}
                      className="h-14 bg-card rounded-2xl"
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Gender</label>
                    <div className="flex gap-2">
                      {["Male", "Female"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setPatient({...patient, gender: g})}
                          className={`flex-1 h-14 rounded-2xl font-bold text-sm transition-colors border ${patient.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-card border-border/50 text-foreground"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Mobile Number</label>
                  <Input 
                    type="tel"
                    placeholder="For tracking & updates"
                    value={patient.mobile}
                    onChange={(e) => setPatient({...patient, mobile: e.target.value})}
                    className="h-14 bg-card rounded-2xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">Optional Notes</label>
                  <Textarea 
                    placeholder="e.g., High BP history, feels dizzy"
                    value={patient.notes}
                    onChange={(e) => setPatient({...patient, notes: e.target.value})}
                    className="min-h-[100px] bg-card rounded-2xl resize-none"
                  />
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={progressToSummary}
                  disabled={!patient.name || !patient.age || !patient.gender || !patient.mobile}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Review Booking
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SUMMARY */}
          {step === "SUMMARY" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              <h2 className="text-xl font-black mb-6">Booking Summary</h2>
              
              <div className="bg-card border border-border/50 rounded-3xl p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-4 mb-5 pb-5 border-b border-border/40">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <HeartPulse className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-foreground mb-1">Home BP Check</h3>
                    <p className="text-xs font-medium text-muted-foreground">Certified Medical Staff</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">{patient.name}</span>
                      <span className="block text-[11px] font-medium text-muted-foreground">{patient.age} yrs • {patient.gender} • {patient.mobile}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">{appointment.date}</span>
                      <span className="block text-[11px] font-medium text-muted-foreground">{appointment.timeSlot}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-foreground">Visit Address</span>
                      <span className="block text-[11px] font-medium text-muted-foreground leading-relaxed">{selectedAddress?.fullAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill Details */}
              <div className="bg-card border border-border/50 rounded-3xl p-5 mb-6 shadow-sm">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-muted-foreground mb-4">Payment Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Visit Charge</span>
                    <span className="font-bold text-foreground">₹299</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Convenience Fee</span>
                    <span className="font-bold text-success">Free</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-border/40">
                    <span className="font-black text-foreground">Total Amount</span>
                    <span className="font-black text-blue-600 text-lg">₹299</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handlePayment}
                  className="w-full bg-blue-600 text-white py-4.5 rounded-2xl font-black text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Proceed to Pay ₹299
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: SUCCESS SCREEN */}
          {step === "SUCCESS" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 h-[100dvh] flex flex-col bg-blue-600 text-white relative overflow-hidden"
            >
              {/* Confetti / background effects */}
              <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-40 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

              <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
                  <CheckCircle2 className="w-12 h-12 text-blue-600" />
                </div>
                
                <h1 className="text-3xl font-black tracking-tight text-center mb-2">
                  Booking Confirmed!
                </h1>
                <p className="text-blue-100 font-medium text-center mb-10 max-w-[280px]">
                  Your Home BP Check has been scheduled successfully.
                </p>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 w-full border border-white/20">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/20">
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Booking ID</span>
                    <span className="font-black">#HS-BP-8821</span>
                  </div>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <Clock className="w-5 h-5 text-blue-200 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5">Expected Arrival</span>
                      <span className="block font-black">{appointment.date}, {appointment.timeSlot.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <User className="w-5 h-5 text-blue-200 mt-0.5" />
                    <div>
                      <span className="block text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5">Assigned Staff</span>
                      <span className="block font-black text-sm">Assigning shortly...</span>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-3 mt-10">
                  <button className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black text-[13px] shadow-xl active:scale-[0.98] transition-transform">
                    Track Booking Live
                  </button>
                  <div className="flex gap-3">
                    <button className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl font-bold text-[13px] border border-white/20 active:scale-[0.98] transition-transform">
                      Reschedule
                    </button>
                    <button className="flex-1 bg-white/10 text-white py-3.5 rounded-2xl font-bold text-[13px] border border-white/20 active:scale-[0.98] transition-transform">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Disclaimer on Summary Screen */}
      {step === "SUMMARY" && (
        <div className="px-4 pb-8">
           <div className="mt-2 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-[10px] text-blue-900/70 font-medium leading-relaxed">
                <span className="font-bold text-blue-900">Medical Disclaimer:</span> This service includes an in-person blood pressure measurement by a trained healthcare professional using a calibrated digital BP monitor. The result is for health assessment and should not replace professional medical advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

export default BPCheckScreen;
