import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2, Calendar, Activity, User, Hash, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";

interface ReportOrder {
  id: string;
  test_name: string | null;
  report_url: string | null;
  status: string | null;
  lab_name: string | null;
  updated_at: string;
  order_number: string | null;
  scheduled_date: string | null;
  patient_name?: string | null;
  family_member_id?: string | null;
  family_members?: { full_name: string } | null;
}

const ReportsScreen = () => {
  useSEO({ title: "Health Reports | BloodLyn", description: "Access your lab reports with AI-powered insights, trend analysis and easy sharing." });
  const { user } = useAuth();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, test_name, report_url, status, lab_name, updated_at, order_number, scheduled_date, family_member_id")
        .eq("user_id", user.id)
        .in("status", ["report_ready", "completed"])
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Reports fetch error:", error);
      }
      
      const { data: familyMembers } = await supabase
        .from("family_members")
        .select("id, full_name")
        .eq("user_id", user.id);
        
      const membersMap = new Map((familyMembers || []).map(m => [m.id, m.full_name]));
      
      const mappedOrders = (data || []).map((o: any) => ({
        ...o,
        family_members: o.family_member_id && membersMap.has(o.family_member_id) 
          ? { full_name: membersMap.get(o.family_member_id) } 
          : null
      }));

      if (!error && data) setOrders(mappedOrders as any);
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

  const handleDownload = async (order: ReportOrder) => {
    if (!order.report_url) {
      toast.error("Report file not available yet");
      return;
    }
    
    // Extract file extension from URL, fallback to .pdf
    const getExtension = (url: string) => {
      const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      if (match && ['pdf', 'jpg', 'jpeg', 'png'].includes(match[1].toLowerCase())) {
        return `.${match[1].toLowerCase()}`;
      }
      return '.pdf'; // Default fallback
    };
    
    const ext = getExtension(order.report_url);
    const filename = `report-${order.order_number || order.id.slice(0, 8)}${ext}`;

    try {
      const response = await fetch(order.report_url);
      const blob = await response.blob();
      
      // If we didn't find an extension in URL, try to guess from blob type
      let finalExt = ext;
      if (ext === '.pdf' && blob.type.includes('image/jpeg')) finalExt = '.jpg';
      else if (ext === '.pdf' && blob.type.includes('image/png')) finalExt = '.png';
      
      const finalFilename = `report-${order.order_number || order.id.slice(0, 8)}${finalExt}`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback if fetch fails (e.g., CORS)
      const link = document.createElement("a");
      link.href = order.report_url;
      link.target = "_blank";
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <MobileLayout>
      <ScreenHeader title="My Reports" showBack={false} />

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
          <div className="space-y-4">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
              >

                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-semibold text-foreground text-base leading-tight">
                      {order.test_name || "Health Test"}
                    </h3>
                    
                    <div className="flex flex-col gap-1.5 mt-2">
                      {/* Patient Name & Lab */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground truncate max-w-[120px]">
                            {order.patient_name || order.family_members?.full_name || user?.user_metadata?.full_name || "Patient"}
                          </span>
                        </div>
                        {order.lab_name && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-border"></div>
                            <span className="truncate max-w-[120px]">By <span className="font-medium text-foreground">{order.lab_name}</span></span>
                          </div>
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {order.scheduled_date 
                              ? new Date(order.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : new Date(order.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center relative z-10">
                   <div className="text-xs font-medium text-muted-foreground">
                      {order.report_url ? (
                        <span className="text-success flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                          Ready to view
                        </span>
                      ) : (
                        <span className="text-warning flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                          Processing report...
                        </span>
                      )}
                   </div>
                   <Button
                    size="sm"
                    className={`gap-2 rounded-full px-5 h-9 font-semibold transition-all ${
                      order.report_url 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5" 
                        : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => handleDownload(order)}
                    disabled={!order.report_url}
                  >
                    <Download className="w-4 h-4" />
                    {order.report_url ? "Download" : "Pending"}
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
