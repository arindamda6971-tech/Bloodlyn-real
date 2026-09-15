import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Search, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/MobileLayout";
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
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
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
