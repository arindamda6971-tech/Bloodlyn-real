-- The doctor's digital prescription for a consultation, sent from the Partner Portal
-- (forward-prescription -> update-order-report). The patient reads it on the appointment
-- and in Reports, and can add its tests to the cart. Shape:
-- { issued_at, doctor_name, patient_name, patient_age, patient_gender, diagnosis, notes,
--   medicines: [{name, dosage, frequency, duration, instructions}],
--   tests: [{id, name}], advice, follow_up }
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS prescription jsonb;

COMMENT ON COLUMN public.orders.prescription IS 'Doctor consultations: the digital prescription (medicines, advised tests, advice).';
