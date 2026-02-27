import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Calendar, BarChart3, Megaphone, Palette,
  Rocket, DollarSign, Brain, Users, Briefcase, Stethoscope, Building2,
  Bot, TrendingUp, User, LogOut, ChevronLeft, Menu, X, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";

interface AppLayoutProps { children: ReactNode; }

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { clinicName, isSuperAdmin, allClinics, selectClinic, clinicId } = useClinic();
  const { labels } = useBusinessLabels();

  // Badges
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);

  useEffect(() => {
    if (!clinicId) return;
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.from("conversations").select("unread_count").eq("clinic_id", clinicId).gt("unread_count", 0),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("date", today),
    ]).then(([{ data: convs }, { count }]) => {
      setUnreadMessages((convs || []).reduce((s, c) => s + (c.unread_count || 0), 0));
      setTodayAppointments(count || 0);
    });
  }, [clinicId]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.full_name || userEmail.split("@")[0] || "Usuario";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navGroups = [
    ...(isSuperAdmin ? [{
      label: "ADMIN",
      items: [{ icon: ShieldCheck, label: "Panel Admin", path: "/admin" }],
    }] : []),
    {
      label: "PRINCIPAL",
      items: [{ icon: LayoutDashboard, label: "Command Center", path: "/dashboard" }],
    },
    {
      label: "AUTOPILOTOS",
      items: [
        { icon: MessageSquare, label: "Mensajes", path: "/mensajes", badge: unreadMessages },
        { icon: Calendar, label: "Agenda", path: "/agenda", badge: todayAppointments },
        { icon: BarChart3, label: "CRM", path: "/crm" },
        { icon: Megaphone, label: "Marketing", path: "/marketing" },
        { icon: Palette, label: "Contenido", path: "/contenido" },
        { icon: Rocket, label: "Ads", path: "/ads" },
        { icon: DollarSign, label: "Ventas", path: "/ventas" },
        { icon: Brain, label: "Psycho-Matrix", path: "/psycho-matrix" },
      ],
    },
    {
      label: "GESTIÓN",
      items: [
        { icon: Users, label: labels.patients, path: "/pacientes" },
        { icon: Briefcase, label: labels.professionals, path: "/configuracion/profesionales" },
        { icon: Stethoscope, label: labels.treatments, path: "/configuracion/tratamientos" },
        { icon: Building2, label: labels.branches, path: "/configuracion/sucursales" },
      ],
    },
    {
      label: "CONFIGURACIÓN",
      items: [
        { icon: Bot, label: "Configuración IA", path: "/configuracion/agente-ia" },
        { icon: TrendingUp, label: "Analytics", path: "/analytics" },
        { icon: User, label: "Mi cuenta", path: "/mi-cuenta" },
      ],
    },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn("h-16 flex items-center border-b border-white/5 shrink-0", collapsed ? "justify-center px-2" : "px-5")}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[10px]">A3</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold text-white tracking-tight leading-none">A3syst</span>
            </div>
          )}
        </div>
      </div>

      {/* Clinic name + autopilot badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <p className="text-xs text-white/40 truncate">{clinicName}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">Autopilotos: ON</span>
          </div>
        </div>
      )}

      {/* Super admin clinic selector */}
      {isSuperAdmin && allClinics.length > 0 && !collapsed && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <Select value={clinicId || ""} onValueChange={(v) => {
            const clinic = allClinics.find(c => c.id === v);
            if (clinic) selectClinic(clinic.id, clinic.name);
          }}>
            <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white/70">
              <SelectValue placeholder="Seleccionar negocio" />
            </SelectTrigger>
            <SelectContent>
              {allClinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-5 overflow-y-auto overflow-x-hidden">
        {navGroups.map(group => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.15em] px-3 mb-1.5">
                {group.label}
              </p>
            )}
            {group.items.map(item => {
              const active = isActive(item.path);
              const badge = (item as any).badge;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all relative",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                    active
                      ? "bg-[#8B5CF6]/15 text-[#A78BFA] border-l-2 border-[#8B5CF6]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5 border-l-2 border-transparent"
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-[#A78BFA]" : "text-white/30")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {badge > 0 && !collapsed && (
                    <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {badge > 0 && collapsed && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-2 shrink-0">
        {/* User info */}
        <div className={cn("flex items-center gap-2.5 px-2 py-1.5", collapsed && "justify-center")}>
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white text-[10px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/70 truncate">{userName}</p>
              <p className="text-[10px] text-white/25">Plan: FREE</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg text-xs text-white/30 hover:text-white/50 hover:bg-white/5 transition-all",
            collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
          )}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Colapsar</span>}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all",
            collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0d0d1a] transform transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col bg-[#0d0d1a] border-r border-white/5 transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[#0d0d1a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 text-white/50 hover:text-white" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2.5">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white text-[9px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-white/50">{userName}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 text-white">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
