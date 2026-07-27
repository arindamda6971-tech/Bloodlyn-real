import { motion } from "framer-motion";
import { Shield, Database, Share2, Lock, Clock, UserCheck, Bell, Trash2 } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";

const sections = [
  {
    title: "1. Information We Collect",
    icon: Database,
    accent: "text-blue-500",
    content:
      "We collect the details you provide while using BloodLyn: your name, mobile number, email, age, gender, saved addresses and PIN code, family member profiles you create, prescriptions you upload for scanning, and your booking, payment and consultation history.",
  },
  {
    title: "2. How We Use Your Data",
    icon: UserCheck,
    accent: "text-emerald-500",
    content:
      "Your data is used to book diagnostic tests, schedule at-home sample collection, route orders to the diagnostic centre you select, deliver lab reports, run AI report explanations, and provide customer support. We do not sell your health data to advertisers.",
  },
  {
    title: "3. Sharing With Diagnostic Partners",
    icon: Share2,
    accent: "text-amber-500",
    content:
      "When you place an order, only the information needed to fulfil it — patient name, age, gender, contact number, visit address, and the tests booked — is shared with the partner lab, phlebotomist or doctor you selected. Nothing is shared with labs you did not book.",
  },
  {
    title: "4. Prescription Scanning",
    icon: Shield,
    accent: "text-purple-500",
    content:
      "Prescription images you upload are processed only to extract test names and are not stored permanently on our servers. The scanned image is discarded once matching is complete; only the resulting test selections stay in your cart.",
  },
  {
    title: "5. Security",
    icon: Lock,
    accent: "text-rose-500",
    content:
      "Data is transmitted over HTTPS and stored in a Supabase Postgres database protected by Row Level Security, so your records are only readable by your own authenticated account. Payment card details are handled by the payment gateway and never stored by BloodLyn.",
  },
  {
    title: "6. Data Retention",
    icon: Clock,
    accent: "text-indigo-500",
    content:
      "Orders, reports and invoices are retained while your account is active so you can access your health history. You may request removal of individual reports at any time by contacting support.",
  },
  {
    title: "7. Notifications",
    icon: Bell,
    accent: "text-sky-500",
    content:
      "We send transactional messages about OTP login, order status, collection ETA and report availability via SMS, WhatsApp or push notification. These are service messages required to run your booking.",
  },
  {
    title: "8. Account Deletion & Your Rights",
    icon: Trash2,
    accent: "text-red-500",
    content:
      "You can delete your account from Profile at any time; this removes your profile, addresses, family members and cart. You may also request a copy or correction of your data by writing to our support team.",
  },
];

const PrivacyPolicyScreen = () => {
  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Privacy Policy" />

      <div className="px-4 pb-32 pt-1">
        <PremiumPageHeader
          title="Your Privacy"
          subtitle="How BloodLyn handles your health data"
          icon={Shield}
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-primary-foreground shadow-[0_10px_30px_-10px_rgba(30,58,138,0.5)] relative overflow-hidden border border-white/10"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Health Data Protection</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              Your reports stay yours.
            </h2>
            <p className="text-xs opacity-80 mt-2 max-w-[92%] leading-relaxed">
              This page is maintained by the BloodLyn team to explain what we collect, why we collect it,
              and who it is shared with when you book a test.
            </p>
          </div>
        </motion.div>

        <div className="mt-6 space-y-4">
          {sections.map((section, index) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + index * 0.06 }}
              className="p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 group"
            >
              <div className="flex items-start gap-3.5 mb-2.5">
                <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border">
                  <section.icon className={`w-5 h-5 ${section.accent}`} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="text-base font-bold text-foreground tracking-tight">{section.title}</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{section.content}</p>
            </motion.section>
          ))}

          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-5 rounded-3xl bg-primary/5 border border-primary/20 text-center"
          >
            <h3 className="text-sm font-bold text-foreground mb-1">Privacy Requests</h3>
            <p className="text-xs text-muted-foreground font-medium mb-3">
              Contact us for data access, correction or deletion requests.
            </p>
            <p className="text-xs font-bold text-primary">+91 9883143033 • WhatsApp Support</p>
          </motion.section>

          <p className="text-xs text-muted-foreground text-center pt-4 font-semibold">
            Last updated: July 2026
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default PrivacyPolicyScreen;
