import { supabase } from "@/integrations/supabase/client";
import { Wallet, WalletTransaction, WalletSummary, TransactionType } from "@/types/wallet";

/**
 * Service to handle Wallet functionality. 
 * This communicates with Supabase 'wallets' and 'wallet_transactions' tables.
 */
export const walletService = {
  /**
   * Fetches the user's wallet balance and summary.
   */
  async getWallet(userId: string): Promise<{ wallet: Wallet | null, summary: WalletSummary }> {
    const defaultSummary = { moneyAdded: 0, refunds: 0, spent: 0 };
    
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching wallet:", error);
        return { wallet: null, summary: defaultSummary };
      }

      // Fetch summary if wallet exists
      if (wallet) {
        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('amount, transaction_type, status')
          .eq('wallet_id', wallet.id)
          .eq('status', 'Successful');

        if (transactions) {
          const moneyAdded = transactions
            .filter((t: any) => t.transaction_type === 'Wallet Added')
            .reduce((sum: number, t: any) => sum + t.amount, 0);
          
          const refunds = transactions
            .filter((t: any) => t.transaction_type === 'Refund from Cancelled Booking')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          const spent = transactions
            .filter((t: any) => ['Booking Payment', 'Doctor Consultation'].includes(t.transaction_type))
            .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
          
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
  async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
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
      
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      let walletId = wallet?.id;
      let currentBalance = Number(wallet?.available_balance || 0);

      if (!walletId) {
        // Create wallet if it doesn't exist
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: userId, available_balance: 0, currency: 'INR', status: 'Active' })
          .select()
          .single();
        
        if (createError) throw createError;
        walletId = newWallet.id;
      }

      const newBalance = currentBalance + amount;

      // 1. Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ available_balance: newBalance })
        .eq('id', walletId);
      
      if (updateError) throw updateError;

      // 2. Insert transaction
      const transaction = {
        wallet_id: walletId,
        user_id: userId,
        transaction_type: 'Wallet Added' as TransactionType,
        amount: amount, // Positive for addition
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'Successful',
        payment_method: paymentMethod,
        description: 'Added via Payment Gateway'
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
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      if (!wallet) throw new Error("Wallet not found");

      const currentBalance = Number(wallet.available_balance);
      if (currentBalance < amount) throw new Error("Insufficient wallet balance");

      const newBalance = currentBalance - amount;

      // 1. Update balance
      await supabase.from('wallets').update({ available_balance: newBalance }).eq('id', wallet.id);

      // 2. Insert transaction
      const transaction = {
        wallet_id: wallet.id,
        user_id: userId,
        transaction_type: 'Booking Payment' as TransactionType,
        amount: -Math.abs(amount), // Negative for deduction
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'Successful',
        payment_method: 'BloodLyn Wallet',
        booking_id: bookingId,
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
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      let walletId = wallet?.id;
      let currentBalance = Number(wallet?.available_balance || 0);

      if (!walletId) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: userId, available_balance: 0, currency: 'INR', status: 'Active' })
          .select()
          .single();
        if (createError) throw createError;
        walletId = newWallet.id;
      }

      const newBalance = currentBalance + amount;

      await supabase.from('wallets').update({ available_balance: newBalance }).eq('id', walletId);

      const transaction = {
        wallet_id: walletId,
        user_id: userId,
        transaction_type: 'Refund from Cancelled Booking' as TransactionType,
        amount: Math.abs(amount), // Ensure positive
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'Successful',
        payment_method: 'Wallet Refund',
        booking_id: orderId,
        description: 'Refund credited to BloodLyn Wallet after order cancellation.',
        metadata: {
          original_order_amount: amount,
          refund_amount: amount,
          cancellation_reason: reason,
          timestamp: new Date().toISOString()
        }
      };

      await supabase.from('wallet_transactions').insert(transaction);

      return { success: true, newBalance };
    } catch (err) {
      console.error("Failed to refund order:", err);
      return { success: false, newBalance: 0 };
    }
  }
};
