import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";

const TermsScreen = () => {
  return (
    <MobileLayout>
      <ScreenHeader title="Terms & Conditions" />
      <div className="px-4 pb-8 mt-4 space-y-6">
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing and using BloodLyn, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the application.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">2. Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            BloodLyn provides diagnostic test booking, at-home sample collection, AI-powered health reports, and doctor consultation services. All services are subject to availability in your area.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">3. User Responsibilities</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for providing accurate personal and medical information. Misuse of the platform, including fraudulent bookings, may result in account suspension.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">4. Payments & Refunds</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All payments are processed securely. Refunds for cancelled orders are subject to our cancellation policy. Orders cancelled before sample collection may be eligible for a full refund.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">5. Privacy & Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your health data is encrypted and stored securely. We do not share your personal information with third parties without your consent, except as required by law.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">6. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            BloodLyn is not a substitute for professional medical advice. Always consult your healthcare provider for medical decisions. We are not liable for any health outcomes based on reports or AI insights.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold text-foreground mb-2">7. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these terms, contact us at +91 9883143033 or via WhatsApp.
          </p>
        </section>
        <p className="text-xs text-muted-foreground text-center pt-4">
          Last updated: April 2026
        </p>
      </div>
    </MobileLayout>
  );
};

export default TermsScreen;
