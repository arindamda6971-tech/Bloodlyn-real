import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, PlayCircle, Inbox } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useTicketDetails } from "@/hooks/useBridgeTickets";
import { useSEO } from "@/hooks/useSEO";
import NotFound from "./NotFound";

const TicketDetailScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, isError } = useTicketDetails(id || null);
  
  const ticket = data?.ticket || data;
  const replies = data?.replies || ticket?.replies || [];
  
  useSEO({ 
    title: ticket ? `Ticket ${ticket.ticket_number} | BloodLyn Support` : "Ticket Details", 
    description: "Support ticket details" 
  });

  if (isLoading) {
    return (
      <MobileLayout className="bg-slate-50 min-h-screen pb-10 flex items-center justify-center" showNav={false}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </MobileLayout>
    );
  }

  if (isError || !ticket) {
    return (
      <MobileLayout className="bg-slate-50 min-h-screen pb-10" showNav={false}>
        <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">We couldn't find the ticket you're looking for, or it might still be processing.</p>
          <button 
            onClick={() => navigate('/support')}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-transform"
          >
            Back to Support
          </button>
        </div>
      </MobileLayout>
    );
  }

  // Format dates for display
  const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  }) : 'Unknown Date';

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <MobileLayout className="bg-slate-50 min-h-screen pb-10" showNav={false}>
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm border-b border-slate-100 sticky top-0 z-20 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-700 active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-lg font-bold text-slate-900 truncate">Ticket Details</h1>
          <p className="text-xs text-slate-500 font-medium truncate">{ticket.ticket_number}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        
        {/* Ticket Summary Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
              ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
              ticket.status === 'closed' ? 'bg-slate-200 text-slate-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {ticket.status}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{createdDate}</span>
          </div>

          <h2 className="text-lg font-black text-slate-900 mb-1">{ticket.subject || ticket.category}</h2>

          {ticket.description && (
            <div className="bg-slate-50 rounded-2xl p-4 mt-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline / Replies */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Ticket Timeline</h3>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="relative border-l-2 border-slate-100 pl-6 space-y-8 ml-2">
              
              {/* Created */}
              <div className="relative">
                <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Ticket Created</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{createdDate}</p>
                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl">Your support request was successfully logged into our system.</p>
                </div>
              </div>

              {/* Assigned / Processing */}
              <div className="relative">
                <div className={`absolute -left-[35px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white ${ticket.status === 'open' ? 'bg-slate-100' : 'bg-blue-100'}`}>
                  {ticket.status === 'open' ? (
                    <Clock className="w-3 h-3 text-slate-400" />
                  ) : (
                     <PlayCircle className="w-3 h-3 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${ticket.status === 'open' ? 'text-slate-400' : 'text-slate-900'}`}>Assigned to Support Team</h4>
                  {ticket.status === 'open' ? (
                    <p className="text-xs text-slate-400 mt-0.5">Waiting for an agent...</p>
                  ) : (
                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl">An agent is currently reviewing your case details.</p>
                  )}
                </div>
              </div>

              {/* Replies from Admin */}
              {replies && replies.map((reply: any) => (
                !reply.is_internal_note && (
                  <div key={reply.id} className="relative">
                    <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border-4 border-white">
                      <Inbox className="w-3 h-3 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Support Agent</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(reply.created_at).toLocaleString()}</p>
                      <p className="text-sm text-slate-600 mt-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        {reply.message}
                      </p>
                    </div>
                  </div>
                )
              ))}

              {/* Resolution */}
              {isResolved && (
                <div className="relative">
                  <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-700">Resolved</h4>
                    <p className="text-sm text-slate-600 mt-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      We have resolved your issue. Thank you for your patience.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>


      </div>
    </MobileLayout>
  );
};

export default TicketDetailScreen;
