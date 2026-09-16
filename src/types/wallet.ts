export type TransactionType = 'Wallet Added' | 'Refund from Cancelled Booking' | 'Booking Payment' | 'Cashback' | 'Adjustment' | 'Failed Transaction' | 'Doctor Consultation';

export type TransactionStatus = 'Pending' | 'Processing' | 'Successful' | 'Failed' | 'Reversed' | 'Refunded' | 'Cancelled';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: TransactionStatus;
  payment_method?: string;
  reference_id?: string;
  booking_id?: string;
  order_id?: string;
  description?: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WalletSummary {
  moneyAdded: number;
  refunds: number;
  spent: number;
}
