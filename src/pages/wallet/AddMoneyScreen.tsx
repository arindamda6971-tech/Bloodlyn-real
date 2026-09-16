import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, ShieldCheck, CreditCard, Landmark } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { walletService } from "@/lib/walletService";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

const AddMoneyScreen = () => {
  useSEO({ title: "Add Money to Wallet | BloodLyn", description: "Recharge your BloodLyn wallet." });
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      const { wallet } = await walletService.getWallet(user.id);
      if (wallet) {
        setBalance(wallet.available_balance);
      }
    };
    fetchBalance();
  }, [user?.id]);

  const handleAmountSelect = (val: number) => {
    setAmount(val.toString());
  };

  const handleContinue = async () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!user?.id) {
      toast.error("User not found");
      return;
    }

    setIsProcessing(true);

    // Simulated Payment Gateway Flow
    try {
      // In a real app, this redirects to a Payment Gateway UI.
      // We simulate successful callback after 1.5s
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const res = await walletService.addMoney(user.id, numAmount, 'UPI / Online Payment');
      
      if (res.success) {
        toast.success(`₹${numAmount} successfully added to your wallet!`);
        navigate('/wallet', { replace: true });
      } else {
        toast.error("Failed to add money to wallet");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MobileLayout className="bg-slate-50 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 px-4 pt-6 pb-4 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-slate-100 transition-colors" disabled={isProcessing}>
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-black text-slate-900 tracking-tight">Add Money</h1>
      </div>

      <div className="flex-1 px-4 py-6">
        
        {/* Current Balance */}
        <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              <Wallet className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Current Balance</p>
              <p className="text-base font-black text-slate-900">₹{balance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Enter Amount</label>
          <div className="flex items-center bg-slate-50 rounded-2xl px-4 py-3 mb-6 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
            <span className="text-4xl font-black text-slate-900">₹</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAmount(val);
              }}
              className="w-full pl-2 text-4xl font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="0"
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAmountSelect(val)}
                disabled={isProcessing}
                className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                  amount === val.toString() 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 mb-10">
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">100% Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <CreditCard className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">All Cards</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <Landmark className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">UPI & Net</span>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!amount || isProcessing}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing Payment...
            </>
          ) : (
            `Continue to Pay ₹${amount || '0'}`
          )}
        </button>

      </div>
    </MobileLayout>
  );
};

export default AddMoneyScreen;
