import { motion } from "framer-motion";

interface BookingStepperProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { label: "Cart" },
  { label: "Centre Slot" },
  { label: "Payments" },
];

const BookingStepper = ({ currentStep }: BookingStepperProps) => {
  const totalSteps = steps.length;

  return (
    <div className="px-5 py-3">
      <div className="flex justify-between mb-2 px-1">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          
          return (
            <span
              key={step.label}
              className={`text-[11px] font-bold ${
                isActive
                  ? "text-primary"
                  : isCompleted
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
      
      <div className="flex h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className="bg-primary h-full rounded-full"
          initial={{ width: `${((currentStep - 1) / totalSteps) * 100}%` }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ ease: "easeInOut", duration: 0.3 }}
        />
      </div>
    </div>
  );
};

export default BookingStepper;
