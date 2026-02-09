import { useState, useRef, useMemo } from "react";
import { Edit, Trash2, Clock, Pencil, RefreshCw, Loader2, Check, X, Copy, Video, Upload, Image, FileText, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { ContentPost } from "@/hooks/useContentPosts";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  content: {
    drafts: ContentPost[];
    deletePost: (id: string) => Promise<boolean>;
    updatePost: (id: string, data: Partial<ContentPost>) => Promise<boolean>;
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const ContentDraftsView = ({ content }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showPromptId, setShowPromptId] = useState<string | null>(null);
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "copy">("all");
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [videoUploadTargetId, setVideoUploadTargetId] = useState<string | null>(null);

  const startEditing = (draft: ContentPost) => {
    setEditingId(draft.id);
    setEditBody(draft.body || "");
  };

  const saveEdit = async (id: string) => {
    const ok = await content.updatePost(id, { body: editBody });
    if (ok) {
      toast.success("Copy actualizado");
      setEditingId(null);
    }
  };

  const duplicateDraft = async (draft: ContentPost) => {
    const result = await content.createPost({
      title: draft.title ? `${draft.title} (copia)` : "Copia",
      body: draft.body,
      media_urls: draft.media_urls,
      media_type: draft.media_type,
      post_type: draft.post_type,
      platforms: draft.platforms,
      hashtags: draft.hashtags,
      ai_generated: draft.ai_generated,
      ai_prompt: draft.ai_prompt,
      status: "draft",
    });
    if (result) toast.success("Borrador duplicado — edítalo como quieras");
  };

  const regenerateImage = async (id: string, prompt: string) => {
    if (!prompt.trim()) { toast.error("Escribe un prompt para la imagen"); return; }
    setRegeneratingImageId(id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone: "Profesional", platform: "Instagram", type: "image" },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        await content.updatePost(id, { media_urls: [data.imageUrl], ai_prompt: prompt });
        toast.success("Imagen regenerada");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error regenerando imagen");
    } finally {
      setRegeneratingImageId(null);
    }
  };
  const handleUploadVideoToDraft = async (draftId: string, file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("El video no puede superar los 100MB");
      return;
    }
    setUploadingVideoId(draftId);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content-media")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(fileName);
      await content.updatePost(draftId, { media_urls: [urlData.publicUrl] });
      toast.success("Video subido correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error subiendo video");
    } finally {
      setUploadingVideoId(null);
    }
  };

  const filteredDrafts = useMemo(() => {
    if (filter === "all") return content.drafts;
    return content.drafts.filter(d => {
      if (filter === "video") return d.media_type === "video";
      if (filter === "image") return d.media_type === "image" && d.media_urls && d.media_urls.length > 0 && d.media_urls[0];
      if (filter === "copy") return d.media_type !== "video" && (!d.media_urls || d.media_urls.length === 0 || !d.media_urls[0]);
      return true;
    });
  }, [content.drafts, filter]);

  const filterButtons = [
    { key: "all" as const, label: "Todos", icon: LayoutGrid, count: content.drafts.length },
    { key: "image" as const, label: "Imágenes", icon: Image, count: content.drafts.filter(d => d.media_type === "image" && d.media_urls?.length && d.media_urls[0]).length },
    { key: "video" as const, label: "Videos", icon: Video, count: content.drafts.filter(d => d.media_type === "video").length },
    { key: "copy" as const, label: "Copys", icon: FileText, count: content.drafts.filter(d => d.media_type !== "video" && (!d.media_urls?.length || !d.media_urls[0])).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Borradores</h2>
          <p className="text-sm text-muted-foreground">Publicaciones guardadas como borrador — edita el copy o regenera imágenes</p>
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
          {filterButtons.map(({ key, label, icon: Icon, count }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 text-xs h-8 ${filter === key ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => setFilter(key)}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <Badge variant={filter === key ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{count}</Badge>
            </Button>
          ))}
        </div>
      </div>

      {filteredDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">{filter === "all" ? "No tienes borradores" : `No hay ${filter === "image" ? "imágenes" : filter === "video" ? "videos" : "copys"}`}</p>
          <p className="text-sm text-muted-foreground mt-1">{filter === "all" ? "Los borradores aparecerán aquí cuando guardes publicaciones sin programar" : "Prueba con otro filtro"}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDrafts.map(draft => {
            const isEditing = editingId === draft.id;
            const isRegenerating = regeneratingImageId === draft.id;
            const showingPrompt = showPromptId === draft.id;
            const isVideo = draft.media_type === "video";
            const hasMedia = draft.media_urls && draft.media_urls.length > 0 && draft.media_urls[0];
            const isUploadingVideo = uploadingVideoId === draft.id;

            return (
              <div key={draft.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)] text-xs">Borrador</Badge>
                    {isVideo && (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1">
                        <Video className="w-3 h-3" /> Video
                      </Badge>
                    )}
                    {draft.ai_generated && (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(draft.created_at), "dd MMM", { locale: es })}</span>
                </div>

                {/* Media: image or video */}
                {isVideo && hasMedia && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <video src={draft.media_urls[0]} controls className="w-full max-h-[240px] bg-muted" />
                  </div>
                )}
                {isVideo && !hasMedia && (
                  <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 flex flex-col items-center justify-center gap-2">
                    <Upload className="w-8 h-8 text-primary/50" />
                    <p className="text-xs text-muted-foreground text-center">
                      Genera el video con el prompt y súbelo aquí
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs mt-1"
                      disabled={isUploadingVideo}
                      onClick={() => {
                        setVideoUploadTargetId(draft.id);
                        videoInputRef.current?.click();
                      }}
                    >
                      {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Subir video
                    </Button>
                  </div>
                )}
                {!isVideo && hasMedia && (
                  <div className="rounded-lg overflow-hidden border border-border relative group">
                    <img src={draft.media_urls[0]} alt="Draft" className="w-full max-h-[240px] object-contain bg-muted" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setShowPromptId(showingPrompt ? null : draft.id);
                          setImagePrompt(draft.ai_prompt || "");
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerar imagen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Image prompt editor */}
                {showingPrompt && (
                  <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/30">
                    <Label className="text-xs font-medium">Prompt de imagen</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      className="min-h-[60px] text-xs"
                      placeholder="Describe la imagen que quieres generar..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="text-xs gap-1 gradient-primary text-primary-foreground"
                        onClick={() => regenerateImage(draft.id, imagePrompt)}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Regenerar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPromptId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Copy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{draft.title || "Sin título"}</p>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        className="min-h-[100px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="text-xs gap-1" onClick={() => saveEdit(draft.id)}>
                          <Check className="w-3 h-3" /> Guardar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-4">{draft.body || "Sin contenido aún..."}</p>
                  )}
                </div>

                {draft.platforms && draft.platforms.length > 0 && (
                  <div className="flex gap-1">
                    {draft.platforms.map(p => (
                      <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1 flex-wrap">
                  {!isEditing && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => startEditing(draft)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar {isVideo ? "prompt" : "copy"}
                    </Button>
                  )}
                  {isVideo && hasMedia && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      disabled={isUploadingVideo}
                      onClick={() => {
                        setVideoUploadTargetId(draft.id);
                        videoInputRef.current?.click();
                      }}
                    >
                      {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Cambiar video
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => duplicateDraft(draft)}>
                    <Copy className="w-3.5 h-3.5" /> Reutilizar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Programar
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => content.deletePost(draft.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden video file input */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && videoUploadTargetId) handleUploadVideoToDraft(videoUploadTargetId, file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ContentDraftsView;
