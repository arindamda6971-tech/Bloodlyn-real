import { motion } from "framer-motion";

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
      <div className="px-5 mb-2">
        <h1 className="text-sm font-black text-foreground">
          Step {currentStep} of {totalSteps}
        </h1>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
          {currentLabel}
        </p>
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
