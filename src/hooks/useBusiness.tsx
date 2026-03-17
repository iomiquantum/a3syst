import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BusinessContextType {
  businessId: string | null;
  businessName: string;
  loading: boolean;
  isSuperAdmin: boolean;
  needsOnboarding: boolean;
  allBusinesses: { id: string; name: string }[];
  selectBusiness: (id: string, name: string) => void;
  refreshBusiness: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [businessId, setClinicId] = useState<string | null>(null);
  const [businessName, setClinicName] = useState("Mi Negocio");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allBusinesses, setAllClinics] = useState<{ id: string; name: string }[]>([]);

  const fetchClinic = async () => {
    if (!user) {
      setClinicId(null);
      setIsSuperAdmin(false);
      setNeedsOnboarding(false);
      setAllClinics([]);
      setLoading(false);
      return;
    }

    const { data: superAdminResult } = await supabase.rpc('is_super_admin');
    const isSuper = superAdminResult === true;
    setIsSuperAdmin(isSuper);

    if (isSuper) {
      const { data: clinics } = await supabase
        .from("businesses")
        .select("id, name, business_type")
        .order("created_at");
      setAllClinics((clinics || []).map(c => ({ id: c.id, name: c.name })));
      if (clinics && clinics.length > 0 && !businessId) {
        setClinicId(clinics[0].id);
        setClinicName(clinics[0].name);
      }
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Regular user: check owned clinic
    const { data: ownedClinic } = await supabase
      .from("businesses")
      .select("id, name, business_type, onboarding_completed")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (ownedClinic) {
      setClinicId(ownedClinic.id);
      setClinicName(ownedClinic.name);
      // Needs onboarding if not completed
      setNeedsOnboarding(!(ownedClinic as any).onboarding_completed);
      setLoading(false);
      return;
    }

    // Otherwise check roles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("clinic_id, clinics(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (roleData) {
      setClinicId(roleData.clinic_id);
      setClinicName((roleData as any).clinics?.name ?? "Mi Negocio");
      setNeedsOnboarding(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClinic();
  }, [user]);

  const selectBusiness = (id: string, name: string) => {
    setClinicId(id);
    setClinicName(name);
  };

  const refreshBusiness = () => {
    setLoading(true);
    fetchClinic();
  };

  return (
    <BusinessContext.Provider value={{ businessId, businessName, loading, isSuperAdmin, needsOnboarding, allBusinesses, selectBusiness, refreshBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used within BusinessProvider");
  return context;
};
