import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight, FileText, FlaskConical, Pill, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { consultInfo } from "@/lib/doctor-orders";
import { prescriptionOf } from "@/lib/prescription";

interface PrescriptionOrder {
  id: string;
  test_name: string | null;
  order_number: string | null;
  updated_at: string;
  created_at: string;
  prescription: unknown;
}

/** Every digital prescription from the patient's doctor consultations, newest first. */
export function PrescriptionList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["prescriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, test_name, order_number, updated_at, created_at, prescription" as never)
        .eq("user_id", user!.id)
        .not("prescription", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PrescriptionOrder[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-[22px]" />)}
      </div>
    );
  }

  const items = orders.flatMap((o) => {
    const rx = prescriptionOf(o);
    return rx ? [{ order: o, rx }] : [];
  });

  if (isError || items.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <FileText className="h-7 w-7" />
        </div>
        <p className="mt-3 font-bold text-foreground">{isError ? "Couldn't load your prescriptions" : "No prescriptions yet"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isError ? "Please try again in a moment." : "After an online consultation, your doctor's prescription appears here."}
        </p>
        {!isError && (
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/doctor-consult")}>Consult a doctor</Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map(({ order, rx }) => {
        const doctor = rx.doctor_name || consultInfo(order)?.doctorName || "Doctor";
        const issued = new Date(rx.issued_at || order.updated_at || order.created_at);
        return (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => navigate(`/prescription/${order.id}`)}
              className="flex w-full items-center gap-3 rounded-[22px] border border-border/70 bg-card p-4 text-left shadow-sm active:scale-[0.99] transition-transform"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Stethoscope className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{doctor}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {format(issued, "dd MMM yyyy")}
                  {rx.diagnosis ? ` · ${rx.diagnosis}` : ""}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {rx.medicines.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                      <Pill className="h-3 w-3" /> {rx.medicines.length} {rx.medicines.length === 1 ? "medicine" : "medicines"}
                    </span>
                  )}
                  {rx.tests.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <FlaskConical className="h-3 w-3" /> {rx.tests.length} {rx.tests.length === 1 ? "test" : "tests"}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
