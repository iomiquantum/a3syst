import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, DollarSign, Key, Rocket, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import AdminClinicasTab from "@/components/admin/AdminClinicasTab";
import AdminUsuariosTab from "@/components/admin/AdminUsuariosTab";
import AdminTokenBudgets from "@/components/admin/AdminTokenBudgets";
import AdminAPIKeysTab from "@/components/admin/AdminAPIKeysTab";
import AdminLaunchTab from "@/components/admin/AdminLaunchTab";
import AdminAnalyticsUnified from "@/components/admin/AdminAnalyticsUnified";

const AdminPage = () => {
  const { isSuperAdmin } = useClinic();
  const [clinics, setClinics] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: c }, { data: p }, { data: rolesData }] = await Promise.all([
      supabase.from("clinics").select("*").order("created_at"),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("*, clinics(name)").order("created_at"),
    ]);

    const profilesMap: Record<string, any> = {};
    (p || []).forEach(pr => { profilesMap[pr.user_id] = pr; });
    const enrichedRoles = (rolesData || []).map(r => ({
      ...r,
      profiles: profilesMap[r.user_id] || { full_name: "Sin nombre", email: "" },
    }));

    setClinics(c || []);
    setProfiles(p || []);
    setRoles(enrichedRoles);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
         <h1 className="text-2xl font-bold text-foreground">Panel Super Admin</h1>
          <p className="text-muted-foreground">Gestiona negocios, usuarios y roles</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <Tabs defaultValue="clinicas" className="w-full">
            <TabsList>
               <TabsTrigger value="clinicas" className="flex items-center gap-2">
                 <Building2 className="w-4 h-4" /> Negocios
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Usuarios
              </TabsTrigger>
              <TabsTrigger value="presupuestos" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Presupuestos IA
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="flex items-center gap-2">
                <Key className="w-4 h-4" /> API Keys
              </TabsTrigger>
              <TabsTrigger value="lanzamiento" className="flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Lanzamiento
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Analítica
              </TabsTrigger>
            </TabsList>
            <TabsContent value="clinicas" className="mt-6">
              <AdminClinicasTab clinics={clinics} roles={roles} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="usuarios" className="mt-6">
              <AdminUsuariosTab clinics={clinics} profiles={profiles} roles={roles} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="presupuestos" className="mt-6">
              <AdminTokenBudgets clinics={clinics} profiles={profiles} roles={roles} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="apikeys" className="mt-6">
              <AdminAPIKeysTab clinics={clinics} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="lanzamiento" className="mt-6">
              <AdminLaunchTab />
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <AdminAnalyticsUnified />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPage;
