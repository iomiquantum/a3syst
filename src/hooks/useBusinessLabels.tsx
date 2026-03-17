import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

export interface BusinessLabels {
  patients: string;
  patients_singular: string;
  treatments: string;
  treatments_singular: string;
  professionals: string;
  professionals_singular: string;
  branches: string;
  branches_singular: string;
  appointments: string;
  appointments_singular: string;
  sales: string;
  business: string;
  specialties: string;
}

const DEFAULT_LABELS: BusinessLabels = {
  patients: "Clientes",
  patients_singular: "Cliente",
  treatments: "Servicios",
  treatments_singular: "Servicio",
  professionals: "Equipo",
  professionals_singular: "Miembro",
  branches: "Sucursales",
  branches_singular: "Sucursal",
  appointments: "Citas",
  appointments_singular: "Cita",
  sales: "Ventas",
  business: "Negocio",
  specialties: "Categorías",
};

interface BusinessLabelsContextType {
  labels: BusinessLabels;
  loading: boolean;
  refresh: () => void;
}

const BusinessLabelsContext = createContext<BusinessLabelsContextType | undefined>(undefined);

export const BusinessLabelsProvider = ({ children }: { children: ReactNode }) => {
  const { businessId } = useBusiness();
  const [labels, setLabels] = useState<BusinessLabels>(DEFAULT_LABELS);
  const [loading, setLoading] = useState(true);

  const fetchLabels = async () => {
    if (!businessId) {
      setLabels(DEFAULT_LABELS);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("business_labels")
      .select("labels")
      .eq("clinic_id", businessId)
      .maybeSingle();

    if (data?.labels) {
      const stored = data.labels as Record<string, string>;
      setLabels({
        ...DEFAULT_LABELS,
        ...stored,
      });
    } else {
      setLabels(DEFAULT_LABELS);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLabels();
  }, [businessId]);

  return (
    <BusinessLabelsContext.Provider value={{ labels, loading, refresh: fetchLabels }}>
      {children}
    </BusinessLabelsContext.Provider>
  );
};

export const useBusinessLabels = () => {
  const context = useContext(BusinessLabelsContext);
  if (!context) throw new Error("useBusinessLabels must be used within BusinessLabelsProvider");
  return context;
};

export { DEFAULT_LABELS };
