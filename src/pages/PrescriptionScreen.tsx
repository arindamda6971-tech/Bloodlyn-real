import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { FlaskConical, ShoppingCart } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { useDoctor } from "@/hooks/useDoctors";
import { useCart } from "@/contexts/CartContext";
import { useSEO } from "@/hooks/useSEO";
import { consultInfo } from "@/lib/doctor-orders";
import { medicineLine, prescriptionOf, testTitle } from "@/lib/prescription";
import { simplifyTestName } from "@/utils/simplify-test-name";
import { labCartItems, type PrescriptionLabOption } from "@/lib/prescriptionLabs";
import { PrescriptionLabSheet } from "@/components/prescriptions/PrescriptionLabSheet";
import { toast } from "sonner";

/** One part of the prescription sheet: a small heading and what the doctor wrote. */
function SheetPart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

/** "Reg. No. 12345 (West Bengal Medical Council)", the way the server writes it on new prescriptions. */
const registrationLine = (d: { registrationNumber?: string; medicalCouncil?: string } | null | undefined) =>
  d?.registrationNumber ? `Reg. No. ${d.registrationNumber}${d.medicalCouncil ? ` (${d.medicalCouncil})` : ""}` : "";

/** "Dr Ar Das" stays as it is; "Ar Das" becomes "Dr. Ar Das". */
const withDr = (name: string) => (/^dr\.?\s/i.test(name) ? name : `Dr. ${name}`);

/** The doctor's digital prescription, with the advised tests ready to add to the cart. */
const PrescriptionScreen = () => {
  useSEO({ title: "Prescription | BloodLyn", description: "Your doctor's prescription." });
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOrderDetails(orderId);
  const { items, replaceCart } = useCart();
  const [labSheetOpen, setLabSheetOpen] = useState(false);
  /** The lab the patient picked, waiting for them to agree to replace their cart. */
  const [pendingLab, setPendingLab] = useState<PrescriptionLabOption | null>(null);
  const order = data?.order;
  const rx = useMemo(() => prescriptionOf(order), [order]);
  // A prescription sent before registrations were included: take it from the doctor's profile.
  const { doctor: directoryDoctor } = useDoctor(
    rx && !rx.doctor_registration && order?.vendor_id ? String(order.vendor_id) : undefined,
  );

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Prescription" />
        <div className="mt-3 space-y-3 px-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  if (isError || !order || !rx) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Prescription" />
        <div className="px-6 py-20 text-center">
          <p className="font-bold text-foreground">Prescription not found</p>
          <p className="mt-1 text-sm text-muted-foreground">Your doctor hasn't sent a prescription for this consultation yet.</p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </MobileLayout>
    );
  }

  const doctorName = rx.doctor_name || consultInfo(order)?.doctorName || "";
  const doctorTitle = doctorName ? withDr(doctorName) : "Your doctor";
  const issued = rx.issued_at ? new Date(rx.issued_at) : new Date(order.created_at);
  const registration = rx.doctor_registration || registrationLine(directoryDoctor);

  /** The chosen lab's tests go in the cart with its prices; the cart goes on to the slot. */
  const bookFromLab = (option: PrescriptionLabOption) => {
    replaceCart(labCartItems(option));
    setPendingLab(null);
    setLabSheetOpen(false);
    const n = option.matches.length;
    toast.success(`${n} ${n === 1 ? "test" : "tests"} added from ${option.lab.name}`);
    navigate("/cart");
  };
  const chooseLab = (option: PrescriptionLabOption) => {
    if (items.length > 0) {
      setLabSheetOpen(false);
      setPendingLab(option);
    } else {
      bookFromLab(option);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Prescription" />

      <div className="px-3 pb-28 pt-3">
        {/* A prescription sheet, laid out like a doctor's printed pad. It stays paper-white in dark mode too. */}
        <article
          aria-label={`Prescription from ${doctorTitle}`}
          className="overflow-hidden rounded-md bg-white text-slate-900 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200"
        >
          <div className="h-1.5 bg-gradient-to-r from-[#0841D4] via-sky-500 to-emerald-500" />

          {/* Letterhead */}
          <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0">
              <h2 className="font-serif text-[22px] font-bold leading-tight text-[#0841D4]">{doctorTitle}</h2>
              {rx.doctor_qualification && <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{rx.doctor_qualification}</p>}
              {rx.doctor_specialty && <p className="text-[12px] text-slate-600">{rx.doctor_specialty}</p>}
              {registration && <p className="mt-1 text-[11px] font-medium text-slate-500">{registration}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <img src="/assets/images/logo-full.png" alt="BloodLyn" className="h-8 w-auto" width={96} height={32} />
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Online consultation</p>
            </div>
          </header>
          <div className="mx-5 border-t-2 border-double border-slate-300" />

          {/* Patient line */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-5 py-3 text-[12px]">
            <div className="col-span-2 flex gap-1.5">
              <dt className="text-slate-500">Patient:</dt>
              <dd className="font-semibold">{rx.patient_name || "—"}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Age / Sex:</dt>
              <dd className="font-semibold">{[rx.patient_age && `${rx.patient_age} yrs`, rx.patient_gender].filter(Boolean).join(" / ") || "—"}</dd>
            </div>
            <div className="flex justify-end gap-1.5">
              <dt className="text-slate-500">Date:</dt>
              <dd className="font-semibold">{format(issued, "dd MMM yyyy")}</dd>
            </div>
          </dl>
          <div className="mx-5 border-t border-dashed border-slate-300" />

          <div className="space-y-4 px-5 py-4">
            {rx.notes && (
              <SheetPart title="Clinical notes">
                <p className="whitespace-pre-line text-[13px] leading-relaxed">{rx.notes}</p>
              </SheetPart>
            )}

            {rx.diagnosis && (
              <SheetPart title="Diagnosis">
                <p className="whitespace-pre-line text-[14px] font-semibold">{rx.diagnosis}</p>
              </SheetPart>
            )}

            {rx.medicines.length > 0 && (
              <section aria-label="Medicines">
                <p className="font-serif text-3xl font-bold leading-none text-[#0841D4]" aria-hidden="true">℞</p>
                <ol className="mt-2 space-y-2.5">
                  {rx.medicines.map((m, i) => (
                    <li key={`${m.name}-${i}`} className="flex gap-2.5 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                      <span className="w-5 shrink-0 text-[13px] font-bold text-slate-500">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold uppercase tracking-wide">{m.name}</p>
                        {medicineLine(m) && <p className="text-[12px] text-slate-700">{medicineLine(m)}</p>}
                        {m.instructions && <p className="text-[12px] italic text-slate-600">{m.instructions}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {rx.tests.length > 0 && (
              <SheetPart title={`Investigations advised (${rx.tests.length})`}>
                <ul className="space-y-1.5">
                  {rx.tests.map((t, i) => (
                    <li key={`${t.id ?? t.name}-${i}`} className="flex items-start gap-2 text-[13px] font-medium">
                      <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0841D4]" aria-hidden="true" />
                      <span>{simplifyTestName(testTitle(t))}</span>
                    </li>
                  ))}
                </ul>
              </SheetPart>
            )}

            {rx.advice && (
              <SheetPart title="Advice">
                <p className="whitespace-pre-line text-[13px] leading-relaxed">{rx.advice}</p>
              </SheetPart>
            )}

            {rx.follow_up && (
              <SheetPart title="Follow-up">
                <p className="text-[13px] font-semibold">{rx.follow_up}</p>
              </SheetPart>
            )}

            {/* Sign-off */}
            <div className="flex justify-end pt-3">
              <div className="min-w-[45%] text-right">
                <p className="font-serif text-[15px] font-bold italic text-[#0841D4]">{doctorTitle}</p>
                <div className="mt-1 border-t border-slate-400" />
                <p className="mt-1 text-[10px] text-slate-500">Issued digitally on BloodLyn</p>
              </div>
            </div>
          </div>

          {/* Footer line, as printed at the bottom of a prescription pad */}
          <footer className="border-t border-slate-200 bg-slate-50 px-5 py-2.5 text-center">
            <p className="text-[11px] font-medium text-slate-600">
              Digital prescription by BloodLyn :: {order.order_number || `#${order.id.slice(0, 8)}`}
            </p>
          </footer>
        </article>

        {rx.tests.length > 0 && (
          <p className="mt-3 px-1 text-center text-xs text-muted-foreground">
            Choose a lab near you to see its prices, then book home collection.
          </p>
        )}
      </div>

      {rx.tests.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Button className="h-12 w-full rounded-2xl text-base font-bold" onClick={() => setLabSheetOpen(true)}>
            <ShoppingCart className="mr-2 h-5 w-5" /> Add {rx.tests.length} {rx.tests.length === 1 ? "test" : "tests"} to cart
          </Button>
        </div>
      )}

      <PrescriptionLabSheet open={labSheetOpen} onOpenChange={setLabSheetOpen} tests={rx.tests} onChoose={chooseLab} />

      <AlertDialog open={pendingLab !== null} onOpenChange={(open) => !open && setPendingLab(null)}>
        <AlertDialogContent className="max-w-[90%] rounded-3xl border border-border bg-card shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Replace your cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Your cart already has {items.length} {items.length === 1 ? "item" : "items"}. Replace them with your prescribed tests from {pendingLab?.lab.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="mt-0 h-11 flex-1 rounded-2xl text-xs font-bold">Keep my cart</AlertDialogCancel>
            <AlertDialogAction className="h-11 flex-1 rounded-2xl text-xs font-bold" onClick={() => pendingLab && bookFromLab(pendingLab)}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default PrescriptionScreen;
