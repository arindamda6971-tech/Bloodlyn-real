import { supabase } from "@/integrations/supabase/client";
import { Wallet, WalletTransaction, WalletSummary, TransactionType } from "@/types/wallet";

type WalletTransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  order_id: string | null;
  balance_after: number;
  created_at: string;
};

const toWalletTransaction = (row: WalletTransactionRow): WalletTransaction => ({
  id: row.id,
  wallet_id: row.user_id,
  user_id: row.user_id,
  transaction_type: row.type as TransactionType,
  amount: Number(row.amount),
  balance_before: Number(row.balance_after) - Number(row.amount),
  balance_after: Number(row.balance_after),
  status: "Successful",
  booking_id: row.order_id ?? undefined,
  order_id: row.order_id ?? undefined,
  description: row.description ?? undefined,
  created_at: row.created_at,
});

/**
 * Wallet reads use the current schema: the balance lives on `profiles` and
 * the ledger lives in `wallet_transactions`.
 */
export const walletService = {
  /**
   * Fetches the user's wallet balance and summary.
   */
  async getWallet(userId: string): Promise<{ wallet: Wallet | null, summary: WalletSummary }> {
    const defaultSummary = { moneyAdded: 0, refunds: 0, spent: 0 };
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, wallet_balance, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching wallet:", error);
        return { wallet: null, summary: defaultSummary };
      }

      const wallet: Wallet | null = profile ? {
        id: profile.id,
        user_id: profile.id,
        available_balance: Number(profile.wallet_balance),
        currency: 'INR',
        status: 'Active',
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      } : null;

      if (wallet) {
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('amount, type')
          .eq('user_id', userId);

        if (transactions) {
          const moneyAdded = transactions
            .filter((t) => t.type === 'Wallet Added')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const refunds = transactions
            .filter((t) => t.type === 'Refund from Cancelled Booking')
            .reduce((sum, t) => sum + Number(t.amount), 0);

          const spent = transactions
            .filter((t) => ['Booking Payment', 'Doctor Consultation'].includes(t.type))
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          
          return {
            wallet,
            summary: { moneyAdded, refunds, spent }
          };
        }
      }

      return { wallet, summary: defaultSummary };
    } catch (err) {
      console.error("Wallet service error:", err);
      return { wallet: null, summary: defaultSummary };
    }
  },

  /**
   * Gets the transaction history for a wallet
   */
  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((row) => toWalletTransaction(row));
    } catch (err) {
      console.error("Error fetching transactions:", err);
      return [];
    }
  },

  /**
   * Adds money to the wallet. Simulates a payment gateway callback.
   */
  async addMoney(userId: string, amount: number, paymentMethod: string): Promise<{ success: boolean, newBalance: number }> {
    try {
      // Typically, this logic resides on the backend via a secure webhook after a successful payment gateway charge.
      // For this architecture, we are defining the frontend-callable Supabase RPC or direct table mutation if RLS permits.
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      if (profileError) throw profileError;
      const currentBalance = Number(profile.wallet_balance || 0);

      const newBalance = currentBalance + amount;

      // 1. Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
      
      if (updateError) throw updateError;

      // 2. Insert transaction
      const transaction = {
        user_id: userId,
        type: 'Wallet Added',
        amount: amount, // Positive for addition
        balance_after: newBalance,
        description: `Added via ${paymentMethod}`
      };

      await supabase.from('wallet_transactions').insert(transaction);

      return { success: true, newBalance };
    } catch (err) {
      console.error("Failed to add money:", err);
      return { success: false, newBalance: 0 };
    }
  },

  /**
   * Deducts money from wallet for a booking
   */
  async chargeWallet(userId: string, amount: number, bookingId: string, description: string): Promise<{ success: boolean, newBalance: number }> {
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      if (walletError) throw walletError;

      const currentBalance = Number(wallet.wallet_balance);
      if (currentBalance < amount) throw new Error("Insufficient wallet balance");

      const newBalance = currentBalance - amount;

      // 1. Update balance
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);

      // 2. Insert transaction
      const transaction = {
        user_id: userId,
        type: 'Booking Payment',
        amount: -Math.abs(amount), // Negative for deduction
        balance_after: newBalance,
        order_id: bookingId,
        description: description
      };

      await supabase.from('wallet_transactions').insert(transaction);

      return { success: true, newBalance };
    } catch (err) {
      console.error("Failed to charge wallet:", err);
      return { success: false, newBalance: 0 };
    }
  },

  /**
   * Refunds a cancelled order to the wallet
   */
  async refundOrder(userId: string, amount: number, orderId: string, reason: string): Promise<{ success: boolean, newBalance: number }> {
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      if (walletError) throw walletError;
      const currentBalance = Number(wallet.wallet_balance || 0);

      const newBalance = currentBalance + amount;

      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);

      const transaction = {
        user_id: userId,
        type: 'Refund from Cancelled Booking',
        amount: Math.abs(amount), // Ensure positive
        balance_after: newBalance,
        order_id: orderId,
        description: `Refund credited after order cancellation: ${reason}`
      };

      await supabase.from('wallet_transactions').insert(transaction);

      return { success: true, newBalance };
    } catch (err) {
      console.error("Failed to refund order:", err);
      return { success: false, newBalance: 0 };
    }
  }
};
