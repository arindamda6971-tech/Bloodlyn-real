import { motion } from "framer-motion";
import { Stethoscope, MonitorPlay, ChevronRight } from "lucide-react";

interface ConsultationTypeStepProps {
  onSelect: (type: "offline" | "online") => void;
}

export const ConsultationTypeStep = ({ onSelect }: ConsultationTypeStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-4 mt-6"
    >
      <div className="mb-4">
        <h2 className="text-xl font-black text-foreground tracking-tight">
          How would you like to consult a doctor?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your preferred consultation method.
        </p>
      </div>

      {/* Offline Card */}
      <button
        onClick={() => onSelect("offline")}
        className="text-left group relative p-6 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
        
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-900/20 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/30">
            <Stethoscope className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Visit a Clinic</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Meet a doctor at a nearby clinic or hospital for a physical examination.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </button>

      {/* Online Card */}
      <button
        onClick={() => onSelect("online")}
        className="text-left group relative p-6 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
        
        <div className="flex items-start gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/20 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/30">
            <MonitorPlay className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Online Consultation</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Consult a doctor through video or audio call from the comfort of your home.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
};
