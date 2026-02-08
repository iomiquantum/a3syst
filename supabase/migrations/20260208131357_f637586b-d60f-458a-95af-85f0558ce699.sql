
-- Fix restrictive anonymous block policies that also block authenticated users
-- The RESTRICTIVE policy with USING(false) blocks ALL users including authenticated ones
-- We need to change them to only block anonymous (unauthenticated) access

-- contacts
DROP POLICY IF EXISTS "Block anonymous access to contacts" ON public.contacts;
CREATE POLICY "Block anonymous access to contacts"
  ON public.contacts FOR ALL
  TO anon
  USING (false);

-- conversations
DROP POLICY IF EXISTS "Block anonymous access to conversations" ON public.conversations;
CREATE POLICY "Block anonymous access to conversations"
  ON public.conversations FOR ALL
  TO anon
  USING (false);

-- messages
DROP POLICY IF EXISTS "Block anonymous access to messages" ON public.messages;
CREATE POLICY "Block anonymous access to messages"
  ON public.messages FOR ALL
  TO anon
  USING (false);

-- call_logs
DROP POLICY IF EXISTS "Block anonymous access to call_logs" ON public.call_logs;
CREATE POLICY "Block anonymous access to call_logs"
  ON public.call_logs FOR ALL
  TO anon
  USING (false);

-- appointments
DROP POLICY IF EXISTS "Block anonymous access to appointments" ON public.appointments;
CREATE POLICY "Block anonymous access to appointments"
  ON public.appointments FOR ALL
  TO anon
  USING (false);

-- branches
DROP POLICY IF EXISTS "Block anonymous access to branches" ON public.branches;
CREATE POLICY "Block anonymous access to branches"
  ON public.branches FOR ALL
  TO anon
  USING (false);

-- clinics
DROP POLICY IF EXISTS "Block anonymous access to clinics" ON public.clinics;
CREATE POLICY "Block anonymous access to clinics"
  ON public.clinics FOR ALL
  TO anon
  USING (false);

-- patients
DROP POLICY IF EXISTS "Block anonymous access to patients" ON public.patients;
CREATE POLICY "Block anonymous access to patients"
  ON public.patients FOR ALL
  TO anon
  USING (false);

-- payment_methods
DROP POLICY IF EXISTS "Block anonymous access to payment_methods" ON public.payment_methods;
CREATE POLICY "Block anonymous access to payment_methods"
  ON public.payment_methods FOR ALL
  TO anon
  USING (false);

-- professionals
DROP POLICY IF EXISTS "Block anonymous access to professionals" ON public.professionals;
CREATE POLICY "Block anonymous access to professionals"
  ON public.professionals FOR ALL
  TO anon
  USING (false);

-- profiles
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
CREATE POLICY "Block anonymous access to profiles"
  ON public.profiles FOR ALL
  TO anon
  USING (false);

-- sales
DROP POLICY IF EXISTS "Block anonymous access to sales" ON public.sales;
CREATE POLICY "Block anonymous access to sales"
  ON public.sales FOR ALL
  TO anon
  USING (false);

-- specialties
DROP POLICY IF EXISTS "Block anonymous access to specialties" ON public.specialties;
CREATE POLICY "Block anonymous access to specialties"
  ON public.specialties FOR ALL
  TO anon
  USING (false);

-- treatments
DROP POLICY IF EXISTS "Block anonymous access to treatments" ON public.treatments;
CREATE POLICY "Block anonymous access to treatments"
  ON public.treatments FOR ALL
  TO anon
  USING (false);

-- user_roles
DROP POLICY IF EXISTS "Block anonymous access to user_roles" ON public.user_roles;
CREATE POLICY "Block anonymous access to user_roles"
  ON public.user_roles FOR ALL
  TO anon
  USING (false);
