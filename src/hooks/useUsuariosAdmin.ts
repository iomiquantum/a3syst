import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UsuarioCompleto {
  user_id: string;
  full_name: string;
  apellido: string;
  email: string;
  telefono: string;
  avatar_url: string | null;
  estado: string;
  ultimo_acceso: string | null;
  notas: string;
  created_at: string;
  roles: {
    id: string;
    role: string;
    clinic_id: string;
    clinic_name: string;
    permissions: any;
  }[];
}

export const roleLabelsAdmin: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  secretary: "Secretario/a",
  professional: "Profesional",
  empleado: "Empleado",
  vendedor: "Vendedor",
};

export const roleColors: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  manager: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  secretary: "bg-muted text-muted-foreground",
  professional: "bg-muted text-muted-foreground",
  empleado: "bg-muted text-muted-foreground",
  vendedor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export const estadoColors: Record<string, string> = {
  activo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactivo: "bg-muted text-muted-foreground",
  suspendido: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export function useUsuariosAdmin() {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*, clinics(name)").order("created_at"),
      ]);

      const profilesMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        profilesMap.set(p.user_id, { ...p, roles: [] });
      });

      (roles || []).forEach((r: any) => {
        const profile = profilesMap.get(r.user_id);
        if (profile) {
          profile.roles.push({
            id: r.id,
            role: r.role,
            clinic_id: r.clinic_id,
            clinic_name: (r.clinics as any)?.name || "—",
            permissions: r.permissions,
          });
        }
      });

      return Array.from(profilesMap.values()) as UsuarioCompleto[];
    },
  });

  const { data: clinics = [] } = useQuery({
    queryKey: ["admin-clinics"],
    queryFn: async () => {
      const { data } = await supabase.from("clinics").select("id, name, slug").order("name");
      return data || [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (form: { nombre: string; apellido: string; email: string; telefono: string; clinic_id: string; role: string; notas: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email.trim(),
          password: form.password,
          full_name: `${form.nombre.trim()} ${form.apellido.trim()}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data?.user?.id;
      if (!userId) throw new Error("No se pudo obtener el ID del usuario creado");

      // Update profile with extra fields
      await supabase.from("profiles").update({
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        notas: form.notas.trim(),
      } as any).eq("user_id", userId);

      // Assign role
      if (form.clinic_id && form.role) {
        const defaultPerms = form.role === "admin"
          ? { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true }
          : { agenda: true, pacientes: true, ventas: form.role === "vendedor", configuracion: false, reportes: false };

        await supabase.from("user_roles").insert({
          user_id: userId,
          clinic_id: form.clinic_id,
          role: form.role as any,
          permissions: defaultPerms,
        } as any);
      }

      // Log activity
      const { data: session } = await supabase.auth.getSession();
      await supabase.from("actividad_usuarios").insert({
        usuario_id: userId,
        accion: "usuario_creado",
        detalle: { nombre: `${form.nombre} ${form.apellido}`, email: form.email, rol: form.role },
        realizado_por: session.session?.user?.id,
      } as any);

      return data;
    },
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message || "Error al crear usuario"),
  });

  const changeRole = useMutation({
    mutationFn: async ({ roleId, newRole, userId, reason }: { roleId: string; newRole: string; userId: string; reason?: string }) => {
      const oldRole = usuarios.find(u => u.user_id === userId)?.roles.find(r => r.id === roleId)?.role;

      const defaultPerms = newRole === "admin"
        ? { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true }
        : { agenda: true, pacientes: true, ventas: newRole === "vendedor", configuracion: false, reportes: false };

      const { error } = await supabase.from("user_roles").update({
        role: newRole as any,
        permissions: defaultPerms,
      } as any).eq("id", roleId);
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      await supabase.from("actividad_usuarios").insert({
        usuario_id: userId,
        accion: "rol_cambiado",
        detalle: { antes: oldRole, despues: newRole, razon: reason || "" },
        realizado_por: session.session?.user?.id,
      } as any);
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const changeEstado = useMutation({
    mutationFn: async ({ userId, nuevoEstado }: { userId: string; nuevoEstado: string }) => {
      const { error } = await supabase.from("profiles").update({ estado: nuevoEstado } as any).eq("user_id", userId);
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      await supabase.from("actividad_usuarios").insert({
        usuario_id: userId,
        accion: "estado_cambiado",
        detalle: { nuevo_estado: nuevoEstado },
        realizado_por: session.session?.user?.id,
      } as any);
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateNotas = useMutation({
    mutationFn: async ({ userId, notas }: { userId: string; notas: string }) => {
      const { error } = await supabase.from("profiles").update({ notas } as any).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notas guardadas");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const assignToClinic = useMutation({
    mutationFn: async ({ userId, clinicId, role }: { userId: string; clinicId: string; role: string }) => {
      const defaultPerms = role === "admin"
        ? { agenda: true, pacientes: true, ventas: true, configuracion: true, reportes: true }
        : { agenda: true, pacientes: true, ventas: role === "vendedor", configuracion: false, reportes: false };

      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        clinic_id: clinicId,
        role: role as any,
        permissions: defaultPerms,
      } as any);
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      await supabase.from("actividad_usuarios").insert({
        usuario_id: userId,
        accion: "asignado_empresa",
        detalle: { clinic_id: clinicId, rol: role },
        realizado_por: session.session?.user?.id,
      } as any);
    },
    onSuccess: () => {
      toast.success("Usuario asignado");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ roleId, userId }: { roleId: string; userId: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;

      const { data: session } = await supabase.auth.getSession();
      await supabase.from("actividad_usuarios").insert({
        usuario_id: userId,
        accion: "rol_eliminado",
        detalle: { role_id: roleId },
        realizado_por: session.session?.user?.id,
      } as any);
    },
    onSuccess: () => {
      toast.success("Rol eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Email de reseteo enviado");
  };

  return {
    usuarios,
    clinics,
    isLoading,
    createUser,
    changeRole,
    changeEstado,
    updateNotas,
    assignToClinic,
    removeRole,
    resetPassword,
  };
}

export function useActividadUsuarios(userId?: string) {
  return useQuery({
    queryKey: ["actividad-usuarios", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("actividad_usuarios")
        .select("*")
        .eq("usuario_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });
}
