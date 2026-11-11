/**
 * Doctor consultations are booked for a day, not a time: today ("as soon as possible")
 * or one of the next two days. The doctor sees every booking for the day and stops new
 * ones by switching off "Accepting consultations".
 */
export const BOOKING_DAYS = 3;
const IST_MS = 330 * 60_000;

export interface BookingDay {
  date: string; // YYYY-MM-DD, India
  top: string; // "Today", "Tomorrow", "Fri"
  day: string; // "12"
  month: string; // "Nov"
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today and the next two days, in India time. */
export function bookingDays(now = new Date()): BookingDay[] {
  const todayIst = new Date(now.getTime() + IST_MS);
  const base = Date.UTC(todayIst.getUTCFullYear(), todayIst.getUTCMonth(), todayIst.getUTCDate());
  return Array.from({ length: BOOKING_DAYS }, (_, i) => {
    const d = new Date(base + i * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAYS[d.getUTCDay()],
      day: String(d.getUTCDate()),
      month: MONTHS[d.getUTCMonth()],
    };
  });
}

/** What the booking says instead of a time. */
export const bookingWhen = (isToday: boolean) => (isToday ? "As soon as possible" : "Any time that day");
