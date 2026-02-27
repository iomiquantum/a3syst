import { useState, useMemo } from "react";
import { Megaphone, Bot, CheckCircle2, Pencil, RefreshCw, Trash2, Sparkles, Instagram, Facebook, Clock, Eye, Plus, Filter, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useContentPosts, type ContentPost } from "@/hooks/useContentPosts";
import { useNavigate } from "react-router-dom";
import MarketingKPIs from "@/components/marketing/MarketingKPIs";
import DifusionesTab from "@/components/marketing/DifusionesTab";
import AudienciasTab from "@/components/marketing/AudienciasTab";
import MarketingContactsTab from "@/components/marketing/MarketingContactsTab";
import TokenAPIsTab from "@/components/marketing/TokenAPIsTab";

const platformIcon = (p: string) => {
  switch (p?.toLowerCase()) {
    case "instagram": return <Instagram className="w-3.5 h-3.5" />;
    case "facebook": return <Facebook className="w-3.5 h-3.5" />;
    case "tiktok": return <span className="text-xs font-bold">TT</span>;
    case "linkedin": return <span className="text-xs font-bold">in</span>;
    default: return <Megaphone className="w-3.5 h-3.5" />;
  }
};

const statusCfg: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-500" },
  scheduled: { label: "Programado", color: "bg-blue-500/10 text-blue-400" },
  published: { label: "Publicado", color: "bg-emerald-500/10 text-emerald-400" },
};

const contentTypes = [
  { value: "promo", label: "📢 Promoción de servicio" },
  { value: "tip", label: "💡 Tip educativo" },
  { value: "testimonial", label: "⭐ Testimonio" },
  { value: "motivational", label: "💪 Post motivacional" },
  { value: "special", label: "🎉 Fecha especial" },
  { value: "psycho", label: "🧠 Basado en Psycho-Matrix" },
];

const MarketingPage = () => {
  const { posts, loading, drafts, scheduled, published, updatePost, deletePost, createPost } = useContentPosts();
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ platform: "Instagram", contentType: "", description: "", generatedText: "", hashtags: "", recommendedTime: "" });
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [editBody, setEditBody] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [generating, setGenerating] = useState(false);

  const pendingApproval = useMemo(() =>
    posts.filter(p => p.status === "draft" || p.status === "pending"),
    [posts]
  );

  const weekPosts = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return posts.filter(p => new Date(p.created_at) >= weekAgo);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let f = posts;
    if (filterPlatform !== "all") f = f.filter(p => (p.platforms || []).some(pl => pl.toLowerCase() === filterPlatform));
    if (filterStatus !== "all") f = f.filter(p => p.status === filterStatus);
    return f;
  }, [posts, filterPlatform, filterStatus]);

  const handleApprove = async (post: ContentPost) => {
    await updatePost(post.id, { status: "scheduled" });
    toast.success("✅ Post aprobado y programado");
  };

  const handleDiscard = async (id: string) => {
    await deletePost(id);
  };

  const handleEditSave = async () => {
    if (!editingPost) return;
    await updatePost(editingPost.id, { body: editBody });
    setEditingPost(null);
    toast.success("Post actualizado");
  };

  const handleWizardGenerate = async () => {
    setGenerating(true);
    // Simulate AI generation (in production this would call the edge function)
    await new Promise(r => setTimeout(r, 1500));
    const typeLabel = contentTypes.find(c => c.value === wizardData.contentType)?.label || "Post";
    setWizardData(prev => ({
      ...prev,
      generatedText: `✨ ${typeLabel} para ${prev.platform}\n\n${prev.description}\n\nTransforma tu bienestar con nuestros servicios especializados. Agenda tu cita hoy y descubre la diferencia.\n\n🔗 Link en bio`,
      hashtags: "#salud #bienestar #transformacion #cuidadopersonal",
      recommendedTime: "Martes 10:00 AM",
    }));
    setGenerating(false);
    setWizardStep(4);
  };

  const handleWizardSave = async (status: "draft" | "scheduled") => {
    await createPost({
      title: wizardData.description.slice(0, 60),
      body: wizardData.generatedText,
      platforms: [wizardData.platform.toLowerCase()],
      hashtags: wizardData.hashtags.split(" ").filter(Boolean),
      status,
      ai_generated: true,
      ai_prompt: wizardData.description,
    });
    setWizardOpen(false);
    setWizardStep(1);
    setWizardData({ platform: "Instagram", contentType: "", description: "", generatedText: "", hashtags: "", recommendedTime: "" });
    toast.success(status === "scheduled" ? "✅ Post aprobado y programado" : "💾 Borrador guardado");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Marketing</h1>
              <p className="text-sm text-muted-foreground">Gestiona campañas, contenido y audiencias</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              📱 Autopilot de Marketing: Activo
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Esta semana: <strong className="text-foreground">{weekPosts.length}</strong> posts</span>
              <span>|</span>
              <span>Pendientes: <strong className="text-foreground">{pendingApproval.length}</strong></span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="autopilot" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="autopilot">🤖 Autopilot</TabsTrigger>
            <TabsTrigger value="indices">Índices</TabsTrigger>
            <TabsTrigger value="difusiones">Difusiones</TabsTrigger>
            <TabsTrigger value="audiencias">Audiencias</TabsTrigger>
            <TabsTrigger value="contactos">Contactos</TabsTrigger>
            <TabsTrigger value="tokens">Token APIs</TabsTrigger>
          </TabsList>

          {/* ═══ AUTOPILOT TAB ═══ */}
          <TabsContent value="autopilot" className="space-y-6">
            {/* SECTION 1: Pending Approval */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Contenido pendiente de aprobación ({pendingApproval.length})
              </h2>
              {loading ? (
                <div className="flex gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-72 shrink-0" />)}
                </div>
              ) : pendingApproval.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Todo aprobado. No hay posts pendientes.</p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-3">
                    {pendingApproval.map(post => (
                      <Card key={post.id} className="w-72 shrink-0 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {(post.platforms || []).map(p => (
                                <span key={p} className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                                  {platformIcon(p)}
                                </span>
                              ))}
                            </div>
                            {post.ai_generated && (
                              <Badge variant="secondary" className="text-[9px]">🤖 IA</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-4 leading-relaxed">
                            {post.body || post.title || "Sin contenido"}
                          </p>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <p className="text-xs text-primary truncate">{post.hashtags.join(" ")}</p>
                          )}
                          <div className="flex gap-1.5 pt-1">
                            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" onClick={() => handleApprove(post)}>
                              ✅ Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditingPost(post); setEditBody(post.body || ""); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => navigate("/contenido")}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDiscard(post.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>

            {/* SECTION 2: Create Content with AI */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Generar contenido con IA</h3>
                    <p className="text-sm text-muted-foreground">Crea posts profesionales en 30 segundos</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setWizardOpen(true); setWizardStep(1); }} className="gradient-primary text-primary-foreground gap-2">
                    <Sparkles className="w-4 h-4" /> ✨ Generar contenido con IA
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/contenido")} className="gap-2">
                    Generador avanzado <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3: All Posts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Todos los posts ({filteredPosts.length})
                </h2>
                <div className="flex items-center gap-2">
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="scheduled">Programado</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
                </div>
              ) : filteredPosts.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary opacity-40" />
                    <p className="text-foreground font-medium">Aún no tienes contenido</p>
                    <p className="text-sm text-muted-foreground mt-1">Genera tu primer post con IA en 30 segundos ✨</p>
                    <Button onClick={() => { setWizardOpen(true); setWizardStep(1); }} className="mt-4 gradient-primary text-primary-foreground gap-2">
                      <Sparkles className="w-4 h-4" /> Crear primer post
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPosts.map(post => {
                    const st = statusCfg[post.status] || statusCfg.draft;
                    return (
                      <Card key={post.id} className="hover:border-primary/20 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {(post.platforms || []).map(p => (
                                <span key={p} className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                  {platformIcon(p)}
                                </span>
                              ))}
                            </div>
                            <Badge variant="outline" className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                          </div>
                          <p className="text-sm text-foreground line-clamp-3">{post.body || post.title || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString("es")}
                            {post.ai_generated && " · 🤖 IA"}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="indices"><MarketingKPIs /></TabsContent>
          <TabsContent value="difusiones"><DifusionesTab /></TabsContent>
          <TabsContent value="audiencias"><AudienciasTab /></TabsContent>
          <TabsContent value="contactos"><MarketingContactsTab /></TabsContent>
          <TabsContent value="tokens"><TokenAPIsTab /></TabsContent>
        </Tabs>
      </div>

      {/* ═══ EDIT POST DIALOG ═══ */}
      <Dialog open={!!editingPost} onOpenChange={o => { if (!o) setEditingPost(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar post</DialogTitle></DialogHeader>
          <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={8} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>Cancelar</Button>
            <Button onClick={handleEditSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ AI WIZARD DIALOG ═══ */}
      <Dialog open={wizardOpen} onOpenChange={o => { if (!o) { setWizardOpen(false); setWizardStep(1); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generar contenido con IA — Paso {wizardStep}/4
            </DialogTitle>
          </DialogHeader>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <Label>¿Para qué plataforma?</Label>
              <div className="grid grid-cols-2 gap-3">
                {["Instagram", "Facebook", "TikTok", "LinkedIn"].map(p => (
                  <Card key={p}
                    className={cn("cursor-pointer hover:border-primary/40 transition-all",
                      wizardData.platform === p && "border-primary ring-1 ring-primary/20")}
                    onClick={() => setWizardData(d => ({ ...d, platform: p }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
                        {platformIcon(p)}
                      </div>
                      <p className="text-sm font-medium">{p}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full" onClick={() => setWizardStep(2)}>Siguiente</Button>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <Label>¿Qué tipo de contenido?</Label>
              <div className="grid grid-cols-2 gap-2">
                {contentTypes.map(ct => (
                  <Card key={ct.value}
                    className={cn("cursor-pointer hover:border-primary/40 transition-all",
                      wizardData.contentType === ct.value && "border-primary ring-1 ring-primary/20")}
                    onClick={() => setWizardData(d => ({ ...d, contentType: ct.value }))}
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-medium">{ct.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">Atrás</Button>
                <Button onClick={() => setWizardStep(3)} disabled={!wizardData.contentType} className="flex-1">Siguiente</Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <Label>Describe brevemente lo que quieres</Label>
              <Textarea
                value={wizardData.description}
                onChange={e => setWizardData(d => ({ ...d, description: e.target.value }))}
                placeholder="Ej: Promoción de blanqueamiento dental con 20% de descuento este mes..."
                rows={4}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Atrás</Button>
                <Button onClick={handleWizardGenerate} disabled={generating || !wizardData.description.trim()} className="flex-1 gradient-primary text-primary-foreground">
                  {generating ? "Generando..." : "✨ Generar"}
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Texto generado (editable)</Label>
                <Textarea
                  value={wizardData.generatedText}
                  onChange={e => setWizardData(d => ({ ...d, generatedText: e.target.value }))}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Hashtags (editables)</Label>
                <Input
                  value={wizardData.hashtags}
                  onChange={e => setWizardData(d => ({ ...d, hashtags: e.target.value }))}
                />
              </div>
              {wizardData.recommendedTime && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hora recomendada: <strong>{wizardData.recommendedTime}</strong>
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleWizardSave("draft")} className="flex-1">💾 Guardar borrador</Button>
                <Button onClick={() => handleWizardSave("scheduled")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">✅ Aprobar y programar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MarketingPage;
