import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderStatusTimelineProps {
  status: string | null;
  className?: string;
  isBp?: boolean;
}

const steps = [
  { key: "accepted", label: "Accepted" },
  { key: "assigned", label: "Assigned" },
  { key: "sample", label: "Collected" },
  { key: "report", label: "Report" },
];

const OrderStatusTimeline = ({ status, className, isBp }: OrderStatusTimelineProps) => {
  if (isBp) {
    const isDone = ["completed", "report_ready", "report_delivered", "checked"].includes(status?.toLowerCase() || "");
    return (
      <div className={cn("flex items-center justify-between w-full px-2 py-1", className)}>
        {/* Ordered */}
        <div className="flex items-center">
          <div className="flex flex-col items-center relative">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-black mt-1.5 absolute -bottom-5 text-blue-600 dark:text-blue-400 tracking-wide whitespace-nowrap">
              Ordered
            </span>
          </div>
        </div>

        {/* Connecting line ------------------ */}
        <div className="flex-1 mx-3 flex items-center justify-center relative">
          <div className="w-full h-[3px] bg-muted/60 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700 ease-in-out",
                isDone ? "w-full" : "w-1/2 animate-pulse"
              )}
            />
          </div>
        </div>

        {/* Checked */}
        <div className="flex items-center">
          <div className="flex flex-col items-center relative">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
                isDone
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                  : "bg-muted text-muted-foreground/50 ring-2 ring-border/50"
              )}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span
              className={cn(
                "text-[11px] font-black mt-1.5 absolute -bottom-5 tracking-wide whitespace-nowrap transition-colors",
                isDone ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
              )}
            >
              Checked
            </span>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIndex = (currentStatus: string | null) => {
    switch (currentStatus) {
      case "pending":
      case "confirmed":
        return 0;
      case "accepted":
      case "processing":
      case "assigned":
      case "out_for_collection":
        return 1;
      case "sample_collected":
      case "in_progress":
      case "collection_complete":
      case "sample_received":
      case "lab_processing":
        return 2;
      case "report_ready":
      case "report_delivered":
      case "completed":
        return 3;
      default:
        return -1;
    }
  };

  const currentIndex = getStatusIndex(status);

  return (
    <div className={cn("flex items-center justify-between w-full px-1", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted ? "bg-success text-white" :
                  isCurrent ? "bg-primary ring-4 ring-primary/20 text-white" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : (
                  <div className={cn("w-1.5 h-1.5 rounded-full", isCurrent ? "bg-white" : "bg-muted-foreground/40")} />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-bold mt-1.5 absolute -bottom-5 whitespace-nowrap transition-colors",
                isCurrent ? "text-primary" : "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="flex-1 h-[2px] mx-2 bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full bg-success transition-all duration-700 ease-in-out",
                    isCompleted ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatusTimeline;
