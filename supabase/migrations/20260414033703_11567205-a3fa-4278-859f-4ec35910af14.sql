-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

-- Create corrected policy: only the referrer can create a referral
CREATE POLICY "Users can create referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);