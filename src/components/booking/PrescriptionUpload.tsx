import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { FileText, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  clearStoredPrescription,
  deletePrescription,
  setStoredPrescription,
  uploadPrescription,
  validatePrescriptionFile,
  type StoredPrescription,
} from "@/lib/order-prescription";

export interface PrescriptionUploadHandle {
  /** Open the file picker, for when the patient tries to continue without one. */
  pick: () => void;
}

interface Props {
  value: StoredPrescription | null;
  onChange: (value: StoredPrescription | null) => void;
  userId?: string | null;
  /** Tests that need a prescription at this lab. Empty means it's optional. */
  requiredFor?: string[];
  className?: string;
}

/** Attach a prescription to this booking: optional, or required by the lab for certain tests. */
export const PrescriptionUpload = forwardRef<PrescriptionUploadHandle, Props>(
  ({ value, onChange, userId, requiredFor = [], className = "" }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const required = requiredFor.length > 0;
    const missing = required && !value;

    useImperativeHandle(ref, () => ({ pick: () => inputRef.current?.click() }), []);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!userId) {
        toast.error("Please login to attach a prescription");
        return;
      }
      const validationError = validatePrescriptionFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setUploading(true);
      try {
        const uploaded = await uploadPrescription(file, userId);
        onChange(uploaded);
        setStoredPrescription(uploaded);
        toast.success("Prescription attached");
      } catch (err: any) {
        console.error("Prescription upload failed:", err);
        toast.error(err?.message || "Could not upload the prescription. Please try again.");
      } finally {
        setUploading(false);
      }
    };

    const handleRemove = () => {
      if (value?.path) deletePrescription(value.path);
      onChange(null);
      clearStoredPrescription();
    };

    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          className="hidden"
          onChange={handleFile}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label={value ? `Prescription attached: ${value.name}` : "Upload prescription"}
          onClick={() => { if (!value && !uploading) inputRef.current?.click(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !value && !uploading) inputRef.current?.click(); }}
          className={`bg-card rounded-2xl border shadow-sm p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform ${
            missing ? "border-destructive/60" : "border-border/70"
          }`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${missing ? "bg-destructive/10" : "bg-primary/10"}`}>
            {uploading ? (
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : value ? (
              <FileText className="w-5 h-5 text-primary" />
            ) : (
              <UploadCloud className={`w-5 h-5 ${missing ? "text-destructive" : "text-primary"}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${missing ? "text-destructive" : "text-muted-foreground"}`}>
              {value ? "Attached" : required ? "Required" : "Optional"}
            </p>
            <h3 className="text-sm font-extrabold text-foreground truncate">
              {uploading ? "Uploading…" : value ? value.name : "Upload Prescription"}
            </h3>
            {value ? (
              <p className="text-[11px] font-semibold text-muted-foreground">
                {(value.size / 1024 / 1024).toFixed(2)} MB · shared with the lab
              </p>
            ) : required ? (
              <p className="text-[11px] font-semibold text-muted-foreground line-clamp-2">
                The lab needs a doctor's prescription for {requiredFor.join(", ")}
              </p>
            ) : null}
          </div>
          {value ? (
            <button
              type="button"
              aria-label="Remove prescription"
              onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${missing ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary"}`}>
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    );
  },
);

PrescriptionUpload.displayName = "PrescriptionUpload";
