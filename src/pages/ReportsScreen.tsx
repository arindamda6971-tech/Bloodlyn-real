import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import StickySearch from "@/components/ui/StickySearch";

interface ReportOrder {
  id: string;
  test_name: string | null;
  report_url: string | null;
  status: string | null;
  lab_name: string | null;
  updated_at: string;
  order_number: string | null;
}

const ReportsScreen = () => {
  useSEO({ title: "Health Reports | BloodLyn", description: "Access your lab reports with AI-powered insights, trend analysis and easy sharing." });
  const { user } = useAuth();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, test_name, report_url, status, lab_name, updated_at, order_number")
        .eq("user_id", user.id)
        .in("status", ["report_ready", "completed"])
        .order("updated_at", { ascending: false });

      if (!error && data) setOrders(data);
      setLoading(false);
    };
    fetchReports();

    const channel = supabase
      .channel("reports-orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => {
        fetchReports();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleDownload = (order: ReportOrder) => {
    if (!order.report_url) {
      toast.error("Report file not available yet");
      return;
    }
    window.open(order.report_url, "_blank");
  };

  return (
    <MobileLayout>
      <ScreenHeader title="My Reports" showBack={false} />
      <StickySearch value={query} onChange={setQuery} placeholder="Search reports by test or lab..." />

      <div className="px-4 pb-6 mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading reports…</p>
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground">No Reports Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
                Your test reports will appear here once they are ready.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {order.test_name || "Health Test"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(order.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {order.lab_name && (
                        <>
                          <span className="text-border">•</span>
                          <span className="truncate">{order.lab_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={order.report_url ? "default" : "secondary"}
                    className="w-full gap-2"
                    onClick={() => handleDownload(order)}
                    disabled={!order.report_url}
                  >
                    <Download className="w-4 h-4" />
                    {order.report_url ? "Download Report" : "Report Processing…"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ReportsScreen;
