import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { TrendingUp, Heart, MessageCircle, Share2, Eye, Users, ArrowUpRight, ArrowDownRight, Facebook, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, subDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import type { ContentPost } from "@/hooks/useContentPosts";

interface Props {
  content: {
    published: ContentPost[];
    posts: ContentPost[];
  };
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

const ContentAnalyticsView = ({ content }: Props) => {
  const [period, setPeriod] = useState("30");
  const published = content.published;

  const filteredPosts = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(period));
    return published.filter(p => p.published_at && isAfter(new Date(p.published_at), cutoff));
  }, [published, period]);

  const totals = useMemo(() => {
    return filteredPosts.reduce(
      (acc, p) => {
        const m = p.metrics || { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
        acc.likes += m.likes;
        acc.comments += m.comments;
        acc.shares += m.shares;
        acc.reach += m.reach;
        acc.impressions += m.impressions;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 }
    );
  }, [filteredPosts]);

  const engagementRate = totals.impressions > 0
    ? (((totals.likes + totals.comments + totals.shares) / totals.impressions) * 100).toFixed(2)
    : "0.00";

  // Daily engagement chart
  const dailyData = useMemo(() => {
    const days = parseInt(period);
    const data: { date: string; likes: number; comments: number; shares: number; reach: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      const dayPosts = filteredPosts.filter(p => p.published_at && format(new Date(p.published_at), "yyyy-MM-dd") === key);
      const agg = dayPosts.reduce(
        (a, p) => {
          const m = p.metrics || { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
          a.likes += m.likes; a.comments += m.comments; a.shares += m.shares; a.reach += m.reach;
          return a;
        },
        { likes: 0, comments: 0, shares: 0, reach: 0 }
      );
      data.push({ date: format(d, "dd MMM", { locale: es }), ...agg });
    }
    return data;
  }, [filteredPosts, period]);

  // Platform distribution
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPosts.forEach(p => {
      (p.platforms || []).forEach(pl => {
        counts[pl] = (counts[pl] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredPosts]);

  // Post type distribution
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPosts.forEach(p => { counts[p.post_type] = (counts[p.post_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name === "post" ? "Publicación" : name === "reel" ? "Reel" : "Historia", value }));
  }, [filteredPosts]);

  // Top posts by engagement
  const topPosts = useMemo(() => {
    return [...filteredPosts]
      .sort((a, b) => {
        const aE = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0);
        const bE = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0);
        return bE - aE;
      })
      .slice(0, 5);
  }, [filteredPosts]);

  const kpis = [
    { label: "Alcance total", value: totals.reach.toLocaleString(), icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Impresiones", value: totals.impressions.toLocaleString(), icon: Eye, color: "text-[hsl(var(--info))]", bg: "bg-[hsl(var(--info)/0.1)]" },
    { label: "Me gusta", value: totals.likes.toLocaleString(), icon: Heart, color: "text-[hsl(var(--destructive))]", bg: "bg-destructive/10" },
    { label: "Comentarios", value: totals.comments.toLocaleString(), icon: MessageCircle, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success)/0.1)]" },
    { label: "Compartidos", value: totals.shares.toLocaleString(), icon: Share2, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning)/0.1)]" },
    { label: "Engagement", value: `${engagementRate}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Analíticas</h2>
          <p className="text-sm text-muted-foreground">Métricas de engagement y rendimiento de tus publicaciones</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="14">Últimos 14 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Engagement over time */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Engagement diario</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="reach" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" name="Alcance" />
                <Area type="monotone" dataKey="likes" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.1)" name="Likes" />
                <Area type="monotone" dataKey="comments" stackId="3" stroke="hsl(var(--success))" fill="hsl(var(--success)/0.1)" name="Comentarios" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform distribution */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Por plataforma</h3>
          {platformData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {platformData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Type breakdown */}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Por tipo</h4>
            {typeData.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-foreground">{t.name}</span>
                </div>
                <span className="font-semibold text-foreground">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top publicaciones por engagement</h3>
        {topPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aún no hay publicaciones con métricas</p>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post, i) => {
              const m = post.metrics || { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
              const totalEng = m.likes + m.comments + m.shares;
              return (
                <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                  {post.media_urls?.[0] ? (
                    <img src={post.media_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title || post.body?.slice(0, 60) || "Sin título"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {post.platforms?.map(p => (
                        <span key={p} className="text-muted-foreground">
                          {p === "facebook" ? <Facebook className="w-3.5 h-3.5" /> : p === "instagram" ? <Instagram className="w-3.5 h-3.5" /> : <span className="text-[10px]">{p}</span>}
                        </span>
                      ))}
                      {post.published_at && (
                        <span className="text-[10px] text-muted-foreground">{format(new Date(post.published_at), "dd MMM yyyy", { locale: es })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{m.likes}</p>
                      <p className="text-muted-foreground">Likes</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{m.comments}</p>
                      <p className="text-muted-foreground">Coment.</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{m.shares}</p>
                      <p className="text-muted-foreground">Comp.</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{m.reach.toLocaleString()}</p>
                      <p className="text-muted-foreground">Alcance</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAnalyticsView;
