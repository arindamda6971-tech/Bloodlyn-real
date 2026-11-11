-- Doctor consultations run on Google Meet: the doctor opens a meeting and the link
-- reaches the patient's booking through update-call-status. The patient joins from
-- the incoming-call alert or the appointment page.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS meet_link text;
