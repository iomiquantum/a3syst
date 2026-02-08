import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, MessageSquare, Settings,
  LogOut, ChevronLeft, Bell, Search, DollarSign, UserCog,
  Building2, Stethoscope, Briefcase, ShieldCheck, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";

interface AppLayoutProps { children: ReactNode; }

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Pacientes", path: "/pacientes" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: DollarSign, label: "Ventas", path: "/ventas" },
  { icon: MessageSquare, label: "Mensajes", path: "/mensajes" },
];

const configNav = [
  { icon: Building2, label: "Sucursales", path: "/configuracion/sucursales" },
  { icon: Stethoscope, label: "Tratamientos", path: "/configuracion/tratamientos" },
  { icon: Briefcase, label: "Profesionales", path: "/configuracion/profesionales" },
  { icon: UserCog, label: "Usuarios", path: "/configuracion/usuarios" },
  { icon: Settings, label: "Ajustes", path: "/configuracion/ajustes" },
  { icon: Globe, label: "Widget Web", path: "/configuracion/widget" },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { clinicName, isSuperAdmin, allClinics, selectClinic, clinicId } = useClinic();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuario";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={cn("h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden", collapsed ? "w-[72px]" : "w-[250px]")}>
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-[10px]">IO</span>
            </div>
            {!collapsed && (
              <div>
                <span className="text-lg font-bold text-foreground tracking-tight leading-none">IOMI</span>
                <span className="text-[9px] block text-muted-foreground tracking-[0.2em] leading-none">CLÍNICAS</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* Super Admin nav */}
          {isSuperAdmin && (
            <div className="space-y-1">
              {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Super Admin</p>}
              <button onClick={() => navigate("/admin")} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", isActive("/admin") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Panel Admin</span>}
              </button>
            </div>
          )}

          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Principal</p>}
            {mainNav.map(({ icon: Icon, label, path }) => (
              <button key={path} onClick={() => navigate(path)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", isActive(path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Configuración</p>}
            {configNav.map(({ icon: Icon, label, path }) => (
              <button key={path} onClick={() => navigate(path)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all", isActive(path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all">
            <ChevronLeft className={cn("w-5 h-5 shrink-0 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Colapsar</span>}
          </button>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar pacientes, citas..." className="pl-10 bg-background border-border h-9" />
          </div>
          <div className="flex items-center gap-4">
            {/* Super admin clinic switcher */}
            {isSuperAdmin && allClinics.length > 0 && (
              <Select value={clinicId || ""} onValueChange={(v) => {
                const clinic = allClinics.find(c => c.id === v);
                if (clinic) selectClinic(clinic.id, clinic.name);
              }}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Seleccionar clínica" />
                </SelectTrigger>
                <SelectContent>
                  {allClinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
            </button>
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{isSuperAdmin ? `⚡ ${clinicName}` : clinicName}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
