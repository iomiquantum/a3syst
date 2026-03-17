import { useState, useMemo, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Users } from "lucide-react";
import { useClinic } from "@/hooks/useClinic";
import { useUsuariosAdmin, UsuarioCompleto } from "@/hooks/useUsuariosAdmin";
import UserFilters from "@/components/admin/usuarios/UserFilters";
import UsersTable from "@/components/admin/usuarios/UsersTable";
import UserDrawer from "@/components/admin/usuarios/UserDrawer";
import CreateUserModal from "@/components/admin/usuarios/CreateUserModal";
import CreateEmpresaModal from "@/components/admin/usuarios/CreateEmpresaModal";
import ChangeRoleModal from "@/components/admin/usuarios/ChangeRoleModal";
import ActivityModal from "@/components/admin/usuarios/ActivityModal";

const AdminUsuariosPage = () => {
  const { isSuperAdmin } = useClinic();
  const { usuarios, clinics, isLoading, createUser, changeRole, changeEstado, updateNotas, resetPassword } = useUsuariosAdmin();

  // Filters
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmpresaOpen, setCreateEmpresaOpen] = useState(false);
  const [changeRoleData, setChangeRoleData] = useState<{ user: UsuarioCompleto; roleId: string; currentRole: string } | null>(null);
  const [drawerUser, setDrawerUser] = useState<UsuarioCompleto | null>(null);
  const [historyUser, setHistoryUser] = useState<UsuarioCompleto | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filter logic
  const filtered = useMemo(() => {
    let result = usuarios;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (empresa && empresa !== "all") {
      result = result.filter(u => u.roles.some(r => r.clinic_id === empresa));
    }
    if (rol && rol !== "all") {
      result = result.filter(u => u.roles.some(r => r.role === rol));
    }
    if (estado && estado !== "all") {
      result = result.filter(u => u.estado === estado);
    }
    return result;
  }, [usuarios, debouncedSearch, empresa, rol, estado]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, empresa, rol, estado]);

  const uniqueClinics = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach(u => u.roles.forEach(r => set.add(r.clinic_id)));
    return set.size;
  }, [usuarios]);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6" /> Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground">
              {usuarios.length} usuarios · {uniqueClinics} empresas
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
            </Button>
            <Button variant="outline" onClick={() => setCreateEmpresaOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" /> Nueva Empresa
            </Button>
          </div>
        </div>

        {/* Filters */}
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          empresa={empresa}
          onEmpresaChange={setEmpresa}
          rol={rol}
          onRolChange={setRol}
          estado={estado}
          onEstadoChange={setEstado}
          clinics={clinics}
          onClear={() => { setSearch(""); setEmpresa(""); setRol(""); setEstado(""); }}
        />

        {/* Table */}
        <UsersTable
          usuarios={filtered}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onViewUser={u => setDrawerUser(u)}
          onChangeRole={(u, roleId, currentRole) => setChangeRoleData({ user: u, roleId, currentRole })}
          onSuspend={u => changeEstado.mutate({ userId: u.user_id, nuevoEstado: "suspendido" })}
          onReactivate={u => changeEstado.mutate({ userId: u.user_id, nuevoEstado: "activo" })}
          onResetPassword={email => resetPassword(email)}
          onViewHistory={u => setHistoryUser(u)}
          onDelete={u => changeEstado.mutate({ userId: u.user_id, nuevoEstado: "inactivo" })}
        />
      </div>

      {/* Modals */}
      <CreateUserModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        clinics={clinics}
        onSubmit={form => { createUser.mutate(form); setCreateOpen(false); }}
        isLoading={createUser.isPending}
      />

      <CreateEmpresaModal open={createEmpresaOpen} onOpenChange={setCreateEmpresaOpen} />

      <ChangeRoleModal
        open={!!changeRoleData}
        onOpenChange={v => { if (!v) setChangeRoleData(null); }}
        user={changeRoleData?.user || null}
        roleId={changeRoleData?.roleId || ""}
        currentRole={changeRoleData?.currentRole || ""}
        onSubmit={(newRole, reason) => {
          if (changeRoleData) {
            changeRole.mutate({ roleId: changeRoleData.roleId, newRole, userId: changeRoleData.user.user_id, reason });
            setChangeRoleData(null);
          }
        }}
        isLoading={changeRole.isPending}
      />

      <UserDrawer
        open={!!drawerUser}
        onOpenChange={v => { if (!v) setDrawerUser(null); }}
        user={drawerUser}
        onChangeRole={(roleId, currentRole) => { if (drawerUser) setChangeRoleData({ user: drawerUser, roleId, currentRole }); }}
        onSuspend={() => { if (drawerUser) changeEstado.mutate({ userId: drawerUser.user_id, nuevoEstado: "suspendido" }); }}
        onReactivate={() => { if (drawerUser) changeEstado.mutate({ userId: drawerUser.user_id, nuevoEstado: "activo" }); }}
        onSaveNotas={notas => { if (drawerUser) updateNotas.mutate({ userId: drawerUser.user_id, notas }); }}
        onResetPassword={() => { if (drawerUser) resetPassword(drawerUser.email); }}
      />

      <ActivityModal
        open={!!historyUser}
        onOpenChange={v => { if (!v) setHistoryUser(null); }}
        user={historyUser}
      />
    </AppLayout>
  );
};

export default AdminUsuariosPage;
