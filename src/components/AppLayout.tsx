import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, MessageSquare, Settings,
  LogOut, ChevronLeft, Bell, Search, DollarSign, UserCog,
  Building2, Stethoscope, Briefcase, ShieldCheck, Globe, PhoneCall, Megaphone, Bot,
  Sun, Moon, Zap, Palette, Brain, ClipboardList, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import SidebarTooltip from "@/components/SidebarTooltip";
import { useTheme } from "@/hooks/useTheme";

interface AppLayoutProps { children: ReactNode; }

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Clientes", path: "/pacientes" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: DollarSign, label: "Ventas", path: "/ventas" },
  { icon: MessageSquare, label: "Mensajes", path: "/mensajes" },
  { icon: PhoneCall, label: "Call Center", path: "/crm" },
  { icon: Megaphone, label: "Marketing", path: "/marketing" },
  { icon: Zap, label: "ADS", path: "/ads" },
  { icon: Palette, label: "Contenido", path: "/contenido" },
  { icon: Brain, label: "Psycho-Matrix", path: "/psycho-matrix" },
  { icon: ClipboardList, label: "Planificación", path: "/planificacion" },
  { icon: Video, label: "Reuniones", path: "/reuniones" },
];

const configNav = [
  { icon: Building2, label: "Sucursales", path: "/configuracion/sucursales" },
  { icon: Stethoscope, label: "Servicios", path: "/configuracion/tratamientos" },
  { icon: Briefcase, label: "Equipo", path: "/configuracion/profesionales" },
  { icon: UserCog, label: "Usuarios", path: "/configuracion/usuarios" },
  { icon: Settings, label: "Ajustes", path: "/configuracion/ajustes" },
  { icon: Globe, label: "Widget Web", path: "/configuracion/widget" },
  { icon: Bot, label: "Agente IA", path: "/configuracion/agente-ia" },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { clinicName, isSuperAdmin, allClinics, selectClinic, clinicId } = useClinic();
  const { theme, toggleTheme } = useTheme();

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
      <aside className={cn("h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300", collapsed ? "w-[60px]" : "w-[230px]")}>
        <div className={cn("h-16 flex items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-[10px]">IO</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-lg font-bold text-foreground tracking-tight leading-none">IOMI</span>
                <span className="text-[9px] block text-muted-foreground tracking-[0.2em] leading-none">SYS</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto overflow-x-hidden">
          {isSuperAdmin && (
            <div className="space-y-1">
              {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Super Admin</p>}
              <SidebarTooltip label="Panel Admin" show={collapsed}>
                <button onClick={() => navigate("/admin")} className={cn("w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5", isActive("/admin") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">Panel Admin</span>}
                </button>
              </SidebarTooltip>
            </div>
          )}

          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Principal</p>}
            {mainNav.map(({ icon: Icon, label, path }) => (
              <SidebarTooltip key={path} label={label} show={collapsed}>
                <button onClick={() => navigate(path)} className={cn("w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5", isActive(path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </SidebarTooltip>
            ))}
          </div>
          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">Configuración</p>}
            {configNav.map(({ icon: Icon, label, path }) => (
              <SidebarTooltip key={path} label={label} show={collapsed}>
                <button onClick={() => navigate(path)} className={cn("w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5", isActive(path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50")}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>
              </SidebarTooltip>
            ))}
          </div>
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <SidebarTooltip label={theme === "dark" ? "Modo claro" : "Modo oscuro"} show={collapsed}>
            <button onClick={toggleTheme} className={cn("w-full flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5")}>
              {theme === "dark" ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
            </button>
          </SidebarTooltip>
          <SidebarTooltip label={collapsed ? "Expandir" : "Colapsar"} show={collapsed}>
            <button onClick={() => setCollapsed(!collapsed)} className={cn("w-full flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5")}>
              <ChevronLeft className={cn("w-5 h-5 shrink-0 transition-transform", collapsed && "rotate-180")} />
              {!collapsed && <span>Colapsar</span>}
            </button>
          </SidebarTooltip>
          <SidebarTooltip label="Cerrar sesión" show={collapsed}>
            <button onClick={handleSignOut} className={cn("w-full flex items-center gap-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all", collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5")}>
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </SidebarTooltip>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar clientes, citas..." className="pl-10 bg-background border-border h-9" />
          </div>
          <div className="flex items-center gap-4">
            {/* Super admin clinic switcher */}
            {isSuperAdmin && allClinics.length > 0 && (
              <Select value={clinicId || ""} onValueChange={(v) => {
                const clinic = allClinics.find(c => c.id === v);
                if (clinic) selectClinic(clinic.id, clinic.name);
              }}>
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Seleccionar negocio" />
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
