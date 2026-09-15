import {
  ShoppingBag,
  TestTube,
  Home,
  FileText,
  Stethoscope,
  Activity,
  CreditCard,
  Wallet,
  Gift,
  User,
  Truck,
  HelpCircle
} from "lucide-react";
import { SupportCategory, IssueNode } from "@/types/support";

const orderIssues: IssueNode[] = [
  {
    id: "sample_collection",
    label: "Sample Collection Issue",
    children: [
      { id: "agent_not_arrived", label: "Collection agent has not arrived", priority: "High" },
      { id: "collection_delayed", label: "Collection delayed", priority: "High" },
      { id: "sample_not_collected", label: "Sample not collected", priority: "High" },
      { id: "sample_rejected", label: "Sample rejected", priority: "High" },
      { id: "wrong_sample", label: "Wrong sample collected", priority: "High" },
      { id: "agent_issue", label: "Collection agent issue", priority: "Normal" },
      { id: "address_issue", label: "Address/location issue", priority: "Normal" },
      { id: "other_collection", label: "Other collection issue", priority: "Normal" }
    ]
  },
  {
    id: "cancellation",
    label: "Cancellation",
    children: [
      { id: "unable_to_cancel", label: "Unable to cancel order", priority: "Normal" },
      { id: "cancellation_failed", label: "Cancellation Failed", priority: "High" },
      { id: "cancelled_by_mistake", label: "Cancelled by mistake", priority: "Normal" }
    ]
  },
  { id: "not_confirmed", label: "Order not confirmed", priority: "High" },
  { id: "delayed", label: "Order delayed", priority: "High" },
  { id: "wrong_test", label: "Wrong test/service", priority: "High" },
  { id: "unable_reschedule", label: "Unable to reschedule", priority: "Normal" },
  { id: "order_status", label: "Order status problem", priority: "Normal" },
  { id: "refund_order", label: "Refund related to order", priority: "High" },
  { id: "other_order", label: "Other order issue", priority: "Normal" }
];

const walletIssues: IssueNode[] = [
  {
    id: "wallet_transaction",
    label: "Wallet Transaction",
    children: [
      { id: "deducted_not_updated", label: "Money Deducted but Balance Not Updated", priority: "Critical" },
      { id: "unauthorized_tx", label: "Unauthorized wallet transaction", priority: "Critical" },
      { id: "refund_not_received", label: "Refund not received in wallet", priority: "High" },
      { id: "unable_to_add", label: "Unable to add money", priority: "Normal" }
    ]
  },
  { id: "wallet_locked", label: "Wallet locked/blocked", priority: "High" },
  { id: "kyc_issue", label: "KYC/Verification issue", priority: "Normal" }
];

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: "order_related",
    title: "Order Related",
    subtitle: "Problems with your test or service order",
    icon: ShoppingBag,
    requiresOrderContext: true,
    issues: orderIssues
  },
  {
    id: "diagnostic_test",
    title: "Diagnostic Test",
    subtitle: "Problems related to tests or diagnostic services",
    icon: TestTube,
    requiresOrderContext: true,
    issues: orderIssues // Reusing order issues tree for simplicity as it covers tests
  },
  {
    id: "home_sample",
    title: "Home Sample Collection",
    subtitle: "Problems with sample collection",
    icon: Home,
    requiresOrderContext: true,
    issues: orderIssues[0].children // Direct access to sample collection issues
  },
  {
    id: "report_related",
    title: "Report Related",
    subtitle: "Problems with reports or results",
    icon: FileText,
    requiresOrderContext: true,
    issues: [
      { id: "report_delayed", label: "Report delayed", priority: "High" },
      { id: "report_access", label: "Medical report access problem", priority: "Critical" },
      { id: "wrong_report", label: "Wrong report uploaded", priority: "Critical" },
      { id: "understanding_report", label: "Help understanding report", priority: "Normal" }
    ]
  },
  {
    id: "doctor_consult",
    title: "Doctor Consultation",
    subtitle: "Problems with online doctor consultation",
    icon: Stethoscope,
    requiresOrderContext: true,
    issues: [
      { id: "doctor_no_show", label: "Doctor did not join", priority: "High" },
      { id: "call_dropped", label: "Call dropped/technical issue", priority: "High" },
      { id: "prescription_issue", label: "Prescription not received", priority: "High" },
      { id: "reschedule_consult", label: "Need to reschedule", priority: "Normal" }
    ]
  },
  {
    id: "physiotherapy",
    title: "Physiotherapy",
    subtitle: "Problems related to physiotherapy services",
    icon: Activity,
    requiresOrderContext: true,
    issues: [
      { id: "therapist_no_show", label: "Therapist did not arrive", priority: "High" },
      { id: "service_quality", label: "Service quality issue", priority: "Normal" }
    ]
  },
  {
    id: "payment_related",
    title: "Payment Related",
    subtitle: "Problems with payments or transactions",
    icon: CreditCard,
    requiresOrderContext: false,
    issues: [
      { id: "payment_deducted_no_order", label: "Payment deducted but order not created", priority: "Critical" },
      { id: "double_charge", label: "Charged twice for same order", priority: "High" },
      { id: "payment_failed", label: "Payment keeps failing", priority: "Normal" },
      { id: "invoice_issue", label: "Need invoice/receipt", priority: "Low" }
    ]
  },
  {
    id: "wallet_related",
    title: "Wallet Related",
    subtitle: "Problems with BloodLyn Wallet",
    icon: Wallet,
    requiresOrderContext: false,
    issues: walletIssues
  },
  {
    id: "cashback_coupon",
    title: "Cashback / Coupon",
    subtitle: "Problems with cashback, offers or coupons",
    icon: Gift,
    requiresOrderContext: false,
    issues: [
      { id: "coupon_invalid", label: "Coupon code not working", priority: "Normal" },
      { id: "cashback_not_received", label: "Cashback not received", priority: "Normal" },
      { id: "offer_not_applied", label: "Offer discount not applied", priority: "Normal" }
    ]
  },
  {
    id: "account_related",
    title: "Account Related",
    subtitle: "Problems with your BloodLyn account",
    icon: User,
    requiresOrderContext: false,
    issues: [
      { id: "login_issue", label: "Unable to login/OTP issue", priority: "High" },
      { id: "profile_update", label: "Cannot update profile", priority: "Normal" },
      { id: "delete_account", label: "Want to delete account", priority: "Normal" },
      { id: "family_member", label: "Family member profile issue", priority: "Normal" }
    ]
  },
  {
    id: "delivery_service",
    title: "Delivery / Service",
    subtitle: "Problems with delivery or service availability",
    icon: Truck,
    requiresOrderContext: false,
    issues: [
      { id: "not_serviceable", label: "Location not serviceable", priority: "Normal" },
      { id: "delivery_delayed", label: "Delivery delayed", priority: "High" }
    ]
  },
  {
    id: "other",
    title: "Other",
    subtitle: "Something else? Tell us what happened.",
    icon: HelpCircle,
    requiresOrderContext: false
  }
];

export const MOCK_ORDERS = [
  {
    id: "BL20260915001",
    testName: "CBC + Lipid Profile",
    centerName: "ABC Diagnostic Center",
    date: "15 Sep 2026",
    time: "08:00 AM - 09:00 AM",
    type: "Home Collection",
    status: "Collection Pending"
  },
  {
    id: "BL20260914088",
    testName: "Full Body Checkup Basic",
    centerName: "Apollo Diagnostics",
    date: "14 Sep 2026",
    time: "09:00 AM - 10:00 AM",
    type: "Home Collection",
    status: "Report Uploaded"
  },
  {
    id: "BL20260910045",
    testName: "General Physician Consultation",
    centerName: "Dr. Sarah Jenkins",
    date: "10 Sep 2026",
    time: "11:30 AM",
    type: "Video Consult",
    status: "Completed"
  }
];
