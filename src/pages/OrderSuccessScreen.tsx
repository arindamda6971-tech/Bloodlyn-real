import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowRight, Building2, Check, Copy, FlaskConical, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { HeroCheck, HeroDecor } from "@/components/booking/BookingHero";
import { BOOKING_BUTTON_BG, BOOKING_HERO_BG } from "@/lib/booking-theme";
import { formatINR, formatPassDate, formatTimeWindow, relativeDayPhrase, testSampleLine } from "@/lib/booking-format";
import { simplifyTestName } from "@/utils/simplify-test-name";

interface BookingState {
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    familyMemberId?: string;
    packageId?: string;
    labId?: string;
    labName?: string;
    vendorId?: string;
    category?: string;
    sampleType?: string;
    fastingRequired?: boolean;
    fastingInstruction?: string;
  }>;
  addressId: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  subtotal: number;
  couponApplied?: boolean;
  discount?: number;
  platformFee?: number;
  collectionFee?: number;
  total?: number;
  selectedPayment?: string;
  selectedPaymentName?: string;
  paymentVerified?: boolean;
  patientName?: string;
  patientAge?: number | string;
  patientGender?: string | null;
  patientPhone?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  selectedLabName?: string;
  selectedLabId?: string;
  orderAddressString?: string;
}

/** "8575575757" → "85755 75757" */
const formatPhone = (phone?: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
};

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const DetailRow = ({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <div className="text-[14px] font-semibold leading-snug text-foreground">{children}</div>
    </div>
  </div>
);

const BillRow = ({ label, value, valueClass = "text-foreground" }: { label: string; value: string; valueClass?: string }) => (
  <div className="flex justify-between gap-4 text-[13px]">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium tabular-nums ${valueClass}`}>{value}</span>
  </div>
);

const CARD = "rounded-3xl bg-card p-5 shadow-[0_16px_40px_-22px_hsl(215_50%_15%/0.35)] dark:ring-1 dark:ring-white/5";

const OrderSuccessScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingState = location.state as BookingState | undefined;

  const orderId = bookingState?.orderId ?? null;
  const orderNumber = bookingState?.orderNumber ?? null;
  const [fetchedAddress, setFetchedAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingState?.paymentVerified || !orderId) {
      navigate("/bookings", { replace: true });
    }
  }, [bookingState?.paymentVerified, orderId, navigate]);

  useEffect(() => {
    // If we already have the string from the payload, no need to fetch
    if (bookingState?.orderAddressString) return;

    if (bookingState?.addressId) {
      const addressId = bookingState.addressId;
      const fetchAddress = async () => {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase.from("addresses").select("*").eq("id", addressId).maybeSingle();
          if (data) {
            const str = [data.address_line1, data.address_line2, data.city, data.state, data.pincode].filter(Boolean).join(", ");
            setFetchedAddress(str);
          }
        } catch (err) {
          console.error("Failed to fetch address:", err);
        }
      };
      fetchAddress();
    }
  }, [bookingState?.addressId, bookingState?.orderAddressString]);

  const displayAddress = bookingState?.orderAddressString || fetchedAddress;
  const displayOrderNumber = orderNumber || orderId?.slice(0, 8).toUpperCase() || "";
  const labName = bookingState?.selectedLabName || null;
  const timeText = formatTimeWindow(bookingState?.scheduledTimeSlot);
  const dayPhrase = relativeDayPhrase(bookingState?.scheduledDate);
  const items = bookingState?.cartItems ?? [];
  const testCount = items.reduce((n, item) => n + (item.quantity || 1), 0);
  const payLater = bookingState?.selectedPayment === "cod" || /after|collection|cash/i.test(bookingState?.selectedPaymentName ?? "");

  // "today, 2 – 4 PM" / "on Saturday, 2 – 4 PM"; falls back to the plain date.
  const whenLine = [dayPhrase ?? formatPassDate(bookingState?.scheduledDate), timeText].filter(Boolean).join(", ");

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(displayOrderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy the order ID");
    }
  };

  return (
    <MobileLayout showNav={false} showFloatingAdd={false}>
      <MotionConfig reducedMotion="user">
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-muted/60 dark:bg-background">
          {/* Hero */}
          <header
            className="relative overflow-hidden px-6 pb-24 text-white"
            style={{ ...BOOKING_HERO_BG, paddingTop: "calc(max(var(--sat), 12px) + 36px)" }}
          >
            <HeroDecor />
            <div className="relative">
              <HeroCheck />
              <motion.p {...rise(0.2)} className="mt-6 text-[14px] font-medium text-white/75">
                Booking confirmed
              </motion.p>
              <motion.h1 {...rise(0.28)} className="mt-1 text-[28px] font-bold leading-[1.15] tracking-tight">
                Sample collection
                {whenLine && (
                  <>
                    <br />
                    {whenLine}
                  </>
                )}
              </motion.h1>
              {displayOrderNumber && (
                <motion.button
                  {...rise(0.36)}
                  type="button"
                  onClick={copyOrderNumber}
                  className="-ml-1.5 mt-3 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[13px] text-white/70 active:bg-white/10"
                  aria-label={`Copy order ID ${displayOrderNumber}`}
                >
                  Order <span className="tabular-nums text-white/90">{displayOrderNumber}</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied ? "done" : "copy"}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </header>

          <div className="relative -mt-14 flex flex-col gap-3 px-4 pb-6">
            {/* Booking details */}
            <motion.section {...rise(0.4)} className={CARD}>
              {labName && (
                <DetailRow icon={Building2} label="Lab">
                  {labName}
                </DetailRow>
              )}
              {bookingState?.patientName && (
                <DetailRow icon={User} label="Patient">
                  {bookingState.patientName}
                  {bookingState.patientPhone && <span className="tabular-nums"> · {formatPhone(bookingState.patientPhone)}</span>}
                </DetailRow>
              )}
              {displayAddress && (
                <DetailRow icon={MapPin} label="Address">
                  {displayAddress}
                </DetailRow>
              )}
            </motion.section>

            {/* Tests + bill */}
            <motion.section {...rise(0.5)} className={CARD}>
              {items.length > 0 && (
                <>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {items.length > 1 ? `Tests booked (${items.length})` : "Test booked"}
                  </p>
                  <ul className="mt-1">
                    {items.map((item) => {
                      const meta = testSampleLine(item);
                      return (
                        <li key={item.id} className="flex items-start justify-between gap-4 pt-3">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0841D4]/[0.08] dark:bg-white/[0.06]">
                              <FlaskConical className="h-4 w-4 text-[#0841D4] dark:text-[#46B2FF]" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold leading-snug text-foreground">
                                {simplifyTestName(item.name)}
                                {(item.quantity || 1) > 1 && <span className="font-medium text-muted-foreground"> × {item.quantity}</span>}
                              </p>
                              {meta && <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{meta}</p>}
                            </div>
                          </div>
                          <p className="shrink-0 text-[14px] font-semibold tabular-nums text-foreground">
                            {formatINR(item.price * (item.quantity || 1))}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 border-t border-dashed border-border" />
                </>
              )}

              <div className="space-y-1.5 pt-4">
                {bookingState?.subtotal != null && <BillRow label={`Tests (${testCount})`} value={formatINR(bookingState.subtotal)} />}
                {(bookingState?.discount ?? 0) > 0 && (
                  <BillRow
                    label="Discount"
                    value={`− ${formatINR(bookingState?.discount ?? 0)}`}
                    valueClass="text-emerald-600 dark:text-emerald-400"
                  />
                )}
                <BillRow
                  label="Home collection"
                  value={bookingState?.collectionFee ? formatINR(bookingState.collectionFee) : "Free"}
                  valueClass={bookingState?.collectionFee ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"}
                />
                <BillRow label="Platform fee" value={formatINR(bookingState?.platformFee ?? 0)} />
              </div>

              {bookingState?.total != null && (
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">{payLater ? "To pay at collection" : "Amount paid"}</p>
                    {bookingState.selectedPaymentName && (
                      <p className="text-[11px] text-muted-foreground">{bookingState.selectedPaymentName}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-[20px] font-bold tabular-nums text-foreground">{formatINR(bookingState.total)}</p>
                </div>
              )}
            </motion.section>
          </div>

          {/* Actions */}
          <div
            className="sticky bottom-0 z-20 mt-auto border-t border-border/70 bg-card px-4 pt-3"
            style={{ paddingBottom: "max(var(--sab), 8px)" }}
          >
            <Button
              className="h-14 w-full gap-2 rounded-2xl text-[15px] font-semibold text-white hover:opacity-95"
              style={BOOKING_BUTTON_BG}
              onClick={() => navigate(orderId ? `/tracking/${orderId}` : "/bookings")}
            >
              Track booking
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              className="h-11 w-full rounded-2xl text-[14px] font-semibold text-muted-foreground active:bg-muted"
              onClick={() => navigate("/home", { replace: true })}
            >
              Back to home
            </button>
          </div>
        </div>
      </MotionConfig>
    </MobileLayout>
  );
};

export default OrderSuccessScreen;
