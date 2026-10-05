import { Clock, Loader2, Check } from "lucide-react";
import {
  FIXED_COLLECTION_SLOTS,
  isFixedSlotBookable,
  type LabSlotDate,
  type FixedCollectionSlot,
} from "@/lib/lab-slots";
import { hapticSelection } from "@/utils/haptics";
import type { SlotCapacityAvailability } from "@/hooks/useLabSlots";

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
  availabilityByDate?: Record<string, Record<string, SlotCapacityAvailability>>;
}

/* ------------------------------------------------------------------ */
/*  Group fixed slots into First Half (before noon) / Second Half      */
/* ------------------------------------------------------------------ */
const FIRST_HALF_SLOTS = FIXED_COLLECTION_SLOTS.filter(
  (s) => s.startMinutes < 12 * 60
);
const SECOND_HALF_SLOTS = FIXED_COLLECTION_SLOTS.filter(
  (s) => s.startMinutes >= 12 * 60
);

/* ------------------------------------------------------------------ */
/*  Compact slot chip                                                   */
/* ------------------------------------------------------------------ */
const SlotChip = ({
  slot,
  isAvailable,
  isSelected,
  onSelect,
  remaining,
}: {
  slot: FixedCollectionSlot;
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: () => void;
  remaining?: number | null;
}) => (
  <button
    onClick={() => {
      if (!isAvailable) return;
      hapticSelection();
      onSelect();
    }}
    disabled={!isAvailable}
    className={`
      relative px-4 py-3 rounded-xl border text-left transition-all duration-200
      ${
        !isAvailable
          ? "bg-muted/20 border-transparent opacity-40 cursor-not-allowed"
          : isSelected
          ? "bg-primary/8 border-primary shadow-sm ring-1 ring-primary/30"
          : "bg-card border-slate-200/80 hover:border-primary/40 hover:shadow-sm active:scale-[0.97]"
      }
    `}
  >

    <span
      className={`block text-[13px] font-bold leading-tight ${
        !isAvailable
          ? "text-foreground/40 line-through"
          : isSelected
          ? "text-primary"
          : "text-slate-800"
      }`}
    >
      {slot.time}
    </span>
    {remaining !== undefined && remaining !== null && (
      <span className={`block text-[10px] mt-1 font-semibold ${remaining === 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {remaining === 0 ? "Full" : `${remaining} ${remaining === 1 ? "place" : "places"} left`}
      </span>
    )}

  </button>
);

/* ------------------------------------------------------------------ */
/*  Section with label + badge                                          */
/* ------------------------------------------------------------------ */
const SlotSection = ({
  title,
  badge,
  badgeColor,
  slots,
  selectedSlot,
  onSelectSlot,
  selectedIndex,
  slotAvailability,
}: {
  title: string;
  badge: string;
  badgeColor: "green" | "orange" | "red";
  slots: FixedCollectionSlot[];
  selectedSlot: string;
  onSelectSlot: (display: string) => void;
  selectedIndex: number;
  slotAvailability?: Record<string, SlotCapacityAvailability>;
}) => {
  const anyAvailable = slots.some((s) => isFixedSlotBookable(s, selectedIndex) && slotAvailability?.[s.id]?.remaining !== 0);

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all ${
        anyAvailable
          ? "bg-card border-slate-200/70"
          : "bg-muted/20 border-transparent opacity-60"
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-slate-800">{title}</span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            badgeColor === "green"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
              : badgeColor === "red"
              ? "bg-red-50 text-red-500 border border-red-200/60"
              : "bg-orange-50 text-orange-500 border border-orange-200/60"
          }`}
        >
          {badge}
        </span>
      </div>

      {/* Grid of chip buttons */}
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) => {
          const remaining = slotAvailability?.[slot.id]?.remaining;
          const isAvailable = isFixedSlotBookable(slot, selectedIndex) && remaining !== 0;
          const isSelected = selectedSlot === slot.display && isAvailable;
          return (
            <SlotChip
              key={slot.id}
              slot={slot}
              isAvailable={isAvailable}
              isSelected={isSelected}
              onSelect={() => onSelectSlot(slot.display)}
              remaining={remaining}
            />
          );
        })}
      </div>
    </div>
  );
};

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
  availabilityByDate = {},
}: CollectionSlotPickerProps) => {
  const selectedIndex = Math.max(0, dateIds.indexOf(selectedDateId));
  const isClosedOnDate = openByOffset[selectedIndex] === false;
  const slotAvailability = availabilityByDate[dates[selectedIndex]?.fullDate ?? ""];

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
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
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
          <div className="space-y-3">
            {/* First Half — Morning */}
            <SlotSection
              title="First Half"
              badge="(Busy time, so avoid this time slot)"
              badgeColor="red"
              slots={FIRST_HALF_SLOTS}
              selectedSlot={selectedSlot}
              onSelectSlot={onSelectSlot}
              selectedIndex={selectedIndex}
              slotAvailability={slotAvailability}
            />

            {/* Second Half — Afternoon / Evening */}
            <SlotSection
              title="Second Half"
              badge="(If possible, select this time slot)"
              badgeColor="green"
              slots={SECOND_HALF_SLOTS}
              selectedSlot={selectedSlot}
              onSelectSlot={onSelectSlot}
              selectedIndex={selectedIndex}
              slotAvailability={slotAvailability}
            />

            {FIXED_COLLECTION_SLOTS.every(
              (slot) => !isFixedSlotBookable(slot, selectedIndex) || slotAvailability?.[slot.id]?.remaining === 0
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
