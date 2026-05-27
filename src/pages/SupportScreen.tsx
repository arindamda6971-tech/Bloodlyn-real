import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle, ChevronRight, Plus, Search, Clock, CheckCircle2, AlertCircle, Loader2, Send, ListFilter } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
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
    <MobileLayout>
      <ScreenHeader title="Help & Support" />

      <div className="px-4 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
            <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">My Tickets</TabsTrigger>
            <TabsTrigger value="track" className="text-xs">Track</TabsTrigger>
          </TabsList>

          {/* Contact Tab */}
          <TabsContent value="contact">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="soft-card text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Need Help?</h2>
              <p className="text-sm text-muted-foreground mt-1">We're here to assist you 24/7</p>
            </motion.div>

            <div className="mt-4 space-y-3">
              <motion.button
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                onClick={() => { window.location.href = `tel:+91${SUPPORT_PHONE}`; }}
                className="w-full soft-card flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-foreground">Call Support</span>
                  <p className="text-xs text-muted-foreground">Talk to our support team directly</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                onClick={() => { window.location.href = `https://wa.me/91${SUPPORT_PHONE}`; }}
                className="w-full soft-card flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-foreground">WhatsApp Support</span>
                  <p className="text-xs text-muted-foreground">Chat with us on WhatsApp</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="soft-card mt-6 text-center">
              <p className="text-sm text-muted-foreground">Our support team is available</p>
              <p className="text-sm font-medium text-foreground mt-1">Monday - Sunday, 9 AM - 9 PM</p>
            </motion.div>
          </TabsContent>

          {/* New Ticket Tab */}
          <TabsContent value="new">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="soft-card space-y-4">
                <h3 className="font-semibold text-foreground">Submit a Complaint</h3>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category *</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject *</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of the issue" maxLength={200} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue in detail..." rows={4} maxLength={2000} />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitMutation.isPending ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </motion.div>
          </TabsContent>

          {/* My Tickets Tab */}
          <TabsContent value="tickets">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {ticketsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="soft-card text-center py-8">
                  <ListFilter className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No tickets yet</p>
                  <button onClick={() => setActiveTab("new")} className="mt-3 text-primary text-sm font-medium flex items-center gap-1 mx-auto">
                    <Plus className="w-4 h-4" /> Submit your first ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket: any) => (
                    <button
                      key={ticket.id || ticket.ticket_number}
                      className="soft-card w-full text-left active:scale-[0.98] transition-transform"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">#{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h4 className="font-medium text-foreground text-sm">{ticket.subject}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        {ticket.category && (
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{ticket.category}</span>
                        )}
                        {ticket.created_at && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Track Ticket Tab */}
          <TabsContent value="track">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="soft-card">
                <h3 className="font-semibold text-foreground mb-3">Track Ticket Status</h3>
                <div className="flex gap-2">
                  <Input
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    placeholder="Enter ticket number"
                    className="flex-1"
                  />
                  <button
                    onClick={() => setSearchTicketNumber(trackNumber.trim() || null)}
                    disabled={!trackNumber.trim()}
                    className="px-4 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {trackLoading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {trackedTicket && !trackLoading && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="soft-card">
                    {trackedTicket.success === false ? (
                      <div className="text-center py-4">
                        <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
                        <p className="text-sm text-muted-foreground">Ticket not found</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-sm text-foreground">#{trackedTicket.ticket?.ticket_number || trackNumber}</span>
                          {getStatusBadge(trackedTicket.ticket?.status || trackedTicket.status)}
                        </div>
                        {trackedTicket.ticket?.subject && (
                          <p className="text-sm text-foreground font-medium">{trackedTicket.ticket.subject}</p>
                        )}
                        {trackedTicket.ticket?.category && (
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{trackedTicket.ticket.category}</p>
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

      <TicketDetailSheet
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </MobileLayout>
  );
};

export default SupportScreen;
