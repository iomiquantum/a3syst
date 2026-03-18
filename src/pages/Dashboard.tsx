import { useState, useEffect, useMemo } from "react";
import {
  Check, X, Edit3, MessageSquare, Calendar, Users, DollarSign, FileText,
  Bot, Clock, TrendingUp, Sparkles, PartyPopper, Palmtree, ArrowRight,
  Rocket, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppDashboardCard from "@/components/whatsapp/WhatsAppDashboardCard";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinic } from "@/hooks/useClinic";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessLabels } from "@/hooks/useBusinessLabels";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

/* ─── helpers ─── */
const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Buenos días", emoji: "☀️" };
  if (h < 19) return { text: "Buenas tardes", emoji: "🌤️" };
  return { text: "Buenas noches", emoji: "🌙" };
};

const ago = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch { return ""; }
};

const today = () => new Date().toISOString().split("T")[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};
const todayStart = () => new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

/* ─── types ─── */
interface ApprovalItem {
  id: string;
  type: "appointment" | "post" | "lead";
  icon: typeof Calendar;
  title: string;
  description: string;
  canEdit?: boolean;
  data?: any;
}

interface ActivityItem {
  id: string;
  icon: typeof Bot;
  text: string;
  time: string;
  color: string;
}

/* ─── Component ─── */
const Dashboard = () => {
  const { clinicId, clinicName, needsOnboarding } = useClinic();
  const { user } = useAuth();
  const { labels } = useBusinessLabels();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState({ messages: 0, appointments: 0, leads: 0, revenue: 0, posts: 0 });
  const [tomorrowAppts, setTomorrowAppts] = useState(0);
  const [tomorrowPosts, setTomorrowPosts] = useState(0);

  const greeting = useMemo(() => timeGreeting(), []);

  useEffect(() => {
    if (!clinicId || !user) return;

    const fetchAll = async () => {
      setLoading(true);
      const todayDate = today();
      const tomorrowDate = tomorrow();
      const todayISO = todayStart();
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

      // Fetch profile name
      const profilePromise = supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Pending appointments today
      const pendingApptsPromise = supabase
        .from("appointments")
        .select("id, date, time, status, patients(first_name, last_name), treatments(name)")
        .eq("clinic_id", clinicId)
        .eq("date", todayDate)
        .eq("status", "pendiente")
        .order("time")
        .limit(10);

      // Draft/scheduled posts
      const draftPostsPromise = supabase
        .from("content_posts")
        .select("id, title, body, status")
        .eq("clinic_id", clinicId)
        .in("status", ["draft", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(5);

      // Recent contacts (leads)
      const recentLeadsPromise = supabase
        .from("contacts")
        .select("id, name, source, created_at")
        .eq("clinic_id", clinicId)
        .gte("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      // Activity: recent bot messages
      const botMessagesPromise = supabase
        .from("messages")
        .select("id, content, created_at, conversation_id, direction")
        .eq("clinic_id", clinicId)
        .eq("direction", "outbound")
        .gte("created_at", todayISO)
        .order("created_at", { ascending: false })
        .limit(5);

      // Activity: today's confirmed appointments
      const confirmedApptsPromise = supabase
        .from("appointments")
        .select("id, time, status, patients(first_name, last_name)")
        .eq("clinic_id", clinicId)
        .eq("date", todayDate)
        .eq("status", "confirmado")
        .order("time")
        .limit(5);

      // Stats: messages today
      const msgCountPromise = supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", todayISO);

      // Stats: appointments today
      const apptCountPromise = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("date", todayDate);

      // Stats: leads today
      const leadCountPromise = supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", todayISO);

      // Stats: revenue today
      const revenuePromise = supabase
        .from("sales")
        .select("amount, discount")
        .eq("clinic_id", clinicId)
        .gte("created_at", todayISO);

      // Stats: posts today
      const postCountPromise = supabase
        .from("content_posts")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", todayISO);

      // Tomorrow
      const tomorrowApptsPromise = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("date", tomorrowDate);

      const tomorrowPostsPromise = supabase
        .from("content_posts")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "scheduled");

      const [
        profileRes, pendingRes, draftsRes, leadsRes,
        botMsgRes, confirmedRes,
        msgCountRes, apptCountRes, leadCountRes, revenueRes, postCountRes,
        tmrwApptsRes, tmrwPostsRes
      ] = await Promise.all([
        profilePromise, pendingApptsPromise, draftPostsPromise, recentLeadsPromise,
        botMessagesPromise, confirmedApptsPromise,
        msgCountPromise, apptCountPromise, leadCountPromise, revenuePromise, postCountPromise,
        tomorrowApptsPromise, tomorrowPostsPromise
      ]);

      // Profile
      setUserName(profileRes.data?.full_name || user.email?.split("@")[0] || "");

      // Build approval items
      const items: ApprovalItem[] = [];
      (pendingRes.data || []).forEach((apt: any) => {
        items.push({
          id: apt.id,
          type: "appointment",
          icon: Calendar,
          title: `${labels.appointments || "Cita"} pendiente`,
          description: `${apt.patients?.first_name || ""} ${apt.patients?.last_name || ""} a las ${apt.time?.slice(0, 5)} para ${apt.treatments?.name || "servicio"}`,
          data: apt,
        });
      });
      (draftsRes.data || []).forEach((post: any) => {
        items.push({
          id: post.id,
          type: "post",
          icon: FileText,
          title: "Post listo para publicar",
          description: post.title || post.body?.substring(0, 60) || "Sin título",
          canEdit: true,
          data: post,
        });
      });
      (leadsRes.data || []).forEach((lead: any) => {
        items.push({
          id: lead.id,
          type: "lead",
          icon: Users,
          title: "Nuevo lead",
          description: `${lead.name} de ${lead.source || "desconocido"}`,
          data: lead,
        });
      });
      setApprovals(items);

      // Build activity feed
      const feed: ActivityItem[] = [];
      (botMsgRes.data || []).forEach((msg: any) => {
        feed.push({
          id: msg.id,
          icon: Bot,
          text: `Respondió un mensaje ${ago(msg.created_at)}`,
          time: msg.created_at,
          color: "text-[#8B5CF6]",
        });
      });
      (confirmedRes.data || []).forEach((apt: any) => {
        feed.push({
          id: apt.id,
          icon: Calendar,
          text: `Cita de ${apt.patients?.first_name || ""} ${apt.patients?.last_name || ""} confirmada`,
          time: apt.time || "",
          color: "text-emerald-400",
        });
      });
      (leadsRes.data || []).forEach((lead: any) => {
        feed.push({
          id: "act-" + lead.id,
          icon: Users,
          text: `Nuevo lead registrado: ${lead.name}`,
          time: lead.created_at,
          color: "text-blue-400",
        });
      });
      feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(feed.slice(0, 10));

      // Stats
      const salesData = revenueRes.data || [];
      const revenue = salesData.reduce((s, r) => s + Number(r.amount) - (Number(r.amount) * Number(r.discount) / 100), 0);
      setStats({
        messages: msgCountRes.count || 0,
        appointments: apptCountRes.count || 0,
        leads: leadCountRes.count || 0,
        revenue,
        posts: postCountRes.count || 0,
      });

      setTomorrowAppts(tmrwApptsRes.count || 0);
      setTomorrowPosts(tmrwPostsRes.count || 0);

      setLoading(false);
    };

    fetchAll();
  }, [clinicId, user]);

  /* ─── Actions ─── */
  const handleApprove = async (item: ApprovalItem) => {
    if (item.type === "appointment") {
      const { error } = await supabase.from("appointments").update({ status: "confirmado" }).eq("id", item.id);
      if (error) { toast.error(error.message); return; }
      toast.success("✅ Cita confirmada");
    } else if (item.type === "post") {
      const { error } = await supabase.from("content_posts").update({ status: "published", published_at: new Date().toISOString() }).eq("id", item.id);
      if (error) { toast.error(error.message); return; }
      toast.success("✅ Post publicado");
    } else if (item.type === "lead") {
      toast.success("✅ Lead marcado para contactar");
    }
    setApprovals(prev => prev.filter(a => a.id !== item.id));
  };

  const handleReject = async (item: ApprovalItem) => {
    if (item.type === "appointment") {
      const { error } = await supabase.from("appointments").update({ status: "cancelado" }).eq("id", item.id);
      if (error) { toast.error(error.message); return; }
      toast.success("❌ Cita cancelada");
    } else if (item.type === "post") {
      const { error } = await supabase.from("content_posts").delete().eq("id", item.id);
      if (error) { toast.error(error.message); return; }
      toast.success("❌ Post descartado");
    } else {
      toast.success("❌ Lead descartado");
    }
    setApprovals(prev => prev.filter(a => a.id !== item.id));
  };

  const statCards = [
    { label: "Mensajes hoy", value: stats.messages, icon: MessageSquare, route: "/mensajes", color: "from-[#8B5CF6] to-[#6D28D9]" },
    { label: `${labels.appointments || "Citas"} hoy`, value: stats.appointments, icon: Calendar, route: "/agenda", color: "from-blue-500 to-blue-700" },
    { label: "Leads nuevos", value: stats.leads, icon: Users, route: "/crm", color: "from-cyan-500 to-cyan-700" },
    { label: "Ingresos hoy", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, route: "/ventas", color: "from-emerald-500 to-emerald-700" },
    { label: "Posts", value: stats.posts, icon: FileText, route: "/contenido", color: "from-pink-500 to-pink-700" },
  ];

  /* ─── Skeleton ─── */
  const ShimmerCard = () => (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
      <Skeleton className="h-4 w-2/3 bg-white/5" />
      <Skeleton className="h-3 w-full bg-white/5" />
      <Skeleton className="h-8 w-1/3 bg-white/5" />
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            {loading ? (
              <Skeleton className="h-8 w-60 bg-white/5" />
            ) : (
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
                {greeting.text}, {userName} {greeting.emoji}
              </h1>
            )}
            <p className="text-muted-foreground mt-1">{clinicName}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Autopilotos activos
          </span>
        </div>

        {/* ═══ ONBOARDING BANNER ═══ */}
        {needsOnboarding && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <Rocket className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Completa la configuración de tu negocio</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configura tus servicios, horarios y preferencias para activar todos los autopilotos.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/onboarding")}
                size="lg"
                className="gradient-primary text-primary-foreground hover:opacity-90 whitespace-nowrap shrink-0"
              >
                <Settings className="w-4 h-4 mr-2" />
                Finalizar Onboarding
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ 1: APPROVAL QUEUE ═══ */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Necesita tu aprobación
          </h2>

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3].map(i => <ShimmerCard key={i} />)}</div>
          ) : approvals.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.03] backdrop-blur-sm">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <Palmtree className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-foreground font-semibold">¡Todo al día!</p>
                <p className="text-sm text-muted-foreground mt-1">La IA tiene todo bajo control. Disfruta tu tiempo libre. 🏖️</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {approvals.map(item => (
                <Card key={item.id} className="border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-white/15 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#8B5CF6]/10 shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-[#A78BFA]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                        <p className="text-sm text-foreground mt-0.5 truncate">{item.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleApprove(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          >
                            <Check className="w-3.5 h-3.5" /> Aprobar
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Rechazar
                          </button>
                          {item.canEdit && (
                            <button
                              onClick={() => navigate("/contenido")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground text-xs hover:text-foreground transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Editar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ═══ 2: ACTIVITY FEED ═══ */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            En proceso
          </h2>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <ShimmerCard key={i} />)}</div>
          ) : activity.length === 0 ? (
            <Card className="border-white/5 bg-white/[0.03] backdrop-blur-sm">
              <CardContent className="py-8 text-center">
                <Sparkles className="w-8 h-8 text-[#A78BFA] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Los autopilotos están esperando acción. ¡Configura tus servicios para activarlos!</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/5 bg-white/[0.03] backdrop-blur-sm">
              <CardContent className="p-0 divide-y divide-white/5">
                {activity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                    <p className="text-sm text-foreground flex-1 truncate">{item.text}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ago(item.time)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* ═══ 3: STATS ═══ */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Resumen del día
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map(sc => (
              <Card
                key={sc.label}
                onClick={() => navigate(sc.route)}
                className="border-white/5 bg-white/[0.03] backdrop-blur-sm cursor-pointer hover:border-white/15 transition-colors group"
              >
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${sc.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <sc.icon className="w-4 h-4 text-white" />
                  </div>
                  {loading ? (
                    <Skeleton className="h-7 w-12 bg-white/5" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">{sc.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sc.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══ 4: TOMORROW PLAN ═══ */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            🔮 Plan para mañana
          </h2>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <CardContent className="p-5 space-y-3">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-4 w-3/4 bg-white/5" />)}</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[#A78BFA]" />
                    <span className="text-foreground">
                      Mañana tienes <strong>{tomorrowAppts}</strong> {tomorrowAppts === 1 ? "cita programada" : "citas programadas"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground">Enviaré recordatorios automáticos</span>
                  </div>
                  {tomorrowPosts > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-pink-400" />
                      <span className="text-muted-foreground">Publicaré contenido programado</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-muted-foreground">Seguiré nutriendo los leads del pipeline</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ═══ 5: WHATSAPP CARD ═══ */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            📱 Canales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <WhatsAppDashboardCard />
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
