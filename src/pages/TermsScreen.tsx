import { motion } from "framer-motion";
import { ShieldCheck, Scale, FileText, Lock, AlertCircle, Sparkles } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";

const sections = [
  {
    title: "1. Acceptance of Terms",
    icon: Scale,
    content: "By accessing and using BloodLyn / HealthSwift, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the application.",
    accent: "text-blue-500",
  },
  {
    title: "2. Premium Services",
    icon: Sparkles,
    content: "BloodLyn provides diagnostic test booking, at-home sample collection, AI-powered health reports, and professional doctor consultation services. All services are subject to real-time availability in your service area.",
    accent: "text-purple-500",
  },
  {
    title: "3. User Responsibilities",
    icon: FileText,
    content: "You are responsible for providing accurate personal and medical information. Misuse of the platform, including fraudulent bookings, may result in immediate account suspension.",
    accent: "text-amber-500",
  },
  {
    title: "4. Payments & Refunds",
    icon: ShieldCheck,
    content: "All payments are processed securely via encrypted gateways. Refunds for cancelled orders are subject to our verified cancellation policy. Orders cancelled before sample collection may be eligible for a full refund.",
    accent: "text-emerald-500",
  },
  {
    title: "5. Privacy & Secure Data",
    icon: Lock,
    content: "Your health data is 256-bit encrypted and stored securely. We never share your personal information with unauthorized third parties without your explicit consent, except as required by law.",
    accent: "text-rose-500",
  },
  {
    title: "6. Limitation of Liability",
    icon: AlertCircle,
    content: "BloodLyn is not a substitute for professional in-hospital medical emergencies. Always consult your primary healthcare provider for immediate medical decisions. We are not liable for any health outcomes based on preliminary reports or AI insights.",
    accent: "text-indigo-500",
  },
];

const TermsScreen = () => {
  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Terms & Conditions" />
      
      <div className="px-4 pb-32 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Legal Agreements"
          subtitle="Commitment to transparency & trust"
          icon={Scale}
          accent="from-purple-600 via-indigo-600 to-blue-600"
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_10px_30px_-10px_rgba(30,27,75,0.5)] relative overflow-hidden border border-white/10"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3 text-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Consumer Protection</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              Secure, Transparent &amp;<br />Patient-Centric Policies
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-[90%] leading-relaxed">
              Please read our terms carefully to understand your rights, data privacy security, and active consumer protections.
            </p>
          </div>
        </motion.div>

        <div className="mt-6 space-y-4">
          {sections.map((section, index) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-3.5 mb-2.5">
                <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border group-hover:scale-105 transition-transform duration-300">
                  <section.icon className={`w-5 h-5 ${section.accent}`} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{section.title}</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-13 font-medium">
                {section.content}
              </p>
            </motion.section>
          ))}

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-5 rounded-3xl bg-primary/5 border border-primary/20 text-center"
          >
            <h3 className="text-sm font-bold text-foreground mb-1">Have Questions?</h3>
            <p className="text-xs text-muted-foreground font-medium mb-3">Reach out to our compliance and support team anytime.</p>
            <p className="text-xs font-bold text-primary">+91 9883143033 • WhatsApp Support</p>
          </motion.section>

          <p className="text-xs text-muted-foreground text-center pt-4 font-semibold">
            Last updated: April 2026
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default TermsScreen;
