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
      "We collect details provided while using BloodLyn: name, mobile, email, age, gender, addresses, PIN code, family member profiles, uploaded prescriptions, and your complete booking history (labs, doctors, physio, BP, ECG).",
  },
  {
    title: "2. How We Use Your Data",
    icon: UserCheck,
    accent: "text-emerald-500",
    content:
      "Your data is used strictly to fulfill your bookings (diagnostic tests, home sample collections, doctor/physiotherapist consultations), deliver reports, run AI explanations, and provide support. We never sell health data to advertisers.",
  },
  {
    title: "3. Sharing With Healthcare Partners",
    icon: Share2,
    accent: "text-amber-500",
    content:
      "When you place an order or book a consult, only necessary information (patient details, address, booked service) is shared securely with the specific partner lab, phlebotomist, doctor, or physiotherapist fulfilling your request.",
  },
  {
    title: "4. Medical Records & Prescriptions",
    icon: Shield,
    accent: "text-purple-500",
    content:
      "Prescriptions uploaded for booking assistance are processed securely to extract test requirements. We maintain strict confidentiality of your medical records and they are only accessible by you and authorized medical personnel.",
  },
  {
    title: "5. Data Security",
    icon: Lock,
    accent: "text-rose-500",
    content:
      "Data is transmitted over HTTPS and stored securely with Row Level Security, ensuring records are readable only by your authenticated account. Payment details are handled directly by payment gateways and never stored by us.",
  },
  {
    title: "6. Data Retention",
    icon: Clock,
    accent: "text-indigo-500",
    content:
      "Booking records, health reports, and invoices are retained while your account is active to provide you with a continuous health history. You may request removal of specific reports at any time via support.",
  },
  {
    title: "7. Notifications & Updates",
    icon: Bell,
    accent: "text-sky-500",
    content:
      "We send essential transactional messages regarding OTP logins, order statuses, consultation links (for online audio/video calls), collection ETAs, and report availability via SMS, WhatsApp, or push notifications.",
  },
  {
    title: "8. Account Deletion & Rights",
    icon: Trash2,
    accent: "text-red-500",
    content:
      "You can delete your account from your Profile at any time, which permanently removes your personal data, addresses, and family members. You may also request a data export or correction by contacting support.",
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold tracking-wide uppercase mb-3">
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
              className="p-5 rounded-3xl bg-/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] transition-all duration-300 group"
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
