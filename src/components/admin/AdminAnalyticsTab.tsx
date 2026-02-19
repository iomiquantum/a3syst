import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, Clock, Globe, Monitor, Smartphone, ExternalLink, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";

interface PageVisit {
  id: string;
  page_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  user_agent: string;
  screen_width: number;
  screen_height: number;
  session_id: string;
  duration_seconds: number;
  created_at: string;
}

const COLORS = ["hsl(215,70%,50%)", "hsl(160,55%,42%)", "hsl(38,92%,55%)", "hsl(0,72%,51%)", "hsl(280,60%,50%)", "hsl(190,70%,50%)"];

const AdminAnalyticsTab = () => {
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  const fetchVisits = async () => {
    setLoading(true);
    const cutoff = subDays(new Date(), parseInt(period)).toISOString();
    const { data, error } = await supabase
      .from("page_visits")
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });
    if (!error) setVisits((data || []) as PageVisit[]);
    setLoading(false);
  };

  useEffect(() => { fetchVisits(); }, [period]);

  const uniqueSessions = useMemo(() => new Set(visits.map(v => v.session_id)).size, [visits]);
  const avgDuration = useMemo(() => {
    const withDuration = visits.filter(v => v.duration_seconds > 0);
    if (!withDuration.length) return 0;
    return Math.round(withDuration.reduce((a, v) => a + v.duration_seconds, 0) / withDuration.length);
  }, [visits]);

  const dailyVisits = useMemo(() => {
    const days = parseInt(period);
    const data: { date: string; visitas: number; sesiones: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      const dayVisits = visits.filter(v => format(new Date(v.created_at), "yyyy-MM-dd") === key);
      const daySessions = new Set(dayVisits.map(v => v.session_id)).size;
      data.push({ date: format(d, "dd MMM", { locale: es }), visitas: dayVisits.length, sesiones: daySessions });
    }
    return data;
  }, [visits, period]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.forEach(v => {
      const src = v.utm_source || (v.referrer ? new URL(v.referrer).hostname : "directo");
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [visits]);

  const campaignData = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.filter(v => v.utm_campaign).forEach(v => {
      counts[v.utm_campaign!] = (counts[v.utm_campaign!] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [visits]);

  const deviceData = useMemo(() => {
    let mobile = 0, desktop = 0, tablet = 0;
    visits.forEach(v => {
      if (v.screen_width <= 768) mobile++;
      else if (v.screen_width <= 1024) tablet++;
      else desktop++;
    });
    return [
      { name: "Escritorio", value: desktop },
      { name: "Móvil", value: mobile },
      { name: "Tablet", value: tablet },
    ].filter(d => d.value > 0);
  }, [visits]);

  const topPages = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.forEach(v => { counts[v.page_path] = (counts[v.page_path] || 0) + 1; });
    return Object.entries(counts).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [visits]);

  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Analítica de Visitantes</h2>
          <p className="text-sm text-muted-foreground">Tráfico, campañas y comportamiento de usuarios</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoy</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchVisits} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Visitas totales", value: visits.length, icon: Eye, color: "text-primary", bg: "bg-primary/10" },
          { label: "Sesiones únicas", value: uniqueSessions, icon: Users, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Tiempo promedio", value: formatDuration(avgDuration), icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Páginas vistas/sesión", value: uniqueSessions > 0 ? (visits.length / uniqueSessions).toFixed(1) : "0", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-500/10" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily visits chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4">Visitas diarias</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyVisits}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="visitas" stroke="hsl(215,70%,50%)" fill="hsl(215,70%,50%,0.1)" name="Visitas" />
                    <Area type="monotone" dataKey="sesiones" stroke="hsl(160,55%,42%)" fill="hsl(160,55%,42%,0.1)" name="Sesiones" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device distribution */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Dispositivos</h3>
            {deviceData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              {deviceData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources & Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traffic sources */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Fuentes de tráfico</h3>
            {sourceData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="value" fill="hsl(215,70%,50%)" radius={[0, 4, 4, 0]} name="Visitas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Campañas (UTM)</h3>
            {campaignData.length === 0 ? (
              <div className="text-center py-6">
                <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Sin campañas detectadas</p>
                <p className="text-xs text-muted-foreground mt-1">Usa parámetros UTM en tus links de pauta</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaignData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <Badge variant="secondary">{c.value} visitas</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Páginas más visitadas</h3>
          <div className="space-y-2">
            {topPages.map((p, i) => (
              <div key={p.path} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <span className="text-sm font-medium">{p.path}</span>
                </div>
                <Badge variant="outline">{p.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clarity info */}
      <Card className="border-dashed">
        <CardContent className="p-5 text-center">
          <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
          <h3 className="text-sm font-semibold mb-1">Mapa de calor y grabaciones</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Para ver mapas de calor, grabaciones de sesión y scroll depth, accede a Microsoft Clarity.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.open('https://clarity.microsoft.com/', '_blank')}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Abrir Microsoft Clarity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsTab;
