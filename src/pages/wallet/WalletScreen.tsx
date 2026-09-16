import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Search, Filter, Plus, ArrowDownLeft, ArrowUpRight, Clock, Info } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { walletService } from "@/lib/walletService";
import { WalletTransaction, WalletSummary } from "@/types/wallet";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";
import { format } from "date-fns";

type FilterType = "All" | "Added" | "Refunds" | "Bookings" | "Other";

const getTransactionIcon = (type: string) => {
  if (type === 'Wallet Added') return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
  if (type === 'Refund from Cancelled Booking') return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
  if (type === 'Booking Payment' || type === 'Doctor Consultation') return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
  if (type === 'Cashback') return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
  return <ArrowUpRight className="w-4 h-4 text-slate-500" />;
};

const getTransactionIconBg = (type: string) => {
  if (type === 'Wallet Added') return "bg-emerald-100";
  if (type === 'Refund from Cancelled Booking') return "bg-emerald-100";
  if (type === 'Booking Payment' || type === 'Doctor Consultation') return "bg-rose-100";
  if (type === 'Cashback') return "bg-emerald-100";
  return "bg-slate-100";
};

const WalletScreen = () => {
  useSEO({ title: "My Wallet | BloodLyn", description: "View your BloodLyn wallet balance and transactions." });
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { wallet } = await walletService.getWallet(user.id);
      if (wallet) {
        setBalance(wallet.available_balance);
        const txs = await walletService.getTransactions(wallet.id);
        setTransactions(txs);
      }
      setLoading(false);
    };
    fetchWalletData();
  }, [user?.id]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Apply type filter
    if (activeFilter === "Added") {
      filtered = filtered.filter(t => t.transaction_type === 'Wallet Added');
    } else if (activeFilter === "Refunds") {
      filtered = filtered.filter(t => t.transaction_type === 'Refund from Cancelled Booking');
    } else if (activeFilter === "Bookings") {
      filtered = filtered.filter(t => t.transaction_type === 'Booking Payment' || t.transaction_type === 'Doctor Consultation');
    } else if (activeFilter === "Other") {
      filtered = filtered.filter(t => !['Wallet Added', 'Refund from Cancelled Booking', 'Booking Payment', 'Doctor Consultation'].includes(t.transaction_type));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.transaction_type.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.booking_id && t.booking_id.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [transactions, activeFilter, searchQuery]);

  return (
    <MobileLayout className="bg-slate-50 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">My Wallet</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        
        {/* Wallet Balance Card */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-[-20%] top-[-20%] w-64 h-64 bg-white opacity-5 rounded-full mix-blend-overlay blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Available Balance</p>
            <h2 className="text-4xl font-black tracking-tight mb-6">₹{balance.toFixed(2)}</h2>
            <button 
              onClick={() => navigate('/wallet/add')}
              className="w-full bg-white text-slate-900 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 px-1">Transaction History</h3>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredTransactions.map((tx, idx) => (
                <button
                  key={tx.id}
                  onClick={() => navigate(`/wallet/transaction/${tx.id}`)}
                  className={`w-full flex items-center p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left ${idx !== filteredTransactions.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mr-4 ${getTransactionIconBg(tx.transaction_type)}`}>
                    {getTransactionIcon(tx.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{tx.transaction_type}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{format(new Date(tx.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{tx.description || tx.booking_id || ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md mt-1 uppercase tracking-wider ${
                      tx.status === 'Successful' ? 'bg-emerald-50 text-emerald-600' :
                      tx.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-3xl p-8 border border-slate-100 flex flex-col items-center text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Wallet className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-base font-black text-slate-900 mb-2">Your wallet is empty</h4>
              <p className="text-xs text-slate-500 font-medium mb-6">Add money to your BloodLyn Wallet for faster checkout and eligible refunds.</p>
              <button 
                onClick={() => navigate('/wallet/add')}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Money
              </button>
            </div>
          )}
        </div>
        
      </div>
    </MobileLayout>
  );
};

export default WalletScreen;
