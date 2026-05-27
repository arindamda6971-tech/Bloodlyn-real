import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Download, FileText, Loader2, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
<<<<<<< HEAD
import StickySearch from "@/components/ui/StickySearch";
=======
import { useNavigate } from "react-router-dom";
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)

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
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Header Squeeze Animation Logic
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 60], [100, 70]);
  const titleOpacity = useTransform(scrollY, [0, 30], [1, 0.5]);
  const titleScale = useTransform(scrollY, [0, 30], [1, 0.9]);

  // ... [useEffect fetchReports remains same] ...

  return (
    <MobileLayout>
<<<<<<< HEAD
      <ScreenHeader title="My Reports" showBack={false} />
      <StickySearch value={query} onChange={setQuery} placeholder="Search reports by test or lab..." />
=======
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden flex items-center gap-4"
        style={{
          height: headerHeight,
          paddingTop: "calc(env(safe-area-inset-top, 24px) + 8px)"
        }}
      >
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <motion.h1
          style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }}
          className="text-lg font-black text-foreground tracking-tight"
        >
          My Reports
        </motion.h1>
      </motion.header>
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)

      <div className="px-6 pb-6 mt-2">
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
            {orders
              .filter((o) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  o.test_name?.toLowerCase().includes(q) ||
                  o.lab_name?.toLowerCase().includes(q) ||
                  o.order_number?.toLowerCase().includes(q)
                );
              })
              .map((order, i) => (
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
