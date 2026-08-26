import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UploadCloud, File, X, PhoneCall, CheckCircle2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { toast } from "sonner";
import { TermsConsent } from "@/components/TermsConsent";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitTicket } from "@/hooks/useBridgeTickets";
import {
  uploadSupportPrescription,
  validateSupportPrescription,
} from "@/lib/support-prescription";

const UploadPrescriptionScreen = () => {
  const navigate = useNavigate();
  const { supabaseUserId } = useAuth();
  const submitTicket = useSubmitTicket();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    const error = validateSupportPrescription(picked);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(picked);
  };

  const removeFile = () => setFile(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a prescription image or PDF first.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Please provide your name and phone number.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (!supabaseUserId) {
      toast.error("Please log in to send your prescription to our support team.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Store the file privately and mint a shareable link for the support desk.
      const uploaded = await uploadSupportPrescription(file, supabaseUserId);

      // 2. Raise a Help & Support ticket in the Admin portal (never a lab order).
      const result: any = await submitTicket.mutateAsync({
        category: "other",
        priority: "high",
        subject: "Prescription upload — call back requested",
        description: [
          "Source: BloodLyn app — Home screen \"Upload Prescription & Get a Call\"",
          `Patient name: ${name.trim()}`,
          `Callback number: +91 ${phone.replace(/\D/g, "").slice(-10)}`,
          `Prescription file: ${uploaded.name}`,
          `Prescription link (valid 1 year): ${uploaded.url}`,
          "Action needed: review the prescription and call the patient to arrange the tests.",
        ].join("\n"),
      });

      setTicketNumber(result?.ticket_number || result?.ticket?.ticket_number || null);
      setIsSuccess(true);
      toast.success("Request sent to our support team!");
    } catch (err: any) {
      console.error("Prescription call request failed:", err);
      toast.error(err?.message || "Could not send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isSuccess) {
    return (
      <div className="relative bg-background min-h-screen flex flex-col">
        <MobileLayout>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle2 className="w-12 h-12 text-success" />
            </motion.div>
            <h2 className="text-2xl font-black text-foreground mb-3">Request Received!</h2>
            <p className="text-muted-foreground font-medium mb-4 leading-relaxed">
              We've successfully received your prescription. Our support team will call you shortly at <span className="font-bold text-foreground">+91 {phone.replace(/\D/g, "").slice(-10)}</span> to arrange the tests.
            </p>
            {ticketNumber && (
              <p className="text-xs font-bold text-muted-foreground mb-8">
                Reference: <span className="text-foreground">{ticketNumber}</span>
              </p>
            )}
            {!ticketNumber && <div className="mb-8" />}

            <button
              onClick={() => navigate("/home")}
              className="w-full bg-primary text-white font-bold h-14 rounded-2xl active:scale-95 transition-transform"
            >
              Back to Home
            </button>
          </div>
        </MobileLayout>
      </div>
    );
  }

  return (
    <div className="relative bg-background min-h-screen flex flex-col">
      <MobileLayout>
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-[17px] font-black text-foreground leading-tight">Upload Prescription</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">We'll call you back</p>
          </div>
        </div>

        <div className="px-5 pt-6 pb-24">
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-foreground mb-2">
              Let us read it for you
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Simply upload a picture of your prescription and provide your contact details. Our healthcare experts will guide you through the next steps.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload Area */}
            <div className="space-y-3">
              <label className="text-[13px] font-black uppercase tracking-wider text-muted-foreground ml-1">
                Prescription File
              </label>
              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.label
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-primary/30 rounded-3xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      <UploadCloud className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-[15px] font-bold text-foreground mb-1">Tap to upload image</p>
                    <p className="text-xs font-medium text-muted-foreground">JPG, PNG or PDF (Max 5MB)</p>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </motion.label>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center p-4 bg-muted/30 border border-border/50 rounded-2xl"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mr-4">
                      <File className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-destructive/10 text-destructive active:scale-95 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Contact Details */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-lg font-black text-foreground">Contact Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs font-bold text-muted-foreground ml-1">
                    Patient Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-14 bg-muted/50 border border-border/50 rounded-2xl px-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-xs font-bold text-muted-foreground ml-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[15px]">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      enterKeyHint="done"
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      className="w-full h-14 bg-muted/50 border border-border/50 rounded-2xl pl-12 pr-4 text-[15px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/60 tracking-wider"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <TermsConsent checked={acceptedTerms} onCheckedChange={setAcceptedTerms} />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={!acceptedTerms || isSubmitting}
                className="w-full relative h-14 bg-primary text-white rounded-2xl font-bold text-[16px] flex items-center justify-center shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none overflow-hidden group"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <PhoneCall className="w-5 h-5 mr-2" />
                    <span>Request a Call</span>
                    <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-active:translate-y-0 transition-transform duration-200" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </MobileLayout>
    </div>
  );
};

export default UploadPrescriptionScreen;
