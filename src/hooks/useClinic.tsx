import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClinicContextType {
  clinicId: string | null;
  clinicName: string;
  loading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("Mi Clínica");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setClinicId(null);
      setLoading(false);
      return;
    }

    const fetchClinic = async () => {
      // First check if user owns a clinic
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

  return (
    <ClinicContext.Provider value={{ clinicId, clinicName, loading }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
