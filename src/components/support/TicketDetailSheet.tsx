import { motion } from "framer-motion";
import { ArrowLeft, Clock, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StatusBadge from "@/components/ui/status-badge";
import { useTicketDetails, type Ticket } from "@/hooks/useBridgeTickets";
import { format } from "date-fns";

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "open":
    case "new":
      return <StatusBadge variant="info" dot>{status}</StatusBadge>;
    case "in_progress":
    case "in progress":
      return <StatusBadge variant="warning" dot>In Progress</StatusBadge>;
    case "waiting_on_user":
      return <StatusBadge variant="warning" dot>Awaiting Reply</StatusBadge>;
    case "resolved":
    case "closed":
      return <StatusBadge variant="success" dot>{status}</StatusBadge>;
    default:
      return <StatusBadge variant="info" dot>{status || "Unknown"}</StatusBadge>;
  }
}

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
}

export default function TicketDetailSheet({ ticket, open, onClose }: TicketDetailSheetProps) {
  const { data: detailsData, isLoading } = useTicketDetails(ticket?.id || null);

  const details = detailsData?.ticket || detailsData;
  const replies = (detailsData?.replies || details?.replies || []).filter(
    (r: any) => !r.is_internal_note
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold text-foreground truncate">
                {ticket?.subject || "Ticket Details"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground font-mono">#{ticket?.ticket_number}</p>
            </div>
            {ticket?.status && getStatusBadge(ticket.status)}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: "calc(85vh - 80px)" }}>
          {/* Ticket Info */}
          {ticket && (
            <div className="soft-card space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {ticket.category && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                    {ticket.category}
                  </span>
                )}
                {ticket.priority && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                    ticket.priority === "critical" ? "bg-destructive/10 text-destructive" :
                    ticket.priority === "high" ? "bg-orange-500/10 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {ticket.priority}
                  </span>
                )}
                {ticket.created_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {format(new Date(ticket.created_at), "dd MMM yyyy, hh:mm a")}
                  </span>
                )}
              </div>
              {details?.description && (
                <p className="text-sm text-foreground leading-relaxed">{details.description}</p>
              )}
            </div>
          )}

          {/* Replies / Messages */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Responses
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : replies.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="soft-card text-center py-6"
              >
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No responses yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Our team will respond shortly</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {replies.map((reply: any, idx: number) => (
                  <motion.div
                    key={reply.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0}}
                    className="soft-card border-l-2 border-primary/40"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-primary">
                        {reply.author_role === "user" ? "You" : "Support Team"}
                      </span>
                      {reply.created_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(reply.created_at), "dd MMM, hh:mm a")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{reply.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
