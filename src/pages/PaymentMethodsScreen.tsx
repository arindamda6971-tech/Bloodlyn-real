import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Wallet, Building, Smartphone, ChevronRight, Check, Banknote, QrCode, Clock } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
}

const paymentMethods: PaymentMethod[] = [
  // UPI
  { id: "gpay", name: "Google Pay", description: "UPI", icon: <Smartphone className="w-5 h-5 text-primary" />, category: "UPI" },
  { id: "phonepe", name: "PhonePe", description: "UPI", icon: <Smartphone className="w-5 h-5 text-primary" />, category: "UPI" },
  { id: "paytm", name: "Paytm UPI", description: "UPI", icon: <Smartphone className="w-5 h-5 text-primary" />, category: "UPI" },
  { id: "upi_id", name: "Other UPI ID", description: "Enter UPI ID", icon: <QrCode className="w-5 h-5 text-primary" />, category: "UPI" },
  // Cards
  { id: "credit_card", name: "Credit / Debit Card", description: "Visa, Mastercard, Rupay", icon: <CreditCard className="w-5 h-5 text-primary" />, category: "CARDS" },
  // Wallets
  { id: "paytm_wallet", name: "Paytm Wallet", icon: <Wallet className="w-5 h-5 text-primary" />, category: "WALLETS" },
  { id: "amazon_pay", name: "Amazon Pay", icon: <Wallet className="w-5 h-5 text-primary" />, category: "WALLETS" },
  { id: "mobikwik", name: "Mobikwik", icon: <Wallet className="w-5 h-5 text-primary" />, category: "WALLETS" },
  { id: "freecharge", name: "Freecharge", icon: <Wallet className="w-5 h-5 text-primary" />, category: "WALLETS" },
  // Net Banking
  { id: "netbanking", name: "Net Banking", description: "All major banks", icon: <Building className="w-5 h-5 text-primary" />, category: "NET BANKING" },
  // Pay Later
  { id: "simpl", name: "Simpl", description: "Pay later", icon: <Clock className="w-5 h-5 text-primary" />, category: "PAY LATER" },
  { id: "lazypay", name: "LazyPay", description: "Pay later", icon: <Clock className="w-5 h-5 text-primary" />, category: "PAY LATER" },
  // COD
  { id: "cod", name: "Pay on Delivery", description: "UPI / Cash", icon: <Banknote className="w-5 h-5 text-primary" />, category: "CASH ON DELIVERY" },
];

const PaymentMethodsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMethod = (location.state as any)?.selectedMethod || "cod";
  const [selected, setSelected] = useState(currentMethod);

  const categories = [...new Set(paymentMethods.map(m => m.category))];

  const handleSelect = (methodId: string) => {
    setSelected(methodId);
    const method = paymentMethods.find(m => m.id === methodId);
    // Navigate back with the selected method
    navigate(-1);
    // Use a small timeout so the navigation completes, then update via sessionStorage
    sessionStorage.setItem("bloodlyn-selected-payment", JSON.stringify({ id: methodId, name: method?.name || "" }));
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title={`Bill Total: ₹${(location.state as any)?.total || 0}`} />

      <div className="px-4 mt-2 pb-8">
        {categories.map((category) => (
          <div key={category} className="mb-5">
            <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">{category}</p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {paymentMethods
                .filter(m => m.category === category)
                .map((method) => (
                  <motion.button
                    key={method.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(method.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{method.name}</p>
                      {method.description && (
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      )}
                    </div>
                    {selected === method.id ? (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </motion.button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </MobileLayout>
  );
};

export default PaymentMethodsScreen;
