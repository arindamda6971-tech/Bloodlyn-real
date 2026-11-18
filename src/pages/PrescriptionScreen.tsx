import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, ClipboardList, FileText, FlaskConical, Pill, ShoppingCart, Stethoscope, User } from "lucide-react";
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
import { useCart } from "@/contexts/CartContext";
import { useSEO } from "@/hooks/useSEO";
import { consultInfo } from "@/lib/doctor-orders";
import { medicineLine, prescriptionOf, testTitle } from "@/lib/prescription";
import { simplifyTestName } from "@/utils/simplify-test-name";
import { labCartItems, type PrescriptionLabOption } from "@/lib/prescriptionLabs";
import { PrescriptionLabSheet } from "@/components/prescriptions/PrescriptionLabSheet";
import { toast } from "sonner";

function Block({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

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

  const doctor = rx.doctor_name || consultInfo(order)?.doctorName || "Your doctor";
  const issued = rx.issued_at ? new Date(rx.issued_at) : new Date(order.created_at);
  const patient = [rx.patient_name, rx.patient_age && `${rx.patient_age} yrs`, rx.patient_gender].filter(Boolean).join(" · ");

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

      <div className="space-y-3 px-4 pb-28">
        <section className="mt-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold leading-tight text-foreground">{doctor}</h2>
              {rx.doctor_qualification && <p className="truncate text-xs text-muted-foreground">{rx.doctor_qualification}</p>}
              <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{format(issued, "dd MMM yyyy")}</p>
            </div>
          </div>
          {patient && (
            <p className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-sm text-foreground">
              <User className="h-4 w-4 text-muted-foreground" /> {patient}
            </p>
          )}
        </section>

        {rx.diagnosis && (
          <Block icon={ClipboardList} title="Diagnosis">
            <p className="whitespace-pre-line text-sm font-semibold text-foreground">{rx.diagnosis}</p>
          </Block>
        )}

        {rx.medicines.length > 0 && (
          <Block icon={Pill} title="Medicines">
            <ol className="space-y-3">
              {rx.medicines.map((m, i) => (
                <li key={`${m.name}-${i}`} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{m.name}</p>
                    {medicineLine(m) && <p className="text-xs text-muted-foreground">{medicineLine(m)}</p>}
                    {m.instructions && <p className="text-xs text-foreground/80">{m.instructions}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {rx.tests.length > 0 && (
          <Block icon={FlaskConical} title={`Tests advised (${rx.tests.length})`}>
            <ul className="space-y-2">
              {rx.tests.map((t, i) => (
                <li key={`${t.id ?? t.name}-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{simplifyTestName(testTitle(t))}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Choose a lab near you to see its prices, then book home collection.</p>
          </Block>
        )}

        {rx.advice && (
          <Block icon={FileText} title="Advice">
            <p className="whitespace-pre-line text-sm text-foreground">{rx.advice}</p>
          </Block>
        )}

        {rx.notes && (
          <Block icon={FileText} title="Doctor's notes">
            <p className="whitespace-pre-line text-sm text-foreground">{rx.notes}</p>
          </Block>
        )}

        {rx.follow_up && (
          <Block icon={CalendarClock} title="Follow-up">
            <p className="text-sm font-semibold text-foreground">{rx.follow_up}</p>
          </Block>
        )}

        <p className="px-1 text-center text-[11px] text-muted-foreground">
          Digital prescription from your BloodLyn consultation, booking {order.order_number || `#${order.id.slice(0, 8)}`}.
        </p>
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
