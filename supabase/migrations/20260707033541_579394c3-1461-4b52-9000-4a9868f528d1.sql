
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text,
  patient_user_id uuid,
  patient_name text,
  patient_phone text,
  doctor_id uuid,
  diagnosis text,
  medicines text,
  advice text,
  attachment_url text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read their own prescriptions"
  ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_user_id);

CREATE INDEX idx_prescriptions_patient ON public.prescriptions (patient_user_id, created_at DESC);
CREATE INDEX idx_prescriptions_appointment ON public.prescriptions (appointment_id);


CREATE TABLE public.doctor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text,
  patient_user_id uuid,
  doctor_id uuid,
  sender text,
  content text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.doctor_messages TO authenticated;
GRANT ALL ON public.doctor_messages TO service_role;

ALTER TABLE public.doctor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can read their own doctor messages"
  ON public.doctor_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_user_id);

CREATE INDEX idx_doctor_messages_patient ON public.doctor_messages (patient_user_id, created_at DESC);
CREATE INDEX idx_doctor_messages_appointment ON public.doctor_messages (appointment_id, created_at ASC);
