import { useState, useMemo } from "react";
import { Zap, Settings2, Dna, Rocket, Loader2, Pause, Play, Eye, Trophy, FlaskConical, AlertTriangle, DollarSign, Users, TrendingUp, BarChart3, ChevronDown, ChevronUp, Plus, ArrowRight, Calendar, Target, Megaphone, Coffee, Sparkles, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AdsConfigTab from "@/components/ads/AdsConfigTab";
import AdsADNTab from "@/components/ads/AdsADNTab";
import AdsStrategiesTab from "@/components/ads/AdsStrategiesTab";
import AdsActiveStrategiesTab from "@/components/ads/AdsActiveStrategiesTab";
import { cn } from "@/lib/utils";
import { useAds } from "@/hooks/useAds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

type AdsSection = "quantum" | "config" | "adn" | "estrategias" | "lanzadas";

const sideNav = [
  { key: "quantum" as AdsSection, icon: Rocket, label: "Motor Cuántico", group: "Centro de Control" },
  { key: "config" as AdsSection, icon: Settings2, label: "Configuración", group: "Centro de Marca" },
  { key: "adn" as AdsSection, icon: Dna, label: "ADN", group: "Centro de Marca" },
  { key: "estrategias" as AdsSection, icon: Zap, label: "Estrategias de Pauta", group: "Centro de Estrategias" },
  { key: "lanzadas" as AdsSection, icon: Rocket, label: "Estrategias Lanzadas", group: "Centro de Estrategias" },
];

const objectives = [
  { key: "appointments", icon: Calendar, emoji: "📅", title: "Más citas", desc: "Quiero que la gente agende citas en mi negocio" },
  { key: "leads", icon: Target, emoji: "📱", title: "Más leads", desc: "Quiero que la gente me contacte por WhatsApp" },
  { key: "awareness", icon: Megaphone, emoji: "👥", title: "Más visibilidad", desc: "Quiero que más gente conozca mi negocio" },
];

const budgetOptions = [
  { key: "starter", daily: 2, monthly: 60, emoji: "☕", label: "Emprendedor", desc: "Por el precio de un café diario" },
  { key: "growth", daily: 5, monthly: 150, emoji: "🚀", label: "Crecimiento", desc: "3x más alcance" },
  { key: "turbo", daily: 10, monthly: 300, emoji: "⚡", label: "Acelerado", desc: "Máximo impacto" },
];

const strategyNames = [
  { name: "Prueba Social", persuasion: "Social proof + testimonios" },
  { name: "Escasez Urgente", persuasion: "FOMO + urgencia temporal" },
  { name: "Aspiracional", persuasion: "Transformación + futuro ideal" },
];

const AdsPage = () => {
  const [section, setSection] = useState<AdsSection>("quantum");
  const ads = useAds();
  const groups = ["Centro de Control", "Centro de Marca", "Centro de Estrategias"];

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizObjective, setWizObjective] = useState("");
  const [wizBudget, setWizBudget] = useState<number>(5);
  const [wizBudgetKey, setWizBudgetKey] = useState("growth");
  const [wizCustomBudget, setWizCustomBudget] = useState("");
  const [launching, setLaunching] = useState(false);

  // Business brief state
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefName, setBriefName] = useState("");
  const [briefIdeal, setBriefIdeal] = useState("");
  const [briefDiff, setBriefDiff] = useState("");
  const [briefGoal, setBriefGoal] = useState("leads");

  // Campaign detail
  const [detailCampaign, setDetailCampaign] = useState<typeof ads.campaigns[0] | null>(null);

  // History
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeCampaigns = useMemo(() => ads.campaigns.filter(c => c.status === "active"), [ads.campaigns]);
  const hasBrief = ads.briefs.length > 0;
  const dailyBudgetActive = activeCampaigns.reduce((s, c) => s + Number(c.daily_budget), 0);
  const m = ads.totalMetrics;

  // Determine "winner" — lowest cost per lead or highest conversions
  const bestCampaign = useMemo(() => {
    if (activeCampaigns.length === 0) return null;
    return activeCampaigns.reduce((best, c) => {
      const bConv = best.metrics?.conversions || 0;
      const cConv = c.metrics?.conversions || 0;
      return cConv > bConv ? c : best;
    }, activeCampaigns[0]);
  }, [activeCampaigns]);

  const getCampaignStatus = (c: typeof ads.campaigns[0]) => {
    if (c.status === "paused") return { color: "bg-muted", glow: "", badge: "⏸️ Pausada", barColor: "bg-muted-foreground/30" };
    if (bestCampaign && c.id === bestCampaign.id && (c.metrics?.conversions || 0) > 0)
      return { color: "bg-emerald-500", glow: "shadow-[0_0_20px_hsl(142,70%,45%,0.3)]", badge: "🏆 GANADORA", barColor: "bg-emerald-500" };
    if ((c.metrics?.conversions || 0) === 0 && (c.metrics?.spend || 0) < 5)
      return { color: "bg-yellow-500", glow: "animate-pulse", badge: "🧪 PROBANDO", barColor: "bg-yellow-500" };
    if ((c.metrics?.conversions || 0) === 0 && (c.metrics?.spend || 0) >= 5)
      return { color: "bg-destructive", glow: "", badge: "⚠️ Bajo rendimiento", barColor: "bg-destructive" };
    return { color: "bg-primary", glow: "", badge: "🧪 PROBANDO", barColor: "bg-primary" };
  };

  const handleLaunch = async () => {
    if (!hasBrief) { setBriefOpen(true); return; }
    setLaunching(true);
    const perCampaign = +(wizBudget / 3).toFixed(2);
    for (let i = 0; i < 3; i++) {
      await ads.createCampaign({
        name: `Campaña ${String.fromCharCode(65 + i)} — ${strategyNames[i].name}`,
        platform: "meta",
        status: "active",
        daily_budget: perCampaign,
        currency: "USD",
        creatives_count: 3,
      });
    }
    setLaunching(false);
    setWizardOpen(false);
    setWizardStep(1);
    toast.success("🚀 Motor Cuántico lanzado — 3 campañas en paralelo");
  };

  const handleSaveBrief = async () => {
    await ads.saveBrief({
      name: briefName || "Mi Brief",
      business_name: briefName,
      description: briefDiff,
      answers: [briefIdeal, briefDiff, briefGoal] as any,
    });
    setBriefOpen(false);
    toast.success("Brief guardado. ¡Ahora puedes lanzar campañas!");
  };

  const togglePause = async (c: typeof ads.campaigns[0]) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    await ads.updateCampaign(c.id, { status: newStatus });
    toast.success(newStatus === "active" ? "▶️ Campaña reactivada" : "⏸️ Campaña pausada");
  };

  if (ads.loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-0 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-border pr-4 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">ADS</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Motor Cuántico</p>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{group}</p>
              {sideNav.filter(n => n.group === group).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-all duration-200",
                    section === key
                      ? "gradient-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Accounts summary */}
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Cuentas</p>
            <div className="space-y-1.5 px-2">
              {["meta", "google", "tiktok"].map(p => {
                const acc = ads.accounts.find(a => a.platform === p);
                const label = p === "meta" ? "Meta Ads" : p === "google" ? "Google Ads" : "TikTok Ads";
                return (
                  <div key={p} className="flex items-center gap-2 text-xs">
                    <div className={cn("w-2 h-2 rounded-full", acc?.status === "connected" ? "bg-[hsl(var(--success))]" : "bg-muted-foreground/30")} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto pl-6">
          {section === "config" && <AdsConfigTab ads={ads} />}
          {section === "adn" && <AdsADNTab ads={ads} />}
          {section === "estrategias" && <AdsStrategiesTab ads={ads} />}
          {section === "lanzadas" && <AdsActiveStrategiesTab ads={ads} />}

          {section === "quantum" && (
            <div className="space-y-6 max-w-5xl">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                    <Rocket className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground tracking-tight">🚀 Motor Cuántico de Ads</h2>
                    <p className="text-sm text-muted-foreground">Múltiples campañas en paralelo. La IA encuentra la ganadora.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeCampaigns.length > 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      🟢 Motor activo — {activeCampaigns.length} campañas corriendo
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">⚪ Sin campañas activas</Badge>
                  )}
                  {dailyBudgetActive > 0 && (
                    <Badge variant="secondary" className="text-xs">${dailyBudgetActive.toFixed(2)}/día</Badge>
                  )}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: DollarSign, label: "Gasto del mes", value: `$${m.spend.toFixed(0)}`, gradient: "from-primary/10 to-primary/5" },
                  { icon: Users, label: "Leads generados", value: `${m.conversions}`, gradient: "from-emerald-500/10 to-emerald-500/5" },
                  { icon: TrendingUp, label: "Costo por lead", value: m.conversions > 0 ? `$${(m.spend / m.conversions).toFixed(2)}` : "—", gradient: "from-violet-500/10 to-violet-500/5" },
                  { icon: Trophy, label: "Mejor campaña", value: bestCampaign?.name?.split("—")[0]?.trim() || "—", gradient: "from-amber-500/10 to-amber-500/5" },
                ].map((kpi, i) => (
                  <Card key={i} className={cn("bg-gradient-to-br border-border/50", kpi.gradient)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><kpi.icon className="w-3.5 h-3.5" /> {kpi.label}</div>
                      <p className="text-xl font-bold text-foreground truncate">{kpi.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* PARALLEL UNIVERSES — Race Lanes */}
              {ads.campaigns.length > 0 ? (
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Universos Paralelos</p>
                      <Badge variant="outline" className="text-[10px]">{ads.campaigns.length} campañas</Badge>
                    </div>
                    <div className="divide-y divide-border/30">
                      {ads.campaigns.map(c => {
                        const st = getCampaignStatus(c);
                        const maxConv = Math.max(...ads.campaigns.map(x => x.metrics?.conversions || 0), 1);
                        const progressVal = ((c.metrics?.conversions || 0) / maxConv) * 100 || (c.status === "active" ? 10 : 0);
                        return (
                          <div key={c.id} className={cn("px-5 py-4 flex items-center gap-4 transition-all", st.glow)}>
                            {/* Status dot */}
                            <div className={cn("w-3 h-3 rounded-full shrink-0", st.color)} />
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                                <Badge variant="outline" className="text-[9px] shrink-0">{c.platform === "meta" ? "Meta" : c.platform}</Badge>
                                <Badge variant="outline" className={cn("text-[9px] shrink-0", st.badge.includes("GANADORA") ? "border-emerald-500/30 text-emerald-400" : "")}>{st.badge}</Badge>
                              </div>
                              {/* Race bar */}
                              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-1000", st.barColor)} style={{ width: `${progressVal}%` }} />
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                                <span>${Number(c.daily_budget).toFixed(2)}/día</span>
                                <span>{c.metrics?.conversions || 0} leads</span>
                                <span>{(c.metrics?.reach || 0).toLocaleString()} alcance</span>
                                {(c.metrics?.conversions || 0) > 0 && (c.metrics?.spend || 0) > 0 && (
                                  <span>${((c.metrics?.spend || 0) / (c.metrics?.conversions || 1)).toFixed(2)}/lead</span>
                                )}
                                {(c.metrics?.conversions || 0) === 0 && <span className="italic">Recopilando datos...</span>}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePause(c)}>
                                {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailCampaign(c)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Empty state */
                <Card className="border-dashed border-2 border-primary/20">
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
                      <Rocket className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Tu Motor Cuántico está listo para arrancar</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      Crea tu primera campaña con 3 clicks y la IA encontrará la mejor estrategia por ti.
                    </p>
                    <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg gap-2 text-base h-12 px-8"
                      onClick={() => { if (!hasBrief) { setBriefOpen(true); } else { setWizardOpen(true); setWizardStep(1); } }}>
                      <Rocket className="w-5 h-5" /> Lanzar primer Motor Cuántico
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Suggestions */}
              {ads.campaigns.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sugerencias de la IA</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bestCampaign && (bestCampaign.metrics?.conversions || 0) > 0 && (
                      <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className="p-4 flex items-start gap-3">
                          <Trophy className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-foreground">La campaña <strong>{bestCampaign.name.split("—")[0]}</strong> tiene el mejor rendimiento. ¿Duplicar presupuesto y pausar las demás?</p>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">✅ Optimizar</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs">⏰ Esperar</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {ads.campaigns.some(c => c.status === "active" && (c.metrics?.conversions || 0) === 0 && (c.metrics?.spend || 0) >= 5) && (
                      <Card className="border-destructive/20 bg-destructive/5">
                        <CardContent className="p-4 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-foreground">Una campaña no genera resultados. ¿Pausar y redistribuir presupuesto?</p>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="destructive" className="h-7 text-xs">✅ Pausar</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs">⏰ Darle más tiempo</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4 flex items-start gap-3">
                        <FlaskConical className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">¿Lanzar nueva variante basada en la ganadora con diferente imagen?</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs">✅ Crear variante</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs">❌ No</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Launch button when campaigns exist */}
              {ads.campaigns.length > 0 && (
                <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg gap-2"
                  onClick={() => { if (!hasBrief) { setBriefOpen(true); } else { setWizardOpen(true); setWizardStep(1); } }}>
                  <Plus className="w-4 h-4" /> 🚀 Lanzar Motor Cuántico
                </Button>
              )}

              {/* History */}
              {ads.campaigns.length > 0 && (
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between text-muted-foreground text-sm">
                      Historial de optimizaciones
                      {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-l-2 border-primary/20 pl-4 space-y-3 py-3">
                      {ads.campaigns.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((c, i) => (
                        <div key={c.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <p className="text-xs text-foreground">{c.name} — status: {c.status}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("es")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ BUSINESS BRIEF DIALOG ═══ */}
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Dna className="w-5 h-5 text-primary" /> Conoce tu negocio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Para crear campañas increíbles, necesito conocer tu negocio:</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del negocio</Label>
              <Input value={briefName} onChange={e => setBriefName(e.target.value)} placeholder="Mi Negocio" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">¿Quién es tu cliente ideal?</Label>
              <Textarea value={briefIdeal} onChange={e => setBriefIdeal(e.target.value)} placeholder="Mujeres 25-45 que buscan..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">¿Qué te hace diferente?</Label>
              <Textarea value={briefDiff} onChange={e => setBriefDiff(e.target.value)} placeholder="Somos los únicos que..." rows={3} />
            </div>
            <Button onClick={handleSaveBrief} className="w-full gradient-primary text-primary-foreground">Guardar y continuar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ 3-CLICK WIZARD ═══ */}
      <Dialog open={wizardOpen} onOpenChange={o => { if (!o) { setWizardOpen(false); setWizardStep(1); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Lanzar Motor Cuántico — Paso {wizardStep}/3
            </DialogTitle>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">¿Cuál es tu objetivo?</p>
              <div className="space-y-2">
                {objectives.map(o => (
                  <Card key={o.key}
                    className={cn("cursor-pointer hover:border-primary/40 transition-all",
                      wizObjective === o.key && "border-primary ring-1 ring-primary/20")}
                    onClick={() => setWizObjective(o.key)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="text-2xl">{o.emoji}</span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{o.title}</p>
                        <p className="text-xs text-muted-foreground">{o.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full" onClick={() => setWizardStep(2)} disabled={!wizObjective}>Siguiente</Button>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">¿Cuánto quieres invertir?</p>
              <div className="space-y-2">
                {budgetOptions.map(b => (
                  <Card key={b.key}
                    className={cn("cursor-pointer hover:border-primary/40 transition-all",
                      wizBudgetKey === b.key && "border-primary ring-1 ring-primary/20")}
                    onClick={() => { setWizBudgetKey(b.key); setWizBudget(b.daily); }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="text-2xl">{b.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">${b.daily}/día <span className="text-muted-foreground font-normal text-xs">(${b.monthly}/mes)</span></p>
                        <p className="text-xs text-muted-foreground">{b.label} — {b.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card
                  className={cn("cursor-pointer hover:border-primary/40 transition-all",
                    wizBudgetKey === "custom" && "border-primary ring-1 ring-primary/20")}
                  onClick={() => setWizBudgetKey("custom")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-2xl">🎯</span>
                    <div className="flex-1 flex items-center gap-3">
                      <p className="font-semibold text-foreground text-sm">Personalizado</p>
                      {wizBudgetKey === "custom" && (
                        <Input type="number" value={wizCustomBudget} onChange={e => { setWizCustomBudget(e.target.value); setWizBudget(Number(e.target.value) || 5); }}
                          placeholder="$/día" className="w-24 h-8 text-xs" autoFocus />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Estimación: con ${wizBudget}/día alcanzarás ~{Math.round(wizBudget * 150).toLocaleString()} personas por semana
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={() => setWizardStep(3)} className="flex-1">Siguiente</Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Voy a crear 3 campañas en paralelo para encontrar la mejor estrategia:</p>
              <div className="space-y-2">
                {strategyNames.map((s, i) => (
                  <Card key={i} className="border-primary/10">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Campaña {String.fromCharCode(65 + i)}: {s.name}</p>
                        <p className="text-[10px] text-muted-foreground">Enfoque: {s.persuasion}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
                <p>💰 Presupuesto: <strong className="text-foreground">${wizBudget}/día</strong> dividido entre las 3 campañas</p>
                <p>⏱️ En 5-7 días detectaré la ganadora y optimizaré automáticamente</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={handleLaunch} disabled={launching} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {launching ? "Lanzando..." : "🚀 ¡Lanzar Motor Cuántico!"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ CAMPAIGN DETAIL ═══ */}
      <Dialog open={!!detailCampaign} onOpenChange={o => { if (!o) setDetailCampaign(null); }}>
        <DialogContent className="max-w-md">
          {detailCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{detailCampaign.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs block">Plataforma</span><span className="font-medium">{detailCampaign.platform === "meta" ? "Meta (FB + IG)" : detailCampaign.platform}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Status</span><Badge variant="outline" className="text-xs">{detailCampaign.status}</Badge></div>
                  <div><span className="text-muted-foreground text-xs block">Presupuesto</span><span className="font-medium">${Number(detailCampaign.daily_budget).toFixed(2)}/día</span></div>
                  <div><span className="text-muted-foreground text-xs block">Creativos</span><span className="font-medium">{detailCampaign.creatives_count}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Gasto</span><span className="font-medium">${(detailCampaign.metrics?.spend || 0).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Leads</span><span className="font-medium">{detailCampaign.metrics?.conversions || 0}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Alcance</span><span className="font-medium">{(detailCampaign.metrics?.reach || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Creada</span><span className="font-medium">{new Date(detailCampaign.created_at).toLocaleDateString("es")}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => { togglePause(detailCampaign); setDetailCampaign(null); }}>
                    {detailCampaign.status === "active" ? "⏸️ Pausar" : "▶️ Reactivar"}
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs h-9">💰 Aumentar presupuesto</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdsPage;
