import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Calendar, Users, DollarSign, Bot, FileText,
  Rocket, MessageSquare, BarChart3, Brain, ArrowRight, Loader2, Target
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "hsl(258, 65%, 62%)", "hsl(200, 80%, 55%)", "hsl(152, 60%, 45%)",
  "hsl(38, 92%, 55%)", "hsl(0, 72%, 55%)", "hsl(280, 60%, 55%)",
];

const AnalyticsPage = () => {
  const { businessId } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    revenueThisMonth: 0, revenueLastMonth: 0,
    appointmentsThisMonth: 0,
    inactivePatients: 0,
    contactsBySource: [] as { source: string; count: number }[],
    contactsByStage: [] as { stage: string; count: number }[],
    monthlySales: [] as { month: string; total: number }[],
    dailyAppts: [] as { date: string; count: number }[],
    botMessages: 0, totalApptsMonth: 0, pipelineLeads: 0,
    postsMonth: 0, activeCampaigns: 0, salesTotal: 0,
    bestDay: "",
  });

  useEffect(() => {
    if (!businessId) return;
    const fetchAll = async () => {
      setLoading(true);
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      const [
        salesThisMonth, salesLastMonth, salesSixMonths,
        apptsThisMonth, apptsThirtyDays,
        contacts, patients, lastAppts,
        botMsgCount, postsMonth, activeCamps,
      ] = await Promise.all([
        supabase.from("sales").select("amount, discount, created_at").eq("clinic_id", businessId).gte("created_at", firstOfMonth),
        supabase.from("sales").select("amount, discount").eq("clinic_id", businessId).gte("created_at", firstOfLastMonth).lte("created_at", endOfLastMonth),
        supabase.from("sales").select("amount, discount, created_at").eq("clinic_id", businessId).gte("created_at", sixMonthsAgo),
        supabase.from("appointments").select("id, date, status").eq("clinic_id", businessId).gte("date", firstOfMonth.split("T")[0]),
        supabase.from("appointments").select("id, date").eq("clinic_id", businessId).gte("date", thirtyDaysAgo.split("T")[0]),
        supabase.from("contacts").select("source, funnel_stage").eq("clinic_id", businessId),
        supabase.from("patients").select("id").eq("clinic_id", businessId),
        supabase.from("appointments").select("patient_id, date").eq("clinic_id", businessId).order("date", { ascending: false }),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("clinic_id", businessId).eq("direction", "outbound").gte("created_at", firstOfMonth),
        supabase.from("content_posts").select("*", { count: "exact", head: true }).eq("clinic_id", businessId).gte("created_at", firstOfMonth),
        supabase.from("ads_campaigns").select("*", { count: "exact", head: true }).eq("clinic_id", businessId).eq("status", "active"),
      ]);

      // Revenue
      const calc = (rows: any[]) => rows.reduce((s, r) => s + Number(r.amount) - Number(r.discount || 0), 0);
      const revThis = calc(salesThisMonth.data || []);
      const revLast = calc(salesLastMonth.data || []);

      // Monthly sales for bar chart
      const monthMap: Record<string, number> = {};
      (salesSixMonths.data || []).forEach(s => {
        const m = s.created_at.slice(0, 7);
        monthMap[m] = (monthMap[m] || 0) + Number(s.amount) - Number(s.discount || 0);
      });
      const months = Object.entries(monthMap).sort().map(([month, total]) => ({
        month: new Date(month + "-01").toLocaleDateString("es", { month: "short" }),
        total: Math.round(total),
      }));

      // Daily appts for line chart
      const dayMap: Record<string, number> = {};
      (apptsThirtyDays.data || []).forEach(a => {
        dayMap[a.date] = (dayMap[a.date] || 0) + 1;
      });
      const dailyAppts = Object.entries(dayMap).sort().slice(-30).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("es", { day: "numeric", month: "short" }),
        count,
      }));

      // Best day
      const dayOfWeekMap: Record<string, number> = {};
      const completedAppts = (apptsThisMonth.data || []).filter(a => a.status === "completado");
      completedAppts.forEach(a => {
        const dow = new Date(a.date).toLocaleDateString("es", { weekday: "long" });
        dayOfWeekMap[dow] = (dayOfWeekMap[dow] || 0) + 1;
      });
      const bestDay = Object.entries(dayOfWeekMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      // Contacts by source
      const srcMap: Record<string, number> = {};
      (contacts.data || []).forEach(c => { srcMap[c.source || "Desconocido"] = (srcMap[c.source || "Desconocido"] || 0) + 1; });
      const contactsBySource = Object.entries(srcMap).map(([source, count]) => ({ source, count }));

      // Contacts by funnel stage
      const stageMap: Record<string, number> = {};
      (contacts.data || []).forEach(c => { stageMap[c.funnel_stage || "new"] = (stageMap[c.funnel_stage || "new"] || 0) + 1; });
      const contactsByStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

      // Inactive patients
      const latestApptByPatient: Record<string, string> = {};
      (lastAppts.data || []).forEach(a => {
        if (!latestApptByPatient[a.patient_id]) latestApptByPatient[a.patient_id] = a.date;
      });
      const inactivePatients = (patients.data || []).filter(p => {
        const last = latestApptByPatient[p.id];
        return !last || new Date(last).getTime() < new Date(twoMonthsAgo).getTime();
      }).length;

      // Pipeline leads
      const pipelineLeads = (contacts.data || []).filter(c => c.funnel_stage !== "converted" && c.funnel_stage !== "lost").length;

      // Top source
      const topSource = contactsBySource.sort((a, b) => b.count - a.count)[0];
      const topSourcePct = topSource && contacts.data?.length ? Math.round((topSource.count / contacts.data.length) * 100) : 0;

      setData({
        revenueThisMonth: revThis, revenueLastMonth: revLast,
        appointmentsThisMonth: apptsThisMonth.data?.length || 0,
        inactivePatients, contactsBySource, contactsByStage,
        monthlySales: months, dailyAppts,
        botMessages: botMsgCount.count || 0,
        totalApptsMonth: apptsThisMonth.data?.length || 0,
        pipelineLeads,
        postsMonth: postsMonth.count || 0,
        activeCampaigns: activeCamps.count || 0,
        salesTotal: revThis,
        bestDay,
        topSource: topSource?.source || "—",
        topSourcePct,
      });
      setLoading(false);
    };
    fetchAll();
  }, [businessId]);

  const revChange = data.revenueLastMonth > 0
    ? Math.round(((data.revenueThisMonth - data.revenueLastMonth) / data.revenueLastMonth) * 100)
    : 0;
  const revUp = revChange >= 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics Inteligente</h1>
            <p className="text-sm text-muted-foreground">Insights de la IA basados en datos reales de tu negocio</p>
          </div>
        </div>

        {/* ═══ SECTION 1: AI INSIGHTS ═══ */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Insights de la IA</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Revenue insight */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    📈 Tus ingresos de este mes son <strong>${data.revenueThisMonth.toLocaleString()}</strong>.{" "}
                    {data.revenueLastMonth > 0 ? (
                      revUp
                        ? <span className="text-emerald-400">Subieron {revChange}% vs el mes anterior 🎉</span>
                        : <span className="text-destructive">Bajaron {Math.abs(revChange)}% vs el mes anterior</span>
                    ) : "Es tu primer mes registrando ventas."}
                  </p>
                </div>
                {revUp ? <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" /> : <TrendingDown className="w-5 h-5 text-destructive shrink-0" />}
              </CardContent>
            </Card>

            {/* Best day */}
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-sm text-foreground">
                  📅 Tu día más productivo es el <strong className="capitalize">{data.bestDay}</strong> (basado en citas completadas este mes).
                </p>
              </CardContent>
            </Card>

            {/* Inactive patients */}
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    👥 Tienes <strong>{data.inactivePatients}</strong> pacientes inactivos (no vienen hace más de 2 meses). ¿Enviar campaña de reactivación?
                  </p>
                  {data.inactivePatients > 0 && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={() => navigate("/marketing")}>
                      Crear campaña <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top source */}
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    🚀 <strong>{data.topSourcePct}%</strong> de tus leads vienen de <strong>{data.topSource}</strong>. Sugerencia: enfoca tu inversión ahí.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={() => navigate("/ads")}>
                    Ver Ads <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ SECTION 2: CHARTS ═══ */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gráficos</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar: Revenue 6 months */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ingresos últimos 6 meses</CardTitle></CardHeader>
              <CardContent className="h-64">
                {data.monthlySales.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos de ventas aún</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 20% 25%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} />
                      <RechartsTooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 20% 25%)", borderRadius: "8px" }} />
                      <Bar dataKey="total" fill="hsl(258 65% 62%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Line: Appointments 30 days */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Citas últimos 30 días</CardTitle></CardHeader>
              <CardContent className="h-64">
                {data.dailyAppts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin citas registradas</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyAppts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 20% 25%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220 10% 50%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 20% 25%)", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(200 80% 55%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Donut: Leads by source */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Leads por origen</CardTitle></CardHeader>
              <CardContent className="h-64">
                {data.contactsBySource.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin leads registrados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.contactsBySource} dataKey="count" nameKey="source" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {data.contactsBySource.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend formatter={(v: string) => <span className="text-xs text-foreground">{v}</span>} />
                      <RechartsTooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 20% 25%)", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Funnel: Pipeline */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline de conversión</CardTitle></CardHeader>
              <CardContent className="h-64">
                {data.contactsByStage.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos de pipeline</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.contactsByStage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 20% 25%)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: "hsl(220 10% 50%)" }} width={100} />
                      <RechartsTooltip contentStyle={{ background: "hsl(230 20% 12%)", border: "1px solid hsl(230 20% 25%)", borderRadius: "8px" }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.contactsByStage.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ SECTION 3: AUTOPILOT PERFORMANCE ═══ */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rendimiento de Autopilotos</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Bot, label: "🤖 Mensajes", value: `${data.botMessages} respondidos`, desc: "este mes", route: "/mensajes" },
              { icon: Calendar, label: "📅 Agenda", value: `${data.totalApptsMonth} citas`, desc: "este mes", route: "/agenda" },
              { icon: Users, label: "📊 CRM", value: `${data.pipelineLeads} leads`, desc: "en pipeline", route: "/crm" },
              { icon: FileText, label: "📱 Marketing", value: `${data.postsMonth} posts`, desc: "creados este mes", route: "/marketing" },
              { icon: Rocket, label: "🚀 Ads", value: `${data.activeCampaigns} campañas`, desc: "activas", route: "/ads" },
              { icon: DollarSign, label: "💰 Ventas", value: `$${data.salesTotal.toLocaleString()}`, desc: "total del mes", route: "/ventas" },
            ].map((ap, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(ap.route)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <ap.icon className="w-3.5 h-3.5" /> {ap.label}
                  </div>
                  <p className="text-lg font-bold text-foreground">{ap.value}</p>
                  <p className="text-[10px] text-muted-foreground">{ap.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyticsPage;
