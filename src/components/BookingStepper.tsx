import { Check } from "lucide-react";

interface BookingStepperProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { label: "Cart" },
  { label: "Centre Slot" },
  { label: "Payments" },
];

const BookingStepper = ({ currentStep }: BookingStepperProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-success text-success-foreground"
                    : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                  isActive
                    ? "text-primary"
                    : isCompleted
                    ? "text-success"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 mt-[-14px]">
                <div
                  className={`h-0.5 w-full ${
                    isCompleted ? "bg-success" : "border-t-2 border-dashed border-muted-foreground/30"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BookingStepper;
