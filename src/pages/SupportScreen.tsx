import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle, ChevronRight, Plus, Search, Clock, CheckCircle2, AlertCircle, Loader2, Send, ListFilter, HelpCircle, Sparkles } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitTicket, useMyTickets, useTicketStatus, type TicketCategory, type TicketPriority, type Ticket } from "@/hooks/useBridgeTickets";
import { toast } from "sonner";
import StatusBadge from "@/components/ui/status-badge";
import TicketDetailSheet from "@/components/support/TicketDetailSheet";

const SUPPORT_PHONE = "6296092819";

const categories: { value: TicketCategory; label: string }[] = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "account", label: "Account" },
  { value: "service_quality", label: "Service Quality" },
  { value: "app_bug", label: "App Bug" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

const priorities: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "open":
    case "new":
      return <StatusBadge variant="info" dot>{status}</StatusBadge>;
    case "in_progress":
    case "in progress":
      return <StatusBadge variant="warning" dot>In Progress</StatusBadge>;
    case "resolved":
    case "closed":
      return <StatusBadge variant="success" dot>{status}</StatusBadge>;
    default:
      return <StatusBadge variant="info" dot>{status || "Unknown"}</StatusBadge>;
  }
}

const SupportScreen = () => {
  const [activeTab, setActiveTab] = useState("contact");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [trackNumber, setTrackNumber] = useState("");
  const [searchTicketNumber, setSearchTicketNumber] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const submitMutation = useSubmitTicket();
  const { data: ticketsData, isLoading: ticketsLoading } = useMyTickets();
  const { data: trackedTicket, isLoading: trackLoading } = useTicketStatus(searchTicketNumber);

  const handleSubmit = () => {
    if (!category || !subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    submitMutation.mutate(
      { category: category as TicketCategory, priority, subject: subject.trim(), description: description.trim() },
      {
        onSuccess: (data) => {
          toast.success(`Ticket #${data?.ticket?.ticket_number || ""} submitted!`);
          setSubject("");
          setDescription("");
          setCategory("");
          setPriority("medium");
          setActiveTab("tickets");
        },
        onError: (err) => toast.error(err.message || "Failed to submit"),
      }
    );
  };

  const tickets = ticketsData?.tickets || ticketsData?.data || [];

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Help & Support" />

      <div className="px-4 pb-32 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Global Help Center"
          subtitle="Prompt, empathetic & expert assistance"
          icon={HelpCircle}
          accent="from-blue-600 via-teal-600 to-emerald-600"
        />

        {/* Premium Gradient Hero Banner */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white shadow-[0_10px_30px_-10px_rgba(23,37,84,0.5)] relative overflow-hidden border border-white/10"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3 text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Direct Concierge</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              24/7 Dedicated Healthdesk<br />Support &amp; Resolution
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-[90%] leading-relaxed">
              Experience zero-wait instant chat support or log a formal ticket for high-priority diagnostic tracking.
            </p>
          </div>
        </motion.div>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6 p-1 bg-muted/60 rounded-2xl border border-border/60 shadow-inner">
              <TabsTrigger value="contact" className="text-xs rounded-xl transition-all font-semibold py-2.5">Contact</TabsTrigger>
              <TabsTrigger value="new" className="text-xs rounded-xl transition-all font-semibold py-2.5">New</TabsTrigger>
              <TabsTrigger value="tickets" className="text-xs rounded-xl transition-all font-semibold py-2.5">My Tickets</TabsTrigger>
              <TabsTrigger value="track" className="text-xs rounded-xl transition-all font-semibold py-2.5">Track</TabsTrigger>
            </TabsList>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <motion.div
                initial={false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                onClick={() => { window.location.href = `tel:+91${SUPPORT_PHONE}`; }}
                className="p-5 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group"
              >
                <div className="w-13 h-13 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">Call Support</span>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">Talk to our support team directly</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
              </motion.div>

              <motion.div
                initial={false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                onClick={() => { window.location.href = `https://wa.me/91${SUPPORT_PHONE}`; }}
                className="p-5 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-green-500/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group"
              >
                <div className="w-13 h-13 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0 border border-green-500/20 group-hover:scale-105 transition-transform duration-300">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-base font-bold text-foreground tracking-tight group-hover:text-green-600 transition-colors">WhatsApp Support</span>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">Chat with us on WhatsApp</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
              </motion.div>

              <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-5 rounded-3xl bg-primary/5 border border-primary/20 text-center mt-6">
                <p className="text-xs text-muted-foreground font-medium">Our dedicated support team is available</p>
                <p className="text-sm font-bold text-primary mt-1">Monday - Sunday • 9 AM - 9 PM</p>
              </motion.div>
            </TabsContent>

            {/* New Ticket Tab */}
            <TabsContent value="new">
              <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] space-y-5">
                <h3 className="text-base font-bold text-foreground tracking-tight">Submit a Formal Ticket</h3>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Category *</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                    <SelectTrigger className="h-12 rounded-xl border-border bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Priority</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                    <SelectTrigger className="h-12 rounded-xl border-border bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Subject *</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" maxLength={200} className="h-12 rounded-xl border-border bg-background" />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Description *</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows={4} maxLength={2000} className="rounded-xl border-border bg-background p-3.5" />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 active:scale-[0.98] transition-all duration-300"
                >
                  {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitMutation.isPending ? "Submitting Ticket..." : "Submit Ticket"}
                </button>
              </motion.div>
            </TabsContent>

            {/* My Tickets Tab */}
            <TabsContent value="tickets">
              <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-/98 border border-border/60 text-center py-12 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]">
                    <div className="w-16 h-16 rounded-3xl bg-muted mx-auto flex items-center justify-center mb-4 border border-border">
                      <ListFilter className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">No tickets found</h3>
                    <p className="text-xs text-muted-foreground font-medium mb-4">You have not submitted any active complaints yet.</p>
                    <button onClick={() => setActiveTab("new")} className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 mx-auto hover:opacity-95 active:scale-[0.98] transition-all">
                      <Plus className="w-4 h-4" /> Submit your first ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {tickets.map((ticket: any) => (
                      <button
                        key={ticket.id || ticket.ticket_number}
                        className="p-5 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 w-full text-left active:scale-[0.98] transition-all duration-300 group block"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-start justify-between mb-2.5">
                          <span className="text-xs font-mono font-semibold text-primary">#{ticket.ticket_number}</span>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <h4 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">{ticket.subject}</h4>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                          {ticket.category && (
                            <span className="text-[11px] bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-semibold capitalize">{ticket.category}</span>
                          )}
                          {ticket.created_at && (
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* Track Ticket Tab */}
            <TabsContent value="track">
              <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-6 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]">
                  <h3 className="text-base font-bold text-foreground tracking-tight mb-3">Track Ticket Status</h3>
                  <div className="flex gap-2.5">
                    <Input
                      value={trackNumber}
                      onChange={(e) => setTrackNumber(e.target.value)}
                      placeholder="Enter ticket number"
                      className="flex-1 h-13 rounded-2xl border-border bg-background px-4 font-medium"
                    />
                    <button
                      onClick={() => setSearchTicketNumber(trackNumber.trim() || null)}
                      disabled={!trackNumber.trim()}
                      className="px-6 rounded-2xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 disabled:opacity-50 hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {trackLoading && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}
                  {trackedTicket && !trackLoading && (
                    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]">
                      {trackedTicket.success === false ? (
                        <div className="text-center py-6">
                          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
                          <h3 className="text-base font-bold text-foreground mb-1">Ticket not found</h3>
                          <p className="text-xs text-muted-foreground font-medium">We couldn't find a ticket matching that number.</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3.5 pb-3.5 border-b border-border/50">
                            <span className="font-mono text-sm font-bold text-primary">#{trackedTicket.ticket?.ticket_number || trackNumber}</span>
                            {getStatusBadge(trackedTicket.ticket?.status || trackedTicket.status)}
                          </div>
                          {trackedTicket.ticket?.subject && (
                            <p className="text-base text-foreground font-bold tracking-tight">{trackedTicket.ticket.subject}</p>
                          )}
                          {trackedTicket.ticket?.category && (
                            <p className="text-xs text-muted-foreground mt-2 font-medium capitalize flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {trackedTicket.ticket.category}
                            </p>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </MobileLayout>
  );
};

export default SupportScreen;
