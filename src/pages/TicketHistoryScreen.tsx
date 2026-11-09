import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Search, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/MobileLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTickets } from "@/hooks/useBridgeTickets";
import { useSEO } from "@/hooks/useSEO";

const TicketHistoryScreen = () => {
  useSEO({ title: "Ticket History | BloodLyn Support", description: "View your past and active support tickets" });
  const navigate = useNavigate();
  const { data, isLoading } = useMyTickets();
  const tickets = Array.isArray(data) ? data : data?.tickets || [];

  return (
    <MobileLayout className="bg-slate-50 min-h-screen pb-10" showNav={false}>
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Support History</h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{tickets.length} Tickets</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading tickets">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4" aria-hidden="true">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
                <Skeleton className="mt-2 h-3 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center pt-20 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">No Tickets Found</h2>
            <p className="text-sm text-slate-500 max-w-[250px]">You haven't submitted any support requests yet.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={ticket.id} 
                onClick={() => navigate(`/support/ticket/${ticket.id}`)}
                className="w-full text-left bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:border-blue-200 active:scale-95 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {ticket.status}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{ticket.ticket_number}</span>
                </div>
                
                <h3 className="text-sm font-bold text-slate-900 mb-1">{ticket.subject || ticket.category || "Support Ticket"}</h3>
                
                {ticket.created_at && (
                  <p className="text-[11px] font-medium text-slate-500 mt-3 flex items-center gap-1.5 pt-3 border-t border-slate-50">
                    Created on {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default TicketHistoryScreen;
