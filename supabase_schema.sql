-- Create Tables for Long Ling Product Database

-- 1. Users Table (Extending Auth)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sub_name TEXT,
  category TEXT NOT NULL,
  description TEXT,
  tags TEXT[], -- Array of strings
  cost_price NUMERIC DEFAULT 0,
  agent_price NUMERIC DEFAULT 0,
  agent_price_level_2 NUMERIC DEFAULT 0,
  agent_price_level_3 NUMERIC DEFAULT 0,
  dropshipping_price NUMERIC DEFAULT 0,
  domestic_price NUMERIC DEFAULT 0,
  overseas_price NUMERIC DEFAULT 0,
  overseas_wholesale_price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  size TEXT,
  weight TEXT,
  gross_weight TEXT,
  packaging_size TEXT,
  box_quantity INTEGER DEFAULT 0,
  shipping_box_size TEXT,
  shipping_box_weight NUMERIC DEFAULT 0,
  shipping_box_volume NUMERIC DEFAULT 0,
  type TEXT,
  pieces INTEGER,
  color TEXT,
  release_date TEXT,
  monthly_sales JSONB DEFAULT '[]'::jsonb,
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Security Definer Function to check if user is admin
-- This avoids infinite recursion in RLS policies by running as the owner (postgres)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role
  FROM public.user_profiles
  WHERE id = auth.uid();
  
  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Policies for User Profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id AND 
    (
      role = 'viewer' OR 
      is_admin() OR 
      (auth.jwt() ->> 'email' IN ('john@greatidea.tw', 'wesleytw723@gmail.com'))
    )
  );

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
  FOR ALL USING (is_admin());

-- Policies for Products
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (is_admin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
