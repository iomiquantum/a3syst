import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import AdminClinicasTab from "@/components/admin/AdminClinicasTab";
import AdminUsuariosTab from "@/components/admin/AdminUsuariosTab";

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
          <p className="text-muted-foreground">Gestiona clínicas, usuarios y roles</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <Tabs defaultValue="clinicas" className="w-full">
            <TabsList>
              <TabsTrigger value="clinicas" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Clínicas
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Usuarios
              </TabsTrigger>
            </TabsList>
            <TabsContent value="clinicas" className="mt-6">
              <AdminClinicasTab clinics={clinics} roles={roles} onRefresh={fetchData} />
            </TabsContent>
            <TabsContent value="usuarios" className="mt-6">
              <AdminUsuariosTab clinics={clinics} profiles={profiles} roles={roles} onRefresh={fetchData} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPage;
