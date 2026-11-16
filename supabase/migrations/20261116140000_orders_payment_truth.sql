-- One-time correction: payment status tells the truth.
--
-- Every order was saved as payment "completed" though nothing was paid. From now on
-- create-order saves "pending" (payment due) and only a confirmed payment sets "paid"
-- (for now the testing-phase rule in supabase/functions/_shared/payment-status.ts: the
-- patient's "Yes, collected" counts as the online payment until Razorpay is live).
--
-- Doctor consultations and BP / ECG visits become "pending". Blood tests whose sample the
-- patient already confirmed collected become "paid", by the same testing-phase rule.
--
-- Patients can't change payment or money themselves: the live trigger function
-- prevent_financial_field_updates() (triggers protect_order_financial_fields and
-- trg_prevent_financial_field_updates on orders) puts payment status, totals, payment
-- method and the like back for every role except service_role. That is also why this
-- correction runs as service_role. The orders table stamps updated_at on the change.

BEGIN;

SET LOCAL ROLE service_role;

UPDATE public.orders
   SET payment_status = CASE
         WHEN COALESCE(test_name, '') !~* '^(Video Call|Audio Call|Physical Appointment|Clinic Visit) with '
          AND NOT (
                COALESCE(test_name, '') <> ''
            AND NOT EXISTS (
                  SELECT 1
                    FROM regexp_split_to_table(test_name, '\|') AS item
                   WHERE btrim(item) <> ''
                     AND btrim(item) !~* '(home\s*bp|bp\s*check|blood\s*pressure|ecg|electrocardiogram)'
                )
              )
          AND lower(COALESCE(status, '')) IN (
                'sample_collected', 'in_progress', 'processing', 'lab_processing',
                'report_ready', 'report_delivered', 'completed'
              )
         THEN 'paid'
         ELSE 'pending'
       END
 WHERE lower(COALESCE(payment_status, '')) IN ('completed', 'paid', '');

COMMIT;
