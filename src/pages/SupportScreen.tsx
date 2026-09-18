import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, ChevronRight, Upload, CheckCircle2, Ticket, History, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { SUPPORT_CATEGORIES, MOCK_ORDERS } from "@/lib/supportData";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitTicket, useMyTickets } from "@/hooks/useBridgeTickets";
import { toast } from "sonner";
import type { IssueNode, SupportCategory, SupportTicket } from "@/types/support";

type WizardStep = 
  | "CATEGORY_SELECT"
  | "ORDER_SELECT"
  | "ISSUE_SELECT"
  | "OTHER_ENTRY"
  | "SUCCESS";

const SupportScreen = () => {
  useSEO({ title: "Help & Support | BloodLyn", description: "Get help and support for BloodLyn services." });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useMyTickets();
  const tickets = Array.isArray(data) ? data : data?.tickets || [];
  const submitTicket = useSubmitTicket();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<WizardStep>("CATEGORY_SELECT");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selections
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // For nested issue selection, we keep a stack of current nodes
  const [issueTreePath, setIssueTreePath] = useState<IssueNode[]>([]);
  const [currentIssueList, setCurrentIssueList] = useState<IssueNode[]>([]);

  // Other form state
  const [description, setDescription] = useState("");
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);

  const selectedCategory = useMemo(() => 
    SUPPORT_CATEGORIES.find(c => c.id === selectedCategoryId), 
  [selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return SUPPORT_CATEGORIES;
    const lowerQ = searchQuery.toLowerCase();
    return SUPPORT_CATEGORIES.filter(c => 
      c.title.toLowerCase().includes(lowerQ) || 
      c.subtitle.toLowerCase().includes(lowerQ)
    );
  }, [searchQuery]);

  // Handle selecting a main category
  const handleCategorySelect = (category: SupportCategory) => {
    setSelectedCategoryId(category.id);
    if (category.id === "other") {
      setStep("OTHER_ENTRY");
    } else if (category.requiresOrderContext) {
      setStep("ORDER_SELECT");
    } else if (category.issues) {
      setCurrentIssueList(category.issues);
      setIssueTreePath([]);
      setStep("ISSUE_SELECT");
    } else {
      setStep("OTHER_ENTRY"); // Fallback if no issues defined
    }
  };

  // Handle selecting an order
  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    if (selectedCategory?.issues) {
      setCurrentIssueList(selectedCategory.issues);
      setIssueTreePath([]);
      setStep("ISSUE_SELECT");
    } else {
      setStep("OTHER_ENTRY");
    }
  };

  // Handle specific issue selection
  const handleIssueSelect = (node: IssueNode) => {
    if (node.children && node.children.length > 0) {
      // Go deeper
      setIssueTreePath([...issueTreePath, node]);
      setCurrentIssueList(node.children);
    } else {
      // Leaf node selected - Auto create ticket!
      autoCreateTicket(node);
    }
  };

  // Handle going back in the issue tree or steps
  const handleBack = () => {
    if (step === "SUCCESS") {
      resetWizard();
      return;
    }

    if (step === "ISSUE_SELECT") {
      if (issueTreePath.length > 0) {
        // Pop the last node
        const newPath = [...issueTreePath];
        newPath.pop();
        setIssueTreePath(newPath);
        
        // Restore parent's children or root category issues
        if (newPath.length > 0) {
          const parent = newPath[newPath.length - 1];
          setCurrentIssueList(parent.children || []);
        } else {
          setCurrentIssueList(selectedCategory?.issues || []);
        }
        return;
      } else {
        // At root of issue select, go back to order or category
        if (selectedCategory?.requiresOrderContext) {
          setStep("ORDER_SELECT");
        } else {
          setStep("CATEGORY_SELECT");
        }
        return;
      }
    }

    if (step === "ORDER_SELECT" || step === "OTHER_ENTRY") {
      setStep("CATEGORY_SELECT");
      return;
    }

    navigate(-1);
  };

  const autoCreateTicket = async (issueNode: IssueNode) => {
    if (!selectedCategory || isSubmitting) return;
    
    // Determine priority
    let priority: "low"|"medium"|"high"|"critical" = "medium";
    if (issueNode.priority === "Low") priority = "low";
    if (issueNode.priority === "High") priority = "high";
    if (issueNode.priority === "Critical") priority = "critical";

    const fullIssuePathStr = issueTreePath.map(n => n.label).concat(issueNode.label).join(" > ");
    
    setIsSubmitting(true);
    try {
      const result: any = await submitTicket.mutateAsync({
        category: "other", // Default mapping
        priority,
        subject: `[${selectedCategory.title}] ${issueNode.label}`,
        description: [
          `Category: ${selectedCategory.title}`,
          `Specific Issue: ${fullIssuePathStr}`,
          selectedOrder ? `Attached Order ID: ${selectedOrder.id}` : "",
          selectedOrder ? `Service: ${selectedOrder.testName} at ${selectedOrder.centerName}` : ""
        ].filter(Boolean).join("\n"),
      });

      const returnedId = result?.id || result?.ticket?.id;
      const returnedNumber = result?.ticket_number || result?.ticket?.ticket_number;
      setCreatedTicket({
        id: returnedId || returnedNumber || "PENDING",
        ticket_number: returnedNumber || "PENDING",
        categoryName: selectedCategory.title,
        specificIssue: fullIssuePathStr,
        status: "Open"
      } as any);
      setStep("SUCCESS");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOtherTicket = async () => {
    if (!description.trim() || !selectedCategory || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const result: any = await submitTicket.mutateAsync({
        category: "other",
        priority: "medium",
        subject: `[${selectedCategory.title}] Manual Entry`,
        description: [
          `Category: ${selectedCategory.title}`,
          selectedOrder ? `Attached Order ID: ${selectedOrder.id}` : "",
          `User Description:\n${description}`
        ].filter(Boolean).join("\n"),
      });

      const returnedId = result?.id || result?.ticket?.id;
      const returnedNumber = result?.ticket_number || result?.ticket?.ticket_number;
      setCreatedTicket({
        id: returnedId || returnedNumber || "PENDING",
        ticket_number: returnedNumber || "PENDING",
        categoryName: selectedCategory.title,
        specificIssue: "Manual Entry",
        status: "Open"
      } as any);
      setStep("SUCCESS");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setStep("CATEGORY_SELECT");
    setSelectedCategoryId(null);
    setSelectedOrder(null);
    setIssueTreePath([]);
    setDescription("");
    setCreatedTicket(null);
  };

  // ----------------------------------------------------
  // RENDERERS
  // ----------------------------------------------------

  const renderCategorySelect = () => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
          placeholder="Search your issue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-4 px-1">Select a problem category</h2>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {filteredCategories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat)}
              className={`w-full flex items-center p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${idx !== filteredCategories.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 mr-4">
                <cat.icon className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-sm font-bold text-slate-900 truncate">{cat.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{cat.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderOrderSelect = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-2">
        <h2 className="text-lg font-black text-slate-900">Which order do you need help with?</h2>
        <p className="text-sm text-slate-500 mt-1">Select a recent order to automatically attach it to your support request.</p>
      </div>

      <div className="space-y-3">
        {MOCK_ORDERS.map(order => (
          <button
            key={order.id}
            onClick={() => handleOrderSelect(order)}
            className="w-full text-left bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:border-blue-200 active:scale-95 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                {order.id}
              </span>
              <span className="text-xs font-medium text-slate-500">{order.date}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">{order.testName}</h3>
            <p className="text-xs text-slate-500 mt-1">{order.centerName}</p>
            
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                {order.status}
              </span>
              <span className="text-xs font-bold text-blue-600 flex items-center">
                Need Help <ChevronRight className="w-3 h-3 ml-1" />
              </span>
            </div>
          </button>
        ))}
        
        <button
          onClick={() => handleOrderSelect(null)}
          className="w-full text-center py-4 text-sm font-bold text-slate-500 active:scale-95 transition-transform"
        >
          My order is not listed here
        </button>
      </div>
    </motion.div>
  );

  const renderIssueSelect = () => {
    // Determine the header title
    let title = "Select Your Issue";
    if (issueTreePath.length > 0) {
      title = issueTreePath[issueTreePath.length - 1].label;
    } else if (selectedCategory) {
      title = `Select ${selectedCategory.title} Issue`;
    }

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="mb-2">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">Please select the option that best describes your problem.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {currentIssueList.map((issue, idx) => {
            const hasChildren = issue.children && issue.children.length > 0;
            return (
              <button
                key={issue.id}
                onClick={() => handleIssueSelect(issue)}
                className={`w-full flex items-center p-5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${idx !== currentIssueList.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-sm font-bold text-slate-900">{issue.label}</h3>
                </div>
                {hasChildren ? (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
    );
  };

  const renderOtherEntry = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-2">
        <h2 className="text-lg font-black text-slate-900">Create Support Ticket</h2>
        <p className="text-sm text-slate-500 mt-1">Please describe your problem in detail so our support team can assist you.</p>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Problem Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px] resize-none"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">Attachments (Optional)</label>
          <button className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 active:bg-slate-50 transition-colors">
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Upload Image or Document</span>
          </button>
        </div>
      </div>

      <button
        onClick={submitOtherTicket}
        disabled={!description.trim() || isSubmitting}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex justify-center items-center gap-2 ${
          description.trim() && !isSubmitting ? 'bg-blue-600 active:scale-[0.98]' : 'bg-slate-300'
        }`}
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Ticket"
        )}
      </button>
    </motion.div>
  );

  const renderSuccess = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="flex flex-col items-center text-center pt-10 pb-6 px-4"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Request Created!</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-[280px]">Your support ticket has been successfully submitted to our team.</p>
      
      {createdTicket && (
        <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-left mb-8">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticket ID</p>
              <p className="text-sm font-bold text-slate-900">{createdTicket.id}</p>
            </div>
            <div className="h-px bg-slate-100 w-full" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</p>
              <p className="text-sm font-medium text-slate-700">{createdTicket.categoryName}</p>
            </div>
            <div className="h-px bg-slate-100 w-full" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Issue</p>
              <p className="text-sm font-medium text-slate-700">{createdTicket.specificIssue}</p>
            </div>
            <div className="h-px bg-slate-100 w-full" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Open</span>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Response</p>
                 <p className="text-xs font-medium text-slate-600">Within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full space-y-3">
        <button 
          onClick={() => navigate(`/support/ticket/${createdTicket?.id}`)}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-[0.98] transition-transform shadow-sm shadow-blue-200"
        >
          Track Ticket
        </button>
        <button 
          onClick={resetWizard}
          className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold active:scale-[0.98] transition-transform"
        >
          Back to Help & Support
        </button>
      </div>
    </motion.div>
  );

  return (
    <MobileLayout className="bg-slate-50 min-h-screen pb-10" showNav={false}>
      {/* Dynamic Header */}
      <div className="bg-slate-50 px-4 pt-6 pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-700 active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Help & Support</h1>
              {step === "CATEGORY_SELECT" && (
                <p className="text-xs font-medium text-slate-500 mt-0.5">How can we help you?</p>
              )}
              {step !== "CATEGORY_SELECT" && step !== "SUCCESS" && (
                <p className="text-[11px] font-bold text-blue-600 mt-0.5 uppercase tracking-widest">
                  Step {step === "ORDER_SELECT" ? 2 : step === "ISSUE_SELECT" ? 3 : 4} of 4
                </p>
              )}
            </div>
          </div>
          
          {step === "CATEGORY_SELECT" && (
            <button 
              onClick={() => navigate('/support/history')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-700 active:scale-95 transition-transform shrink-0"
            >
              <History className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2">
        <AnimatePresence mode="wait">
          {step === "CATEGORY_SELECT" && <motion.div key="category">{renderCategorySelect()}</motion.div>}
          {step === "ORDER_SELECT" && <motion.div key="order">{renderOrderSelect()}</motion.div>}
          {step === "ISSUE_SELECT" && <motion.div key="issue">{renderIssueSelect()}</motion.div>}
          {step === "OTHER_ENTRY" && <motion.div key="other">{renderOtherEntry()}</motion.div>}
          {step === "SUCCESS" && <motion.div key="success">{renderSuccess()}</motion.div>}
        </AnimatePresence>
      </div>
      {isSubmitting && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-progress-title"
          aria-describedby="ticket-progress-description"
        >
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            </div>
            <h2 id="ticket-progress-title" className="text-xl font-black text-foreground">
              Creating your request…
            </h2>
            <p id="ticket-progress-description" className="mt-2 text-sm font-medium text-muted-foreground">
              Please hold on while we securely send your request to our support team.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </MobileLayout>
  );
};

export default SupportScreen;
