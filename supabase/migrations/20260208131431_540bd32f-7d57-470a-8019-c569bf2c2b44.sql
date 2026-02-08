
-- Convert RESTRICTIVE policies to PERMISSIVE for authenticated users
-- RESTRICTIVE requires ALL to pass; PERMISSIVE requires at least ONE to pass
-- This allows either clinic members OR super admins to access data

-- contacts
DROP POLICY IF EXISTS "Clinic members can view contacts" ON public.contacts;
CREATE POLICY "Clinic members can view contacts" ON public.contacts FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage contacts" ON public.contacts;
CREATE POLICY "Clinic members can manage contacts" ON public.contacts FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all contacts" ON public.contacts;
CREATE POLICY "Super admin can manage all contacts" ON public.contacts FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- conversations
DROP POLICY IF EXISTS "Clinic members can view conversations" ON public.conversations;
CREATE POLICY "Clinic members can view conversations" ON public.conversations FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage conversations" ON public.conversations;
CREATE POLICY "Clinic members can manage conversations" ON public.conversations FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all conversations" ON public.conversations;
CREATE POLICY "Super admin can manage all conversations" ON public.conversations FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- messages
DROP POLICY IF EXISTS "Clinic members can view messages" ON public.messages;
CREATE POLICY "Clinic members can view messages" ON public.messages FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage messages" ON public.messages;
CREATE POLICY "Clinic members can manage messages" ON public.messages FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all messages" ON public.messages;
CREATE POLICY "Super admin can manage all messages" ON public.messages FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- call_logs
DROP POLICY IF EXISTS "Clinic members can view call_logs" ON public.call_logs;
CREATE POLICY "Clinic members can view call_logs" ON public.call_logs FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage call_logs" ON public.call_logs;
CREATE POLICY "Clinic members can manage call_logs" ON public.call_logs FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all call_logs" ON public.call_logs;
CREATE POLICY "Super admin can manage all call_logs" ON public.call_logs FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- appointments
DROP POLICY IF EXISTS "Clinic members can view appointments" ON public.appointments;
CREATE POLICY "Clinic members can view appointments" ON public.appointments FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage appointments" ON public.appointments;
CREATE POLICY "Clinic members can manage appointments" ON public.appointments FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all appointments" ON public.appointments;
CREATE POLICY "Super admin can manage all appointments" ON public.appointments FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- branches
DROP POLICY IF EXISTS "Clinic members can view branches" ON public.branches;
CREATE POLICY "Clinic members can view branches" ON public.branches FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic owners can manage branches" ON public.branches;
CREATE POLICY "Clinic owners can manage branches" ON public.branches FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = branches.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Super admin can manage all branches" ON public.branches;
CREATE POLICY "Super admin can manage all branches" ON public.branches FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- clinics
DROP POLICY IF EXISTS "Owners can manage their clinics" ON public.clinics;
CREATE POLICY "Owners can manage their clinics" ON public.clinics FOR ALL TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members can view clinics" ON public.clinics;
CREATE POLICY "Members can view clinics" ON public.clinics FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), id));

DROP POLICY IF EXISTS "Super admin can manage all clinics" ON public.clinics;
CREATE POLICY "Super admin can manage all clinics" ON public.clinics FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- patients
DROP POLICY IF EXISTS "Clinic members can view patients" ON public.patients;
CREATE POLICY "Clinic members can view patients" ON public.patients FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage patients" ON public.patients;
CREATE POLICY "Clinic members can manage patients" ON public.patients FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all patients" ON public.patients;
CREATE POLICY "Super admin can manage all patients" ON public.patients FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- payment_methods
DROP POLICY IF EXISTS "Clinic members can view payment methods" ON public.payment_methods;
CREATE POLICY "Clinic members can view payment methods" ON public.payment_methods FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic owners can manage payment methods" ON public.payment_methods;
CREATE POLICY "Clinic owners can manage payment methods" ON public.payment_methods FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = payment_methods.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Super admin can manage all payment_methods" ON public.payment_methods;
CREATE POLICY "Super admin can manage all payment_methods" ON public.payment_methods FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- professionals
DROP POLICY IF EXISTS "Clinic members can view professionals" ON public.professionals;
CREATE POLICY "Clinic members can view professionals" ON public.professionals FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic owners can manage professionals" ON public.professionals;
CREATE POLICY "Clinic owners can manage professionals" ON public.professionals FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = professionals.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Super admin can manage all professionals" ON public.professionals;
CREATE POLICY "Super admin can manage all professionals" ON public.professionals FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_super_admin());

-- sales
DROP POLICY IF EXISTS "Clinic members can view sales" ON public.sales;
CREATE POLICY "Clinic members can view sales" ON public.sales FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can manage sales" ON public.sales;
CREATE POLICY "Clinic members can manage sales" ON public.sales FOR ALL TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Super admin can manage all sales" ON public.sales;
CREATE POLICY "Super admin can manage all sales" ON public.sales FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- specialties
DROP POLICY IF EXISTS "Clinic members can view specialties" ON public.specialties;
CREATE POLICY "Clinic members can view specialties" ON public.specialties FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic owners can manage specialties" ON public.specialties;
CREATE POLICY "Clinic owners can manage specialties" ON public.specialties FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = specialties.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Super admin can manage all specialties" ON public.specialties;
CREATE POLICY "Super admin can manage all specialties" ON public.specialties FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- treatments
DROP POLICY IF EXISTS "Clinic members can view treatments" ON public.treatments;
CREATE POLICY "Clinic members can view treatments" ON public.treatments FOR SELECT TO authenticated USING (user_has_clinic_access(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic owners can manage treatments" ON public.treatments;
CREATE POLICY "Clinic owners can manage treatments" ON public.treatments FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = treatments.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Super admin can manage all treatments" ON public.treatments;
CREATE POLICY "Super admin can manage all treatments" ON public.treatments FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- user_roles
DROP POLICY IF EXISTS "Clinic owners can manage roles" ON public.user_roles;
CREATE POLICY "Clinic owners can manage roles" ON public.user_roles FOR ALL TO authenticated USING ((EXISTS ( SELECT 1 FROM clinics WHERE clinics.id = user_roles.clinic_id AND clinics.owner_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin can manage all roles" ON public.user_roles;
CREATE POLICY "Super admin can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admin can view all roles" ON public.user_roles;
CREATE POLICY "Super admin can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_super_admin());
