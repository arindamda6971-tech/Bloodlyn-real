import { Doctor } from "@/types/consultation";
import { Star, Clock, Award, Video, Phone, MapPin, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctor: Doctor, type: "video" | "audio" | "physical") => void;
  allowedTypes?: Array<"video" | "audio" | "physical">;
  delay?: number;
}

export const DoctorCard = ({ doctor, onBook, allowedTypes = ["video", "audio", "physical"], delay = 0 }: DoctorCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-border/50 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
    >
      {/* Doctor Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden relative">
          {doctor.image ? (
            <img loading="lazy" decoding="async" width={56} height={56} src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
          ) : (
            <Stethoscope className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground text-base tracking-tight truncate group-hover:text-primary transition-colors">
            {doctor.name}
          </h4>
          <p className="text-xs font-semibold text-primary line-clamp-1 mt-0.5">{doctor.specialty}</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">{doctor.qualification}</p>
        </div>
      </div>

      {/* Doctor Details Grid */}
      <div className="grid grid-cols-3 gap-2 py-3.5 bg-muted/30 rounded-2xl border border-border/60 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{doctor.experience}y</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Experience</p>
        </div>
        <div className="text-center border-l border-r border-border/60">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-foreground">{doctor.rating}</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">({doctor.reviews})</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Next Slot</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1 truncate px-1">
            {doctor.nextSlot}
          </p>
        </div>
      </div>

      {/* Treated Symptoms Tags */}
      {doctor.treated_symptoms && doctor.treated_symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {doctor.treated_symptoms.slice(0, 4).map((sym, idx) => (
            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {sym}
            </span>
          ))}
          {doctor.treated_symptoms.length > 4 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              +{doctor.treated_symptoms.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Booking Actions */}
      <div className={`grid gap-2.5 ${allowedTypes.length === 3 ? "grid-cols-3" : allowedTypes.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {allowedTypes.includes("video") && (
          <button
            onClick={() => onBook(doctor, "video")}
            disabled={!doctor.available}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 border border-blue-200/50 dark:border-blue-800/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
            <span className="text-[11px] font-bold text-foreground mb-1">Video</span>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">₹{doctor.videoCallFee}</span>
          </button>
        )}
        
        {allowedTypes.includes("audio") && (
          <button
            onClick={() => onBook(doctor, "audio")}
            disabled={!doctor.available}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 border border-indigo-200/50 dark:border-indigo-800/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
            <span className="text-[11px] font-bold text-foreground mb-1">Audio</span>
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">₹{doctor.audioCallFee}</span>
          </button>
        )}

        {allowedTypes.includes("physical") && (
          <button
            onClick={() => onBook(doctor, "physical")}
            disabled={!doctor.available}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
            <span className="text-[11px] font-bold text-foreground mb-1">Clinic</span>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">₹{doctor.physicalCallFee}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
