import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SUPER_ADMIN_EMAIL = "impulsarsolutions@gmail.com";

interface ClinicContextType {
  clinicId: string | null;
  clinicName: string;
  loading: boolean;
  isSuperAdmin: boolean;
  allClinics: { id: string; name: string }[];
  selectClinic: (id: string, name: string) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("Mi Clínica");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allClinics, setAllClinics] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) {
      setClinicId(null);
      setIsSuperAdmin(false);
      setAllClinics([]);
      setLoading(false);
      return;
    }

    const isSuper = user.email === SUPER_ADMIN_EMAIL;
    setIsSuperAdmin(isSuper);

    const fetchClinic = async () => {
      if (isSuper) {
        // Super admin: fetch all clinics
        const { data: clinics } = await supabase
          .from("clinics")
          .select("id, name")
          .order("created_at");
        setAllClinics(clinics || []);
        if (clinics && clinics.length > 0 && !clinicId) {
          setClinicId(clinics[0].id);
          setClinicName(clinics[0].name);
        }
        setLoading(false);
        return;
      }

      // Regular user: check owned clinic
      const { data: ownedClinic } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (ownedClinic) {
        setClinicId(ownedClinic.id);
        setClinicName(ownedClinic.name);
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
        setClinicName((roleData as any).clinics?.name ?? "Mi Clínica");
      }
      setLoading(false);
    };

    fetchClinic();
  }, [user]);

  const selectClinic = (id: string, name: string) => {
    setClinicId(id);
    setClinicName(name);
  };

  return (
    <ClinicContext.Provider value={{ clinicId, clinicName, loading, isSuperAdmin, allClinics, selectClinic }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
