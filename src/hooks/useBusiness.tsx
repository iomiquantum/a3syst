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
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Mi Negocio");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<{ id: string; name: string }[]>([]);

  const fetchBusiness = async () => {
    if (!user) {
      setBusinessId(null);
      setIsSuperAdmin(false);
      setNeedsOnboarding(false);
      setAllBusinesses([]);
      setLoading(false);
      return;
    }

    const { data: superAdminResult } = await supabase.rpc('is_super_admin');
    const isSuper = superAdminResult === true;
    setIsSuperAdmin(isSuper);

    if (isSuper) {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id, name, business_type")
        .order("created_at");
      setAllBusinesses((businesses || []).map(c => ({ id: c.id, name: c.name })));
      if (businesses && businesses.length > 0 && !businessId) {
        setBusinessId(businesses[0].id);
        setBusinessName(businesses[0].name);
      }
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    // Regular user: check owned business
    const { data: ownedBusiness } = await supabase
      .from("businesses")
      .select("id, name, business_type, onboarding_completed")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (ownedBusiness) {
      setBusinessId(ownedBusiness.id);
      setBusinessName(ownedBusiness.name);
      setNeedsOnboarding(!(ownedBusiness as any).onboarding_completed);
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
      setBusinessId(roleData.clinic_id);
      setBusinessName((roleData as any).clinics?.name ?? "Mi Negocio");
      setNeedsOnboarding(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusiness();
  }, [user]);

  const selectBusiness = (id: string, name: string) => {
    setBusinessId(id);
    setBusinessName(name);
  };

  const refreshBusiness = () => {
    setLoading(true);
    fetchBusiness();
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
