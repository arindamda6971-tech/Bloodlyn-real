import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderStatusTimelineProps {
  status: string | null;
  className?: string;
  isBp?: boolean;
}

const steps = [
  { key: "accepted", label: "Accepted" },
  { key: "collection", label: "Collection" },
  { key: "report", label: "Reports Ready" },
];

const OrderStatusTimeline = ({ status, className, isBp }: OrderStatusTimelineProps) => {
  if (isBp) {
    const normalized = status?.toLowerCase() || "";
    const done = ["completed", "report_ready", "report_delivered", "checked"].includes(normalized);
    const assigned = ["assigned", "partner_assigned", "processing", "out_for_collection"].includes(normalized);
    const accepted = assigned || ["accepted", "collection_pending"].includes(normalized);
    const completedThrough = done ? 3 : assigned ? 2 : accepted ? 1 : 0;
    const vitalSteps = ["Ordered", "Accepted", "Assigned", "Completed"];
    return (
      <div className={cn("flex items-center w-full px-1", className)}>
        {vitalSteps.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
                normalized === "cancelled" ? "bg-muted text-muted-foreground" : index <= completedThrough ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}
              >
                {normalized !== "cancelled" && index <= completedThrough ? <Check className="w-3 h-3" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
              </div>
              <span className="text-[9px] font-bold absolute -bottom-5 whitespace-nowrap text-muted-foreground">{label}</span>
            </div>
            {index < vitalSteps.length - 1 && <div className="flex-1 h-[2px] mx-2 bg-muted overflow-hidden"><div className={cn("h-full bg-success transition-all duration-700", normalized !== "cancelled" && index < completedThrough ? "w-full" : "w-0")} /></div>}
          </div>
        ))}
      </div>
    );
  }

  const getStatusIndex = (currentStatus: string | null) => {
    switch (currentStatus) {
      case "pending":
      case "confirmed":
        return 0;
      case "accepted":
      case "assigned":
      case "partner_assigned":
      case "collection_pending":
      case "out_for_collection":
      case "processing":
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
