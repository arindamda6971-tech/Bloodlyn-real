import { 
  User, Shield, ShieldCheck, Settings, AlertTriangle,
  FileText, Activity, Stethoscope, Droplet, UserPlus, FileHeart,
  Truck, CreditCard, Wallet, RefreshCw, Gift, Tag, ActivityIcon,
  Users, MapPin, KeyRound, Trash2
} from "lucide-react";
import { ReactNode } from "react";

export type PolicyCategory = {
  id: string;
  title: string;
  policies: Policy[];
};

export type Policy = {
  id: string;
  title: string;
  subtitle: string;
  icon: any; // Lucide icon
  lastUpdated: string;
  content: ReactNode;
};

// Common dummy text for un-implemented policies
const dummyContent = (
  <div className="space-y-4 text-sm text-slate-600">
    <p>This policy is currently being updated. Please check back later for the full details.</p>
    <p>For any immediate questions, please contact our support team.</p>
  </div>
);

export const POLICY_CATEGORIES: PolicyCategory[] = [
  {
    id: "general",
    title: "GENERAL",
    policies: [
      {
        id: "user-terms",
        title: "User Terms & Conditions",
        subtitle: "Terms that apply when using BloodLyn",
        icon: User,
        lastUpdated: "April 2026",
        content: (
          <div className="space-y-6 text-sm text-slate-600">
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">1. Eligibility</h3>
              <p>You must be at least 18 years old to create an account and use BloodLyn services. By using the app, you represent and warrant that you meet this requirement.</p>
            </section>
            
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">2. Account Registration</h3>
              <p>To access most features, you must register for an account using a valid mobile number and OTP. You are responsible for maintaining the confidentiality of your account.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">3. OTP & Login</h3>
              <p>Your account is secured via OTP verification. Do not share your OTP with anyone. BloodLyn will never call you to ask for your OTP.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">4. User Responsibilities</h3>
              <p>You agree to use BloodLyn only for lawful purposes. You must not use the platform to harass, abuse, or harm another person, or to interfere with the proper working of the application.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">5. Accuracy of Information</h3>
              <p>You must provide accurate and up-to-date information, especially regarding your health records, delivery addresses, and family member details. BloodLyn is not liable for issues arising from incorrect information.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">6. Use of BloodLyn Services</h3>
              <p>BloodLyn acts as a technology platform connecting users with diagnostic labs, doctors, and healthcare providers. We do not directly provide medical services.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">7. Prohibited Activities</h3>
              <p>Creating fake accounts, booking fraudulent tests, reverse engineering the app, and uploading malicious content are strictly prohibited.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">8. Payments</h3>
              <p>All payments must be made through the approved payment gateways within the app. Prices are subject to change without prior notice.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">9. Cancellation & Refunds</h3>
              <p>Cancellations and refunds are governed by our Refund Policy and Order Terms. Fees may apply for late cancellations.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">10. Third-Party Services</h3>
              <p>BloodLyn integrates with third-party labs, doctors, and payment providers. We are not responsible for their independent actions, though we strive to ensure quality.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">11. Account Suspension & Termination</h3>
              <p>BloodLyn reserves the right to suspend or terminate your account if you violate these terms or engage in fraudulent activity.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">12. Changes to Terms</h3>
              <p>We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">13. Contact & Grievance Support</h3>
              <p>For any grievances, please contact our support team through the Help & Support section in the app.</p>
            </section>
          </div>
        )
      },
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        subtitle: "How we collect, use and protect your data",
        icon: Shield,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "data-security",
        title: "Data & Security Policy",
        subtitle: "How your information is stored and protected",
        icon: ShieldCheck,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "cookies-policy",
        title: "Cookies & Tracking Policy",
        subtitle: "Information about cookies and tracking technologies",
        icon: Settings,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "disclaimer",
        title: "Disclaimer",
        subtitle: "Important information about BloodLyn services",
        icon: AlertTriangle,
        lastUpdated: "April 2026",
        content: dummyContent
      }
    ]
  },
  {
    id: "orders-services",
    title: "ORDERS & SERVICES",
    policies: [
      {
        id: "order-terms",
        title: "Order Terms & Conditions",
        subtitle: "Rules related to placing and managing orders",
        icon: FileText,
        lastUpdated: "April 2026",
        content: (
          <div className="space-y-6 text-sm text-slate-600">
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">1. Order Placement</h3>
              <p>Orders can be placed through the BloodLyn app by selecting the desired tests, profiles, or packages. An order is only considered valid once payment is successfully processed or Cash on Collection is confirmed.</p>
            </section>
            
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">2. Order Confirmation</h3>
              <p>You will receive an in-app notification and SMS/Email confirming your order details and the scheduled slot for sample collection.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">3. Service Availability</h3>
              <p>All services are subject to pin code serviceability and slot availability. If a selected slot becomes unavailable, our support team will contact you to reschedule.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">4. Diagnostic Test Availability</h3>
              <p>Tests are performed by our partner labs. We do not guarantee that all tests will be available at all times. Test methodology is determined by the partner lab.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">5. Home Sample Collection</h3>
              <p>A certified phlebotomist will arrive at your provided address within the scheduled time slot. You must ensure you follow any pre-test preparations (e.g., fasting).</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">6. Rescheduling</h3>
              <p>Orders can be rescheduled up to 2 hours before the collection slot through the "My Bookings" section without any penalty.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">7. Cancellation</h3>
              <p>Orders cancelled prior to the phlebotomist being dispatched are eligible for a full refund. Cancellations made after the phlebotomist has reached the location may incur a visit charge.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">8. Failed Collection</h3>
              <p>If sample collection fails due to patient unavailability, improper preparation, or unreachable address, a re-visit fee may apply.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">9. Sample Rejection</h3>
              <p>Labs may reject samples if they are hemolyzed, clotted, or insufficient. In such cases, a free re-collection will be scheduled.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">10. Report Delivery</h3>
              <p>Digital reports will be uploaded to your BloodLyn app within the turnaround time (TAT) specified for each test.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">11. Delayed Reports</h3>
              <p>While we strive to meet TATs, delays may occur due to technical issues at the lab or complex test requirements. BloodLyn is not liable for medical delays caused by delayed reports.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">12. Refund Rules</h3>
              <p>Refunds for cancelled or unfulfilled orders are processed back to the original payment method or the BloodLyn Wallet within 3-5 business days.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">13. Order Disputes</h3>
              <p>Any disputes regarding the service or reports must be raised within 7 days of report generation.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">14. Diagnostic Center / Partner Responsibilities</h3>
              <p>Our partner labs are solely responsible for the medical accuracy of the tests, sample processing, and report generation.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">15. User Responsibilities</h3>
              <p>You must provide a safe environment for the phlebotomist and accurate medical history if requested prior to the test.</p>
            </section>
          </div>
        )
      },
      {
        id: "diagnostic-policy",
        title: "Diagnostic Test Policy",
        subtitle: "Terms related to diagnostic and laboratory tests",
        icon: Activity,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "home-sample-policy",
        title: "Home Sample Collection Policy",
        subtitle: "Rules for doorstep sample collection",
        icon: Droplet,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "report-policy",
        title: "Report & Result Policy",
        subtitle: "Information about reports, results and delivery",
        icon: FileHeart,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "doctor-consult-terms",
        title: "Doctor Consultation Terms",
        subtitle: "Terms for online doctor consultations",
        icon: Stethoscope,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "physiotherapy-terms",
        title: "Physiotherapy Terms",
        subtitle: "Terms related to physiotherapy services",
        icon: UserPlus,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "delivery-service-policy",
        title: "Delivery & Service Policy",
        subtitle: "Delivery, service availability and partner responsibilities",
        icon: Truck,
        lastUpdated: "April 2026",
        content: dummyContent
      }
    ]
  },
  {
    id: "payments-wallet",
    title: "PAYMENTS & WALLET",
    policies: [
      {
        id: "payment-policy",
        title: "Payment Policy",
        subtitle: "Payment methods and transaction rules",
        icon: CreditCard,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "wallet-policy",
        title: "BloodLyn Wallet Policy",
        subtitle: "How your wallet balance works",
        icon: Wallet,
        lastUpdated: "April 2026",
        content: (
          <div className="space-y-6 text-sm text-slate-600">
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">1. What is BloodLyn Wallet?</h3>
              <p>The BloodLyn Wallet is a closed-loop digital wallet system designed specifically for the BloodLyn platform. It allows users to store funds for quick checkouts and receive promotional cashbacks.</p>
            </section>
            
            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">2. How to Add Money</h3>
              <p>You can add funds to your wallet using supported Payment Gateways via UPI, Credit/Debit cards, or Net Banking. BloodLyn does not store your card details directly.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">3. How Wallet Balance Can Be Used</h3>
              <p>Wallet balance can be used to pay for up to 100% of your cart value for diagnostic tests, consultations, and other services on the BloodLyn app. Wallet funds cannot be used to purchase subscription plans unless explicitly stated.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">4. Wallet Payment Rules</h3>
              <p>If your wallet balance is insufficient to cover the total order cost, you can pay the remaining amount using other available payment methods.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">5. Refunds to Wallet</h3>
              <p>By default, refunds for cancelled orders are instantly credited to your BloodLyn Wallet to ensure immediate availability of funds. You may request a transfer to the original payment source by contacting support.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">6. Cashback Credits</h3>
              <p>Promotional cashbacks are credited as "Bonus Wallet Balance". Bonus balance may have an expiration date and usage limits (e.g., maximum 10% per transaction) as determined by specific promotional rules.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">7. Wallet Transaction History</h3>
              <p>All wallet transactions, including deposits, deductions, and refunds, are recorded and visible in the Wallet section of the app.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">8. Failed Transactions</h3>
              <p>If money is deducted from your bank but not added to your wallet, the amount is usually auto-refunded by your bank within 3-5 working days.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">9. Unauthorized Transactions</h3>
              <p>If you notice an unauthorized wallet deduction, you must report it to BloodLyn Support within 24 hours. We will investigate and suspend the wallet if necessary.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">10. Wallet Withdrawal Rules</h3>
              <p>Wallet balances are generally non-transferable and non-withdrawable to bank accounts as per closed-loop wallet regulations, except for explicit order refunds.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">11. Account Closure and Wallet Balance</h3>
              <p>If you choose to delete your BloodLyn account, you must utilize your wallet balance before deletion. Unused balances will be forfeited upon account closure.</p>
            </section>

            <section>
              <h3 className="text-base font-bold text-slate-900 mb-2">12. Dispute & Support</h3>
              <p>For any wallet-related disputes, please raise a ticket via the Help & Support section. All wallet rules depend on BloodLyn's internal business logic and are subject to change.</p>
            </section>
          </div>
        )
      },
      {
        id: "refund-policy",
        title: "Refund & Cancellation Policy",
        subtitle: "Cancellation, refund and wallet refund rules",
        icon: RefreshCw,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "cashback-policy",
        title: "Cashback & Rewards Policy",
        subtitle: "Rules for cashback, credits and rewards",
        icon: Gift,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "offers-policy",
        title: "Offers & Coupon Policy",
        subtitle: "Terms for promotional offers and coupons",
        icon: Tag,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "wallet-transaction-policy",
        title: "Wallet Transaction Policy",
        subtitle: "Wallet transactions, failed payments and disputes",
        icon: ActivityIcon,
        lastUpdated: "April 2026",
        content: dummyContent
      }
    ]
  },
  {
    id: "account",
    title: "ACCOUNT",
    policies: [
      {
        id: "family-member-policy",
        title: "Family Member Policy",
        subtitle: "Rules for managing family member profiles",
        icon: Users,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "saved-address-policy",
        title: "Saved Address Policy",
        subtitle: "Terms related to saved delivery addresses",
        icon: MapPin,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "account-login-policy",
        title: "Account & Login Policy",
        subtitle: "Account security, OTP and login rules",
        icon: KeyRound,
        lastUpdated: "April 2026",
        content: dummyContent
      },
      {
        id: "account-deletion-policy",
        title: "Account Deletion Policy",
        subtitle: "How to deactivate or delete your BloodLyn account",
        icon: Trash2,
        lastUpdated: "April 2026",
        content: dummyContent
      }
    ]
  }
];

export const getPolicyById = (id: string): Policy | undefined => {
  for (const category of POLICY_CATEGORIES) {
    const policy = category.policies.find(p => p.id === id);
    if (policy) return policy;
  }
  return undefined;
};
