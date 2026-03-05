import { useState, useMemo, useEffect } from "react";
import { Palette, Sparkles, FileCheck, CalendarDays, List, Loader2, CheckCircle, XCircle, RefreshCw, Pencil, Instagram, Facebook, Music, Linkedin, Globe, Megaphone, Lightbulb, Star, Image, Heart, PartyPopper, Brain, ChevronRight, ChevronLeft, Wand2, Save, Clock, Upload } from "lucide-react";
import ContentAIGenerator from "@/components/content/ContentAIGenerator";
import UploadContentDialog from "@/components/content/UploadContentDialog";
import AppLayout from "@/components/AppLayout";
import { useContentPosts, type ContentPost } from "@/hooks/useContentPosts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { usePsychoStrategies } from "@/hooks/usePsychoMatrix";

// ─── Platform config ───
const platformOptions = [
  { id: "instagram", label: "Instagram", icon: Instagram, desc: "Posts, carousels, reels" },
  { id: "facebook", label: "Facebook", icon: Facebook, desc: "Posts, artículos" },
  { id: "tiktok", label: "TikTok", icon: Music, desc: "Ideas para videos cortos" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, desc: "Posts profesionales" },
  { id: "all", label: "Todas", icon: Globe, desc: "Adaptar para todas" },
];

const contentTypes = [
  { id: "promocion", label: "Promoción de servicio", icon: Megaphone, desc: "Promocionar un tratamiento", needsService: true },
  { id: "educativo", label: "Tip educativo", icon: Lightbulb, desc: "Enseñar algo útil", needsTopic: true },
  { id: "testimonio", label: "Testimonio / Caso de éxito", icon: Star, desc: "Historia de un cliente feliz", needsDesc: true },
  { id: "antes_despues", label: "Antes / Después", icon: Image, desc: "Mostrar resultados", needsService: true, needsDesc: true },
  { id: "motivacional", label: "Post motivacional", icon: Heart, desc: "Inspirar y conectar" },
  { id: "fecha_especial", label: "Fecha especial / Temporada", icon: PartyPopper, desc: "Contenido para un evento", needsEvent: true },
  { id: "psycho_matrix", label: "Basado en Psycho-Matrix", icon: Brain, desc: "Usar una estrategia", needsStrategy: true },
];

const toneOptions = ["Profesional", "Cercano", "Divertido", "Inspiracional", "Urgente"];
const lengthOptions = [
  { value: "short", label: "Corto (1-2 líneas)" },
  { value: "medium", label: "Medio (3-5 líneas)" },
  { value: "long", label: "Largo (párrafo completo)" },
];

const statusColor: Record<string, string> = {
  published: "bg-emerald-500", scheduled: "bg-blue-500", approved: "bg-blue-500",
  draft: "bg-gray-400", pending_approval: "bg-amber-500", discarded: "bg-red-500",
};
const statusLabel: Record<string, string> = {
  published: "Publicado", scheduled: "Programado", approved: "Aprobado",
  draft: "Borrador", pending_approval: "Pendiente", discarded: "Descartado",
};

const platformEmoji: Record<string, string> = {
  instagram: "📸", facebook: "📘", tiktok: "🎵", linkedin: "💼",
};

// ─── Main Page ───
const ContentPage = () => {
  const content = useContentPosts();
  const { clinicId } = useClinic();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);

  const pendingPosts = useMemo(() =>
    content.posts.filter(p => p.status === "draft" || p.status === "pending_approval"),
    [content.posts]
  );
  const weekPosts = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return content.posts.filter(p => new Date(p.created_at) >= weekAgo);
  }, [content.posts]);

  if (content.loading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">🎨 Autopilot de Contenido</h1>
                <p className="text-sm text-muted-foreground">La IA crea contenido para tus redes. Tú solo apruebas.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1.5 border-white/10 bg-white/5">
              Esta semana: {weekPosts.length} creados · {pendingPosts.length} pendientes · {content.published.length} publicados
            </Badge>
            <Button onClick={() => setUploadOpen(true)} variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
              <Upload className="w-4 h-4" /> Subir contenido
            </Button>
            <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white gap-2 hover:opacity-90">
              <Sparkles className="w-4 h-4" /> Crear con IA
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pendientes" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pendientes" className="gap-2 data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#A78BFA]">
              <FileCheck className="w-4 h-4" /> Pendientes
              {pendingPosts.length > 0 && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5">{pendingPosts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2 data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#A78BFA]">
              <CalendarDays className="w-4 h-4" /> Calendario
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-2 data-[state=active]:bg-[#8B5CF6]/20 data-[state=active]:text-[#A78BFA]">
              <List className="w-4 h-4" /> Todos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            <PendingTab posts={pendingPosts} content={content} onCreateClick={() => setWizardOpen(true)} onEdit={setEditPost} />
          </TabsContent>
          <TabsContent value="calendario">
            <CalendarTab posts={content.posts} onCreateClick={() => setWizardOpen(true)} />
          </TabsContent>
          <TabsContent value="todos">
            <AllPostsTab posts={content.posts} content={content} onEdit={setEditPost} />
          </TabsContent>
        </Tabs>

        {/* Metrics footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Posts este mes", value: content.posts.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length },
            { label: "Instagram", value: content.posts.filter(p => p.platforms?.includes("instagram")).length },
            { label: "Facebook", value: content.posts.filter(p => p.platforms?.includes("facebook")).length },
            { label: "Publicados", value: content.published.length },
          ].map(m => (
            <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-bold mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Generator — full page */}
      {wizardOpen && (
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
            <div className="p-6">
              <ContentAIGenerator content={content} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      <UploadContentDialog open={uploadOpen} onOpenChange={setUploadOpen} content={content} />

      {/* Edit Modal */}
      {editPost && <EditPostModal post={editPost} onClose={() => setEditPost(null)} content={content} />}
    </AppLayout>
  );
};

// ─── Pending Tab ───
const PendingTab = ({ posts, content, onCreateClick, onEdit }: {
  posts: ContentPost[];
  content: ReturnType<typeof useContentPosts>;
  onCreateClick: () => void;
  onEdit: (p: ContentPost) => void;
}) => {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-lg font-medium">✅ No hay contenido pendiente</p>
        <p className="text-sm text-muted-foreground mt-2">¡Genera nuevo contenido con IA en 30 segundos!</p>
        <Button onClick={onCreateClick} className="mt-4 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white gap-2">
          <Sparkles className="w-4 h-4" /> Crear contenido con IA
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map(post => (
        <PostCard key={post.id} post={post} content={content} onEdit={onEdit} showActions />
      ))}
    </div>
  );
};

// ─── Post Card ───
const PostCard = ({ post, content, onEdit, showActions }: {
  post: ContentPost;
  content: ReturnType<typeof useContentPosts>;
  onEdit: (p: ContentPost) => void;
  showActions?: boolean;
}) => {
  const handleApprove = async () => {
    await content.updatePost(post.id, { status: "scheduled" });
    toast.success("✅ Post aprobado y programado");
  };
  const handleDiscard = async () => {
    await content.updatePost(post.id, { status: "discarded" as any });
    toast.success("Post descartado");
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 backdrop-blur-sm hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{platformEmoji[post.platforms?.[0] || ""] || "📱"}</span>
          <span className="text-xs text-muted-foreground capitalize">{post.platforms?.[0] || "General"}</span>
        </div>
        <div className="flex items-center gap-2">
          {post.ai_generated && <Badge variant="outline" className="text-[10px] bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/20">🤖 IA</Badge>}
          <Badge variant="outline" className={cn("text-[10px]", post.status === "draft" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")}>
            {statusLabel[post.status] || post.status}
          </Badge>
        </div>
      </div>

      {/* Image */}
      {post.media_urls?.[0] && (
        <div className="rounded-lg overflow-hidden border border-white/10">
          <img src={post.media_urls[0]} alt="" className="w-full h-40 object-cover" />
        </div>
      )}

      {/* Content */}
      <div>
        <p className="text-sm font-medium line-clamp-1">{post.title || "Sin título"}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{post.body || ""}</p>
      </div>

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <p className="text-[10px] text-[#A78BFA] line-clamp-1">{post.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}</p>
      )}

      {/* Date */}
      <p className="text-[10px] text-muted-foreground">
        {post.scheduled_at ? `📅 ${format(new Date(post.scheduled_at), "dd MMM yyyy HH:mm", { locale: es })}` : format(new Date(post.created_at), "dd MMM yyyy", { locale: es })}
      </p>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(post)} className="flex-1 text-xs gap-1 border-white/10 hover:bg-white/5">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscard} className="text-xs gap-1 border-white/10 hover:bg-red-500/10 text-red-400">
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Calendar Tab ───
const CalendarTab = ({ posts, onCreateClick }: { posts: ContentPost[]; onCreateClick: () => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const result: Date[] = [];
    let d = calStart;
    while (d <= calEnd) { result.push(d); d = addDays(d, 1); }
    return result;
  }, [currentMonth]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    posts.forEach(p => {
      const dateStr = p.scheduled_at || p.created_at;
      if (!dateStr) return;
      const key = format(new Date(dateStr), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) || []), p]);
    });
    return map;
  }, [posts]);

  const weekPostCount = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return posts.filter(p => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) >= weekAgo).length;
  }, [posts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Badge variant="outline" className="text-xs border-white/10 bg-white/5">
          Esta semana: {weekPostCount} programados · La IA recomienda mínimo 3
        </Badge>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
            <div key={d} className="bg-white/5 px-2 py-2 text-center text-xs font-semibold text-muted-foreground border-b border-white/10">{d}</div>
          ))}
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            return (
              <div key={i} className={cn("border-b border-r border-white/5 p-1.5 min-h-[90px] relative", !inMonth && "opacity-30", isToday(day) && "bg-[#8B5CF6]/5")}>
                <span className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-[#8B5CF6] text-white" : "text-muted-foreground")}>
                  {format(day, "d")}
                </span>
                <div className="space-y-0.5 mt-1">
                  {dayPosts.slice(0, 2).map(p => (
                    <div key={p.id} className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor[p.status] || "bg-gray-400")} />
                      <span className="text-[9px] text-foreground truncate">{p.title || "Post"}</span>
                    </div>
                  ))}
                  {dayPosts.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayPosts.length - 2}</span>}
                </div>
                {dayPosts.length === 0 && inMonth && (
                  <button onClick={onCreateClick} className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white/5 hover:bg-[#8B5CF6]/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-muted-foreground">+</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── All Posts Tab ───
const AllPostsTab = ({ posts, content, onEdit }: {
  posts: ContentPost[];
  content: ReturnType<typeof useContentPosts>;
  onEdit: (p: ContentPost) => void;
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (platformFilter !== "all" && !p.platforms?.includes(platformFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [posts, search, statusFilter, platformFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs bg-white/5 border-white/10" />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los status</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="scheduled">Programado</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="discarded">Descartado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-muted-foreground">No se encontraron posts</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(post => (
            <PostCard key={post.id} post={post} content={content} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AI Wizard ───
const ContentWizard = ({ open, onOpenChange, content }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  content: ReturnType<typeof useContentPosts>;
}) => {
  const { clinicId } = useClinic();
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [tone, setTone] = useState("Profesional");
  const [length, setLength] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ title: string; body: string; hashtags: string; firstComment: string; imageSuggestion: string; scheduledTime: string } | null>(null);

  const [treatments, setTreatments] = useState<any[]>([]);
  const { data: strategies = [] } = usePsychoStrategies();

  // Load treatments
  useEffect(() => {
    if (clinicId) {
      supabase.from("treatments").select("id, name, price").eq("clinic_id", clinicId).then(({ data }) => setTreatments(data || []));
    }
  }, [clinicId]);

  const selectedType = contentTypes.find(t => t.id === contentType);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Build prompt
      let prompt = `Genera un post para ${platform === "all" ? "redes sociales" : platform}.\n`;
      prompt += `Tipo: ${selectedType?.label || contentType}\n`;
      prompt += `Tono: ${tone}\nLongitud: ${length === "short" ? "1-2 líneas" : length === "medium" ? "3-5 líneas" : "párrafo completo"}\n`;
      if (serviceName) prompt += `Servicio: ${serviceName}\n`;
      if (topic) prompt += `Tema: ${topic}\n`;
      if (description) prompt += `Descripción: ${description}\n`;
      if (eventName) prompt += `Evento: ${eventName}\n`;
      if (customNotes) prompt += `Notas adicionales: ${customNotes}\n`;

      const strategy = strategies.find(s => s.id === strategyId);
      if (strategy) {
        prompt += `\nEstrategia Psycho-Matrix:\n- Arquetipo: ${strategy.archetype}\n- Trigger: ${strategy.persuasion_trigger}\n- Tono: ${strategy.brand_voice}\n- Generación: ${strategy.generation}\n`;
      }

      prompt += `\nResponde en formato JSON con estos campos exactos:\n{"title":"título corto","body":"texto del post","hashtags":"#hashtag1 #hashtag2 ...","firstComment":"primer comentario sugerido","imageSuggestion":"descripción de imagen ideal","scheduledTime":"HH:MM formato 24h"}`;

      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone, platform, type: "copy" },
      });
      if (error) throw error;

      const text = data?.content || "";
      // Try to parse JSON from response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult({
            title: parsed.title || "",
            body: parsed.body || text,
            hashtags: parsed.hashtags || "",
            firstComment: parsed.firstComment || "",
            imageSuggestion: parsed.imageSuggestion || "",
            scheduledTime: parsed.scheduledTime || "10:00",
          });
        } else {
          setResult({ title: "", body: text, hashtags: "", firstComment: "", imageSuggestion: "", scheduledTime: "10:00" });
        }
      } catch {
        setResult({ title: "", body: text, hashtags: "", firstComment: "", imageSuggestion: "", scheduledTime: "10:00" });
      }
      setStep(4);
    } catch (err) {
      console.error(err);
      toast.error("Error generando contenido. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: string) => {
    if (!result || !clinicId) return;
    const platforms = platform === "all" ? ["instagram", "facebook", "tiktok", "linkedin"] : [platform];
    await content.createPost({
      title: result.title,
      body: result.body,
      hashtags: result.hashtags.split(/\s+/).filter(Boolean),
      first_comment: result.firstComment,
      platforms,
      status: status as any,
      ai_generated: true,
      post_type: contentType || "post",
      scheduled_at: status === "scheduled" ? new Date(new Date().setHours(parseInt(result.scheduledTime.split(":")[0]) || 10, parseInt(result.scheduledTime.split(":")[1]) || 0)).toISOString() : null,
    });
    toast.success(status === "scheduled" ? "✅ Post aprobado y programado" : "💾 Borrador guardado");
    resetWizard();
    onOpenChange(false);
  };

  const resetWizard = () => {
    setStep(1); setPlatform(""); setContentType(""); setServiceName("");
    setTopic(""); setDescription(""); setEventName(""); setStrategyId("");
    setCustomNotes(""); setTone("Profesional"); setLength("medium");
    setResult(null); setGenerating(false);
  };

  const handleClose = () => { resetWizard(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A78BFA]" /> Crear contenido con IA
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {[1,2,3,4].map(s => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all", step >= s ? "bg-[#8B5CF6]" : "bg-white/10")} />
          ))}
        </div>

        {/* Step 1: Platform */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">¿Para qué plataforma?</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformOptions.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setStep(2); }}
                  className={cn("p-4 rounded-xl border text-left transition-all hover:border-[#8B5CF6]/50",
                    platform === p.id ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <p.icon className="w-6 h-6 mb-2 text-[#A78BFA]" />
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Content Type */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">¿Qué tipo de contenido?</p>
            <div className="grid grid-cols-2 gap-3">
              {contentTypes.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => { setContentType(ct.id); setStep(3); }}
                  className={cn("p-3 rounded-xl border text-left transition-all hover:border-[#8B5CF6]/50",
                    contentType === ct.id ? "border-[#8B5CF6] bg-[#8B5CF6]/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <ct.icon className="w-5 h-5 mb-1.5 text-[#A78BFA]" />
                  <p className="text-sm font-medium">{ct.label}</p>
                  <p className="text-[10px] text-muted-foreground">{ct.desc}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-muted-foreground">
              <ChevronLeft className="w-3 h-3 mr-1" /> Atrás
            </Button>
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Personaliza tu contenido</p>

            {selectedType?.needsService && (
              <div>
                <Label className="text-xs text-muted-foreground">Servicio a promocionar</Label>
                <Select value={serviceName} onValueChange={setServiceName}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                  <SelectContent>
                    {treatments.map(t => <SelectItem key={t.id} value={t.name}>{t.name} — ${t.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedType?.needsTopic && (
              <div>
                <Label className="text-xs text-muted-foreground">¿Sobre qué tema?</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej: Cuidado dental, rutina facial..." className="mt-1 bg-white/5 border-white/10" />
              </div>
            )}

            {selectedType?.needsDesc && (
              <div>
                <Label className="text-xs text-muted-foreground">Describe brevemente</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el caso o resultado..." className="mt-1 bg-white/5 border-white/10 min-h-[60px]" />
              </div>
            )}

            {selectedType?.needsEvent && (
              <div>
                <Label className="text-xs text-muted-foreground">¿Qué fecha o evento?</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Día de la madre, Navidad, Black Friday..." className="mt-1 bg-white/5 border-white/10" />
              </div>
            )}

            {selectedType?.needsStrategy && (
              <div>
                <Label className="text-xs text-muted-foreground">Estrategia Psycho-Matrix</Label>
                {strategies.length === 0 ? (
                  <p className="text-xs text-amber-400 mt-1">Primero genera un análisis en Psycho-Matrix</p>
                ) : (
                  <Select value={strategyId} onValueChange={setStrategyId}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue placeholder="Seleccionar estrategia" /></SelectTrigger>
                    <SelectContent>
                      {strategies.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.archetype}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">¿Algo específico que quieras mencionar? (opcional)</Label>
              <Textarea value={customNotes} onChange={e => setCustomNotes(e.target.value)}
                placeholder="Ej: Tenemos descuento del 20% esta semana..."
                className="mt-1 bg-white/5 border-white/10 min-h-[50px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tono</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {toneOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Longitud</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {lengthOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs text-muted-foreground">
                <ChevronLeft className="w-3 h-3 mr-1" /> Atrás
              </Button>
              <Button onClick={handleGenerate} disabled={generating} className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white gap-2">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {generating ? "Generando..." : "✨ Generar contenido"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-4">
            {/* Social media preview mockup */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]" />
                <div>
                  <p className="text-xs font-medium">Tu negocio</p>
                  <p className="text-[10px] text-muted-foreground">{platformEmoji[platform] || "📱"} {platform}</p>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.body}</p>
              {result.hashtags && <p className="text-xs text-[#A78BFA]">{result.hashtags}</p>}
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input value={result.title} onChange={e => setResult(r => r ? { ...r, title: e.target.value } : r)}
                  className="mt-1 bg-white/5 border-white/10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Texto del post</Label>
                <Textarea value={result.body} onChange={e => setResult(r => r ? { ...r, body: e.target.value } : r)}
                  className="mt-1 bg-white/5 border-white/10 min-h-[100px]" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hashtags</Label>
                <Input value={result.hashtags} onChange={e => setResult(r => r ? { ...r, hashtags: e.target.value } : r)}
                  className="mt-1 bg-white/5 border-white/10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Primer comentario sugerido</Label>
                <Input value={result.firstComment} onChange={e => setResult(r => r ? { ...r, firstComment: e.target.value } : r)}
                  className="mt-1 bg-white/5 border-white/10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">💡 Sugerencia de imagen</Label>
                <p className="text-xs text-muted-foreground mt-1 bg-white/5 border border-white/10 rounded-lg p-3">{result.imageSuggestion || "No disponible"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hora sugerida</Label>
                <Input type="time" value={result.scheduledTime} onChange={e => setResult(r => r ? { ...r, scheduledTime: e.target.value } : r)}
                  className="mt-1 bg-white/5 border-white/10 w-32" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => handleSave("draft")} variant="outline" className="flex-1 border-white/10 hover:bg-white/5 gap-2 text-sm">
                <Save className="w-4 h-4" /> Guardar borrador
              </Button>
              <Button onClick={() => handleSave("scheduled")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm">
                <CheckCircle className="w-4 h-4" /> Aprobar y programar
              </Button>
              <Button onClick={() => { setStep(3); setResult(null); }} variant="ghost" className="text-xs text-muted-foreground gap-1">
                <RefreshCw className="w-3 h-3" /> Regenerar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit Post Modal ───
const EditPostModal = ({ post, onClose, content }: {
  post: ContentPost;
  onClose: () => void;
  content: ReturnType<typeof useContentPosts>;
}) => {
  const [title, setTitle] = useState(post.title || "");
  const [body, setBody] = useState(post.body || "");
  const [hashtags, setHashtags] = useState(post.hashtags?.join(" ") || "");
  const [status, setStatus] = useState(post.status);

  const handleSave = async () => {
    await content.updatePost(post.id, {
      title, body,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
      status: status as any,
    });
    toast.success("✅ Post actualizado");
    onClose();
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-[#0d0d1a] border-white/10 text-foreground max-w-lg">
        <DialogHeader><DialogTitle>Editar post</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Texto</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} className="mt-1 bg-white/5 border-white/10 min-h-[120px]" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hashtags</Label>
            <Input value={hashtags} onChange={e => setHashtags(e.target.value)} className="mt-1 bg-white/5 border-white/10" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="scheduled">Programado</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white">
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContentPage;
