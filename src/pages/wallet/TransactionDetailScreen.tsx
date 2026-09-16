import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Info, Calendar as CalendarIcon, Tag, CreditCard } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { WalletTransaction } from "@/types/wallet";
import { format } from "date-fns";
import { useSEO } from "@/hooks/useSEO";

const TransactionDetailScreen = () => {
  useSEO({ title: "Transaction Details | BloodLyn" });
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [transaction, setTransaction] = useState<WalletTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (data) setTransaction(data as WalletTransaction);
      } catch (err) {
        console.error("Failed to fetch transaction:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransaction();
  }, [id]);

  if (loading) {
    return (
      <MobileLayout className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </MobileLayout>
    );
  }

  if (!transaction) {
    return (
      <MobileLayout className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Info className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-black text-slate-900 mb-2">Transaction Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">We couldn't find the details for this transaction.</p>
        <button onClick={() => navigate(-1)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm">
          Go Back
        </button>
      </MobileLayout>
    );
  }

  const isPositive = transaction.amount > 0;
  const isSuccess = transaction.status === 'Successful';
  const isPending = transaction.status === 'Pending' || transaction.status === 'Processing';

  return (
    <MobileLayout className="bg-slate-50 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-black text-slate-900 tracking-tight">Transaction Details</h1>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center text-center">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : isPending ? (
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8" />
            </div>
          )}
          
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">{transaction.status}</h2>
          <p className={`text-4xl font-black tracking-tight mb-2 ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
            {isPositive ? '+' : ''}₹{Math.abs(transaction.amount).toFixed(2)}
          </p>
          <p className="text-sm font-medium text-slate-600">{transaction.transaction_type}</p>
        </div>

        {/* Details List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Info className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Transaction ID</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 text-right break-all">{transaction.id}</p>
          </div>
          
          <div className="w-full h-px bg-slate-50"></div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest">Date & Time</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 text-right">{format(new Date(transaction.created_at), 'dd MMM yyyy, hh:mm a')}</p>
          </div>

          {transaction.payment_method && (
            <>
              <div className="w-full h-px bg-slate-50"></div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">Payment Method</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 text-right">{transaction.payment_method}</p>
              </div>
            </>
          )}

          {transaction.booking_id && (
            <>
              <div className="w-full h-px bg-slate-50"></div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Tag className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">Booking ID</span>
                </div>
                <p className="text-sm font-semibold text-blue-600 text-right cursor-pointer" onClick={() => navigate(`/tracking/${transaction.booking_id}`)}>
                  {transaction.booking_id}
                </p>
              </div>
            </>
          )}

          {transaction.description && (
            <>
              <div className="w-full h-px bg-slate-50"></div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</span>
                <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">{transaction.description}</p>
              </div>
            </>
          )}

        </div>

      </div>
    </MobileLayout>
  );
};

export default TransactionDetailScreen;
