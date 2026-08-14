-- =============================================
-- BloodLyn DATABASE SCHEMA
-- =============================================

-- Test Categories
CREATE TABLE public.test_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tests
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.test_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '[]'::jsonb,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percent INTEGER DEFAULT 0,
  report_time_hours INTEGER DEFAULT 24,
  sample_type TEXT DEFAULT 'Blood',
  fasting_required BOOLEAN DEFAULT false,
  fasting_hours INTEGER DEFAULT 0,
  preparation_instructions TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test Packages (bundles)
CREATE TABLE public.test_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tests_count INTEGER DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  discount_percent INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Package Tests (many-to-many)
CREATE TABLE public.package_tests (
  package_id UUID REFERENCES public.test_packages(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, test_id)
);

-- User Addresses
CREATE TABLE public.addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT DEFAULT 'Home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Family Members
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relation TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  blood_group TEXT,
  phone TEXT,
  medical_conditions TEXT[],
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  address_id UUID REFERENCES public.addresses(id),
  family_member_id UUID REFERENCES public.family_members(id),
  scheduled_date DATE,
  scheduled_time_slot TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  coupon_code TEXT,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  phlebotomist_id UUID,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.tests(id),
  package_id UUID REFERENCES public.test_packages(id),
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phlebotomists
CREATE TABLE public.phlebotomists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  verification_id TEXT,
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  test_id UUID REFERENCES public.tests(id),
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id),
  status TEXT DEFAULT 'processing',
  risk_level TEXT DEFAULT 'low',
  parameters JSONB DEFAULT '[]'::jsonb,
  abnormal_count INTEGER DEFAULT 0,
  ai_summary TEXT,
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  lab_name TEXT DEFAULT 'BloodLyn Labs',
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Health Scores
CREATE TABLE public.health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  overall_score INTEGER DEFAULT 0,
  blood_health INTEGER DEFAULT 0,
  heart_health INTEGER DEFAULT 0,
  metabolic_health INTEGER DEFAULT 0,
  bone_health INTEGER DEFAULT 0,
  vitamin_levels INTEGER DEFAULT 0,
  ai_insights TEXT,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rewards
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referral_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Referrals
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  reward_amount INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cart Items (for persistence)
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  test_id UUID REFERENCES public.tests(id),
  package_id UUID REFERENCES public.test_packages(id),
  quantity INTEGER DEFAULT 1,
  family_member_id UUID REFERENCES public.family_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.test_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phlebotomists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Public read access for catalog data
CREATE POLICY "Anyone can view test categories" ON public.test_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view tests" ON public.tests FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view test packages" ON public.test_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view package tests" ON public.package_tests FOR SELECT USING (true);
CREATE POLICY "Anyone can view phlebotomists" ON public.phlebotomists FOR SELECT USING (true);

-- User-specific data policies
CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own family members" ON public.family_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own family members" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own family members" ON public.family_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own family members" ON public.family_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own health score" ON public.health_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health score" ON public.health_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health score" ON public.health_scores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own rewards" ON public.rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rewards" ON public.rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewards" ON public.rewards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "Users can view their own cart" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their cart" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their cart" ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their cart" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON public.family_members 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_scores_updated_at BEFORE UPDATE ON public.health_scores 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Generate Order Number
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'HS' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- =============================================
-- FUNCTION: Generate Referral Code
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := 'HEALTH' || UPPER(SUBSTRING(MD5(NEW.user_id::TEXT) FROM 1 FOR 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code BEFORE INSERT ON public.rewards
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();