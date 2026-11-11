import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Building2, Calendar, Clock, FileText, Phone, Stethoscope, User, Video, Eye } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderDetails } from "@/hooks/useOrderDetails";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useSEO } from "@/hooks/useSEO";
import { consultInfo, consultStatus } from "@/lib/doctor-orders";

const STATUS = {
  upcoming: { label: "Upcoming", tone: "bg-primary/10 text-primary" },
  completed: { label: "Completed", tone: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
} as const;

/** A doctor consultation: who, when, how to join, and the prescription afterwards. */
const AppointmentDetailScreen = () => {
  useSEO({ title: "Appointment | BloodLyn", description: "Your doctor consultation." });
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOrderDetails(id);
  useRealtimeOrders();

  if (isLoading) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Appointment" />
        <div className="px-4 space-y-3 mt-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  const order = data?.order;
  const info = order ? consultInfo(order) : null;
  if (isError || !order || !info) {
    return (
      <MobileLayout showNav={false}>
        <ScreenHeader title="Appointment" />
        <div className="px-6 py-20 text-center">
          <p className="font-bold text-foreground">Appointment not found</p>
          <Button className="mt-4 rounded-xl" onClick={() => navigate("/bookings")}>Back to My Orders</Button>
        </div>
      </MobileLayout>
    );
  }

  const status = consultStatus(order.status);
  const statusInfo = STATUS[status];
  const ModeIcon = info.mode === "video" ? Video : info.mode === "audio" ? Phone : Building2;
  const modeLabel = info.mode === "video" ? "Video consultation" : info.mode === "audio" ? "Audio consultation" : "Clinic visit";
  const patient = info.patientName || order.patient_name || order.family_members?.full_name || "Self";
  const notes = (order.special_instructions || "").match(/Reason:\s*([^|]+)/)?.[1]?.trim() ?? "";
  const headline =
    status === "cancelled"
      ? "This appointment was cancelled."
      : status === "completed"
        ? "Consultation completed."
        : info.mode === "clinic"
          ? "Please reach the clinic a few minutes before your time."
          : "The doctor will call you in the app at your time. You can also join from here.";

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title="Appointment" />

      <div className="px-4 pb-8 space-y-3">
        <section className="mt-3 rounded-2xl border border-border/60 bg-card shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <ModeIcon className="w-3.5 h-3.5" /> {modeLabel}
              </p>
              <h2 className="text-lg font-extrabold text-foreground leading-tight truncate">{info.doctorName}</h2>
              {info.mode === "clinic" && order.lab_name && (
                <p className="text-xs text-muted-foreground truncate">{order.lab_name}</p>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${statusInfo.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-snug">{headline}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Calendar className="w-3 h-3" /> Date</p>
              <p className="text-sm font-bold text-foreground">
                {order.scheduled_date ? format(new Date(order.scheduled_date), "EEE, dd MMM yyyy") : "To be fixed"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Clock className="w-3 h-3" /> Time</p>
              <p className="text-sm font-bold text-foreground truncate">{order.scheduled_time_slot || "To be fixed"}</p>
            </div>
          </div>

          {status === "upcoming" && info.mode !== "clinic" && (
            <Button
              className="mt-3 w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => navigate(`/call/${order.id}?mode=${info.mode}`)}
            >
              <ModeIcon className="w-4 h-4 mr-1.5" /> Join call
            </Button>
          )}
          {status === "completed" && order.report_url && (
            <Button className="mt-3 w-full h-11 rounded-xl" onClick={() => window.open(order.report_url!, "_blank")}>
              <Eye className="w-4 h-4 mr-1.5" /> View prescription
            </Button>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="w-3.5 h-3.5" /> Patient</p>
            <p className="text-sm font-bold text-foreground">{patient}</p>
          </div>
          {notes && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="w-3.5 h-3.5" /> Reason for visit</p>
              <p className="mt-1 text-sm text-foreground leading-snug">{notes}</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground">Fee{order.payment_status === "completed" ? " (paid)" : ""}</p>
            <p className="text-base font-black text-foreground tabular-nums">₹{order.total}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Booking {order.order_number || `#${order.id.slice(0, 8)}`} · booked {format(new Date(order.created_at), "dd MMM yyyy")}
          </p>
        </section>
      </div>
    </MobileLayout>
  );
};

export default AppointmentDetailScreen;
