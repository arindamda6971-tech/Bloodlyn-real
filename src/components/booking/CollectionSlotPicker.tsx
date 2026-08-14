import { Clock, Loader2 } from "lucide-react";
import {
  FIXED_COLLECTION_SLOTS,
  isFixedSlotBookable,
  type LabSlotDate,
} from "@/lib/lab-slots";
import { hapticSelection } from "@/utils/haptics";

interface CollectionSlotPickerProps {
  /** 3-day strip built in the lab timezone (today, tomorrow, day after). */
  dates: LabSlotDate[];
  /** Stable ids used by the host screen for each offset, e.g. ["Today","Tomorrow","DayAfter"]. */
  dateIds: string[];
  selectedDateId: string;
  onSelectDate: (dateId: string) => void;
  /** Open/closed per offset, resolved from the Partner dashboard schedule. */
  openByOffset: boolean[];
  isLoading?: boolean;
  hasLab?: boolean;
  /** Currently selected slot `display` value. */
  selectedSlot: string;
  onSelectSlot: (display: string) => void;
}

/**
 * Exact same date + time-slot selection interface the blood-test booking flow
 * uses (LabSelectionScreen), shared by the ECG and BP booking flows.
 */
const CollectionSlotPicker = ({
  dates,
  dateIds,
  selectedDateId,
  onSelectDate,
  openByOffset,
  isLoading = false,
  hasLab = true,
  selectedSlot,
  onSelectSlot,
}: CollectionSlotPickerProps) => {
  const selectedIndex = Math.max(0, dateIds.indexOf(selectedDateId));
  const isClosedOnDate = openByOffset[selectedIndex] === false;

  return (
    <>
      {/* Date Selection */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-2">Select Date</h2>
        <div className="flex gap-2">
          {dates.map((date, index) => {
            const isOpen = openByOffset[index] !== false;
            const isSelected = selectedIndex === index;
            return (
              <button
                key={date.fullDate}
                onClick={() => {
                  if (!isOpen) return;
                  hapticSelection();
                  onSelectDate(dateIds[index]);
                }}
                disabled={!isOpen}
                className={`flex-1 py-3 rounded-xl text-center transition-all ${
                  !isOpen
                    ? "bg-muted/50 text-muted-foreground opacity-60"
                    : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                <p className="text-xs font-bold">
                  {date.date} {date.month}
                </p>
                <p className="text-[10px] mt-0.5">
                  {index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.day}
                </p>
                <p
                  className={`text-[9px] mt-0.5 ${
                    !isOpen
                      ? "text-destructive"
                      : isSelected
                      ? "text-primary-foreground/80"
                      : "text-success"
                  }`}
                >
                  {isOpen ? "Available" : "Closed"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      <div className="mt-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          SELECT TIME SLOT
        </h2>

        {!hasLab ? (
          <p className="text-sm text-muted-foreground">
            Select a center to see available time slots.
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
          </div>
        ) : isClosedOnDate ? (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Lab is closed on this day</p>
            <p className="text-xs text-muted-foreground mt-1">Please pick a different date.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {FIXED_COLLECTION_SLOTS.map((slot) => {
              const isAvailable = isFixedSlotBookable(slot, selectedIndex);
              const isSelected = selectedSlot === slot.display && isAvailable;
              return (
                <button
                  key={slot.id}
                  onClick={() => {
                    if (!isAvailable) return;
                    hapticSelection();
                    onSelectSlot(slot.display);
                  }}
                  disabled={!isAvailable}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center gap-3 text-left ${
                    !isAvailable
                      ? "bg-muted/30 border-transparent opacity-50 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-slate-200/80 hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      !isAvailable
                        ? "bg-muted/50"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100/90 text-slate-600"
                    }`}
                  >
                    <Clock className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block text-[14px] font-bold ${
                        !isAvailable ? "text-foreground/50 line-through" : "text-slate-800"
                      }`}
                    >
                      {slot.label} · {slot.time}
                    </span>
                    <span className="block text-[10px] font-medium text-muted-foreground truncate">
                      {isAvailable ? slot.note : "Too late — needs 1 hour lead time"}
                    </span>
                  </div>
                </button>
              );
            })}

            {FIXED_COLLECTION_SLOTS.every(
              (slot) => !isFixedSlotBookable(slot, selectedIndex)
            ) && (
              <p className="text-xs text-muted-foreground pt-1">
                All of today's slots have passed. Please book for tomorrow.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CollectionSlotPicker;
