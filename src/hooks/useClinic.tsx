import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClinicContextType {
  clinicId: string | null;
  clinicName: string;
  loading: boolean;
  isSuperAdmin: boolean;
  needsOnboarding: boolean;
  allClinics: { id: string; name: string }[];
  selectClinic: (id: string, name: string) => void;
  refreshClinic: () => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("Mi Negocio");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allClinics, setAllClinics] = useState<{ id: string; name: string }[]>([]);

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
        .from("clinics")
        .select("id, name, business_type")
        .order("created_at");
      setAllClinics((clinics || []).map(c => ({ id: c.id, name: c.name })));
      if (clinics && clinics.length > 0 && !clinicId) {
        setClinicId(clinics[0].id);
        setClinicName(clinics[0].name);
      }
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Regular user: check owned clinic
    const { data: ownedClinic } = await supabase
      .from("clinics")
      .select("id, name, business_type")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (ownedClinic) {
      setClinicId(ownedClinic.id);
      setClinicName(ownedClinic.name);
      // If business_type is still default 'general', needs onboarding
      setNeedsOnboarding(ownedClinic.business_type === 'general');
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

  const selectClinic = (id: string, name: string) => {
    setClinicId(id);
    setClinicName(name);
  };

  const refreshClinic = () => {
    setLoading(true);
    fetchClinic();
  };

  return (
    <ClinicContext.Provider value={{ clinicId, clinicName, loading, isSuperAdmin, needsOnboarding, allClinics, selectClinic, refreshClinic }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
