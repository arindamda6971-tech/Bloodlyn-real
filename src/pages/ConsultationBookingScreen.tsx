import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Video, ChevronLeft, Camera, Image, FileText, X, AlertCircle } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PatientPhonePill from "@/components/ui/PatientPhonePill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrescriptionStorage } from "@/hooks/usePrescriptionStorage";

interface Professional {
  id: number;
  name: string;
  specialty: string;
  image: string;
  consultationFee?: number;
  videoCallFee?: number;
  audioCallFee?: number;
  physicalCallFee?: number;
}

type LocationState = {
  type: "video" | "audio" | "physical";
  professional: Professional;
  professionalType: "doctor" | "physiotherapist";
} | null;

// slot generation removed — replaced by prescription upload UI


const ConsultationBookingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || null;

  const [phone, setPhone] = useState("");

  const incomingPatientName = (location.state as any)?.patientName ?? "";
  const incomingPatientAge = (location.state as any)?.patientAge ?? "";
  const incomingPatientGender = (location.state as any)?.patientGender ?? "";
  const passedPatientPhone = (location.state as any)?.patientPhone ?? null;

  const [patientName, setPatientName] = useState<string>(String(incomingPatientName || ""));
  const [patientAge, setPatientAge] = useState<string>(incomingPatientAge ? String(incomingPatientAge) : "");
  const [patientGender, setPatientGender] = useState<string>(String(incomingPatientGender || ""));
  const [patientPhone, setPatientPhone] = useState<string>(passedPatientPhone ? String(passedPatientPhone) : "");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { prescription, savePrescription, deletePrescription } = usePrescriptionStorage();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { supabaseUserId } = useAuth();
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (prescription?.image_url) setUploadedImage(prescription.image_url);
  }, [prescription]);

  if (!state) return null;

  const { professional, type } = state;

  const isAudio = type === "audio";
  const isPhysical = type === "physical";
  const professionalType = state.professionalType || "doctor";

  const isPatientInfoValid =
    patientName.trim().length > 0 &&
    /^\d{1,3}$/.test(patientAge) &&
    Number(patientAge) > 0 &&
    Number(patientAge) <= 120 &&
    patientGender.trim().length > 0 &&
    (isPhysical ? /^\d{10}$/.test(patientPhone) : true);
  const displayPhone = isAudio ? (phone.trim() || passedPatientPhone) : (isPhysical ? patientPhone : passedPatientPhone); 

  // Determine consultation fee from provided professional object. Support both
  // older `consultationFee` field and newer per-type fees (`videoCallFee`/`audioCallFee`/`physicalCallFee`).
  const consultationFee = professional.consultationFee ?? (isAudio ? professional.audioCallFee : isPhysical ? professional.physicalCallFee : professional.videoCallFee) ?? 0;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size should be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setIsUploading(true);
      const savedUrl = await savePrescription(base64);
      if (savedUrl) {
        setUploadedImage(savedUrl);
        toast.success("Prescription uploaded");
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    await deletePrescription();
    setUploadedImage(null);
  };

  const handleConfirm = () => {
    if (isAudio && phone.trim().length < 6) {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (!isPatientInfoValid) {
      toast.error("Please provide valid patient details");
      return;
    }

    if (!supabaseUserId) {
      toast.error("Please login to book a consultation");
      navigate("/login");
      return;
    }

    // Pass the consultation as a single cart item so the Payment -> Tracking flow
    // can process the booking (subtotal, payment, order creation) consistently.
    setIsBooking(true);
    navigate("/payment", {
      state: {
        cartItems: [
          {
            id: `consult-${professional.id}`,
            name: `${professional.name} Consultation (${isAudio ? "Audio" : isPhysical ? "Physical" : "Video"})`,
            price: consultationFee,
            quantity: 1,
          },
        ],
        addressId: null,
        scheduledDate: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(),
        scheduledTimeSlot: null,
        subtotal: consultationFee,
        bookingType: "consultation",
        professionalId: professional.id,
        professionalName: professional.name,
        consultationMode: isAudio ? "audio" : isPhysical ? "physical" : "video",
        patientName: patientName.trim() || null,
        patientAge: patientAge ? Number(patientAge) : null,
        patientGender: patientGender || null,
        patientPhone: displayPhone || null,
      },
    });
  };

  return (
    <MobileLayout>
      <ScreenHeader title="Schedule Call" showBack={false} />

      <div className="px-4 pb-32">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="soft-card flex items-center gap-4">
            <img src={professional.image} alt={professional.name} className="w-16 h-16 rounded-2xl object-cover"  loading="lazy" decoding="async" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{professional.name}</h3>
              <p className="text-xs text-muted-foreground">{professional.specialty}</p>
              {patientName && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-semibold text-foreground">{patientName}</p>
                  <p className="text-xs text-muted-foreground">Age: {patientAge || 'N/A'} • Gender: {patientGender || 'N/A'}</p>
                </div>
              )}
              {displayPhone && (
                <div className="mt-2">
                  <PatientPhonePill phone={displayPhone} />
                </div>
              )}
            </div>
          </div>

          <div className="soft-card p-4 mt-6 flex items-start gap-3 bg-amber-700/5 border-amber-300/20">
            <AlertCircle className="w-5 h-5 text-warning mt-1" />
            <div>
              <p className="font-semibold text-foreground">
                {professionalType === "doctor" ? "Doctor will call you shortly" : "Physiotherapist will call you shortly"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Keep your network connection active.</p>
            </div>
          </div>

          {/* Patient details */}
          <div className="mt-4 p-4 rounded-2xl bg-muted/50 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Patient details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="patient_name">Patient name</Label>
                <Input
                  id="patient_name"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  aria-label="Patient name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_age">Age</Label>
                <Input
                  id="patient_age"
                  placeholder="e.g. 35"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value.replace(/[^0-9]/g, ""))}
                  aria-label="Patient age"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_gender">Gender</Label>
                <Select value={patientGender} onValueChange={(value) => setPatientGender(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isPhysical && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="patient_phone">Phone number</Label>
                  <Input
                    id="patient_phone"
                    placeholder="10-digit mobile number"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    aria-label="Patient phone"
                    maxLength={10}
                  />
                </div>
              )}
            </div>
            {!isPatientInfoValid && (
              <div className="mt-3 text-xs text-destructive">Please provide a valid patient name, age (1–120), gender{isPhysical ? ', and 10-digit phone number' : ''}.</div>
            )}
          </div>

          <div className="mt-4">
            {!uploadedImage ? (
              <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center bg-muted/30">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Upload prescription (optional)</h4>
                <p className="text-sm text-muted-foreground mb-4">Snap a photo or choose from gallery — this helps the doctor prepare.</p>
              </div>
            ) : (
              <div className="relative mt-2">
                <img src={uploadedImage as string} alt="Prescription" className="w-full rounded-2xl object-cover max-h-56"  loading="lazy" decoding="async" />
                <button onClick={handleRemoveImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
                  <X className="w-4 h-4 text-destructive-foreground" />
                </button>
              </div>
            )}
          </div>

          {isAudio && (
            <div className="mt-6">
              <label htmlFor="phone_number" className="block text-xs text-muted-foreground mb-2">Phone number to call</label>
              <input
                id="phone_number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full py-3 px-4 rounded-xl bg-input border border-border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {professionalType === "doctor" ? "Doctor will call this number for the audio consultation." : "Physiotherapist will call this number for the audio consultation."}
              </p>
            </div>
          )}

          <div className="mt-8">
            <Button className="w-full rounded-xl" onClick={handleConfirm} size="lg" disabled={isBooking || !isPatientInfoValid || (isAudio && phone.trim().length < 6)}>
              {isBooking ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default ConsultationBookingScreen;
