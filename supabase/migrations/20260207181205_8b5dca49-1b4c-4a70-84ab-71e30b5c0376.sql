
-- ==========================================
-- IOMI CLÍNICAS - Full Database Schema
-- ==========================================

-- 1. ROLES ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'secretary', 'professional');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CLINICS TABLE
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 4. USER ROLES TABLE (links users to clinics with roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'secretary',
  permissions JSONB NOT NULL DEFAULT '{"agenda":true,"pacientes":true,"ventas":false,"configuracion":false,"reportes":false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. BRANCHES (SUCURSALES)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  description TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 6. SPECIALTIES (ESPECIALIDADES)
CREATE TABLE public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

-- 7. TREATMENTS (TRATAMIENTOS)
CREATE TABLE public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- 8. PROFESSIONALS (PROFESIONALES)
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- 9. PATIENTS (PACIENTES)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  document TEXT DEFAULT '',
  date_of_birth DATE,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 10. APPOINTMENTS (CITAS/TURNOS)
CREATE TYPE public.appointment_status AS ENUM ('pendiente', 'confirmado', 'completado', 'cancelado');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status appointment_status NOT NULL DEFAULT 'pendiente',
  payment_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 11. PAYMENT METHODS
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 12. SALES (VENTAS)
CREATE TYPE public.sale_status AS ENUM ('abonado', 'parcial', 'pendiente');

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  status sale_status NOT NULL DEFAULT 'pendiente',
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  origin TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECURITY DEFINER FUNCTIONS
-- ==========================================

-- Check if user belongs to a clinic
CREATE OR REPLACE FUNCTION public.user_has_clinic_access(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id
  ) OR EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = _clinic_id AND owner_id = _user_id
  );
$$;

-- Check if user has specific role in clinic
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CLINICS
CREATE POLICY "Owners can manage their clinics" ON public.clinics FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Members can view clinics" ON public.clinics FOR SELECT USING (public.user_has_clinic_access(auth.uid(), id));

-- USER ROLES
CREATE POLICY "Clinic owners can manage roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- BRANCHES
CREATE POLICY "Clinic members can view branches" ON public.branches FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic owners can manage branches" ON public.branches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);

-- SPECIALTIES
CREATE POLICY "Clinic members can view specialties" ON public.specialties FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic owners can manage specialties" ON public.specialties FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);

-- TREATMENTS
CREATE POLICY "Clinic members can view treatments" ON public.treatments FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic owners can manage treatments" ON public.treatments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);

-- PROFESSIONALS
CREATE POLICY "Clinic members can view professionals" ON public.professionals FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic owners can manage professionals" ON public.professionals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);

-- PATIENTS
CREATE POLICY "Clinic members can view patients" ON public.patients FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage patients" ON public.patients FOR ALL USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- APPOINTMENTS
CREATE POLICY "Clinic members can view appointments" ON public.appointments FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage appointments" ON public.appointments FOR ALL USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- PAYMENT METHODS
CREATE POLICY "Clinic members can view payment methods" ON public.payment_methods FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic owners can manage payment methods" ON public.payment_methods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinics WHERE id = clinic_id AND owner_id = auth.uid())
);

-- SALES
CREATE POLICY "Clinic members can view sales" ON public.sales FOR SELECT USING (public.user_has_clinic_access(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can manage sales" ON public.sales FOR ALL USING (public.user_has_clinic_access(auth.uid(), clinic_id));

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create clinic and admin role on first signup
CREATE OR REPLACE FUNCTION public.handle_new_clinic_setup()
RETURNS TRIGGER AS $$
DECLARE
  new_clinic_id UUID;
BEGIN
  -- Create a default clinic for the new user
  INSERT INTO public.clinics (owner_id, name, description)
  VALUES (NEW.id, 'Mi Clínica', 'Clínica principal')
  RETURNING id INTO new_clinic_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, clinic_id, role, permissions)
  VALUES (NEW.id, new_clinic_id, 'admin', '{"agenda":true,"pacientes":true,"ventas":true,"configuracion":true,"reportes":true}');

  -- Create default payment methods
  INSERT INTO public.payment_methods (clinic_id, name) VALUES
    (new_clinic_id, 'Efectivo'),
    (new_clinic_id, 'Tarjeta'),
    (new_clinic_id, 'Transferencia');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_clinic
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_clinic_setup();
