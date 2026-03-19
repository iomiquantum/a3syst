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
      const { data: clinics } = await (supabase as any)
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

    // Regular user: gather ALL clinics they have access to (owned + roles)
    const allUserClinics: { id: string; name: string; onboarding_completed?: boolean; isOwned: boolean }[] = [];

    // 1. Check owned clinics
    const { data: ownedClinics } = await (supabase as any)
      .from("clinics")
      .select("id, name, business_type, onboarding_completed")
      .eq("owner_id", user.id);

    (ownedClinics || []).forEach((c: any) => {
      allUserClinics.push({ id: c.id, name: c.name, onboarding_completed: c.onboarding_completed, isOwned: true });
    });

    // 2. Check role-assigned clinics
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("clinic_id, clinics(name)")
      .eq("user_id", user.id);

    (roleData || []).forEach((r: any) => {
      if (!allUserClinics.some(c => c.id === r.clinic_id)) {
        allUserClinics.push({ id: r.clinic_id, name: r.clinics?.name ?? "Mi Negocio", isOwned: false });
      }
    });

    if (allUserClinics.length > 1) {
      setAllClinics(allUserClinics.map(c => ({ id: c.id, name: c.name })));
    }

    if (allUserClinics.length > 0 && !clinicId) {
      // Prefer a role-assigned clinic over the auto-created "Mi Negocio" if available
      const preferred = allUserClinics.find(c => !c.isOwned) || allUserClinics[0];
      setClinicId(preferred.id);
      setClinicName(preferred.name);
      const ownedMatch = ownedClinics?.find((c: any) => c.id === preferred.id);
      setNeedsOnboarding(ownedMatch ? !ownedMatch.onboarding_completed : false);
    } else if (allUserClinics.length > 0 && clinicId) {
      // Keep current selection
    } else {
      setNeedsOnboarding(true);
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
