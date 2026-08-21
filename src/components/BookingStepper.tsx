import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BookingStepperProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { label: "Review Cart Details" },
  { label: "Select Centre Slot" },
  { label: "Checkout & Payment" },
];

const BookingStepper = ({ currentStep }: BookingStepperProps) => {
  const totalSteps = steps.length;
  const currentLabel = steps[currentStep - 1].label;

  return (
    <div className="flex flex-col w-full pb-3">
      <div className="px-5 mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-sm font-black text-foreground">
            Step {currentStep} of {totalSteps}
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
            {currentLabel}
          </p>
        </div>
        
        {/* Privacy Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 hover:bg-emerald-100 transition-colors"
              aria-label="Privacy Information"
            >
              <Lock className="w-4 h-4 text-emerald-600" />
            </button>
          </DialogTrigger>
          <DialogContent className="w-[90%] max-w-md rounded-3xl p-6 border-0 shadow-xl bg-card">
            <DialogHeader>
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-emerald-600" />
              </div>
              <DialogTitle className="text-xl font-black text-center text-foreground mb-2">
                Data Privacy Guaranteed
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-center text-muted-foreground leading-relaxed">
                Your data is secure and it's fully encrypted.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
      <div className="px-5">
        <div className="flex gap-1 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className="bg-blue-600 h-full rounded-full"
            initial={{ width: `${Math.max(5, ((currentStep - 1) / totalSteps) * 100)}%` }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

export default BookingStepper;
