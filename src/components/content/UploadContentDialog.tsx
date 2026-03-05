import { useState, useRef } from "react";
import { Upload, Image, Video, Sparkles, Loader2, CalendarDays, X, FileUp, Zap, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { usePublishToMeta } from "@/hooks/usePublishToMeta";
import type { ContentPost } from "@/hooks/useContentPosts";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const postFormats = [
  { value: "post", label: "Post / Feed", icon: Image },
  { value: "story", label: "Historia / Story", icon: FileUp },
  { value: "reel", label: "Reel / Video corto", icon: Video },
];

const platformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
];

const UploadContentDialog = ({ open, onOpenChange, content }: Props) => {
  const { clinicId } = useClinic();
  const { publishNow, publishing: publishingNow } = usePublishToMeta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const platformFileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [postFormat, setPostFormat] = useState("post");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [copy, setCopy] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Per-platform customization
  const [customPerPlatform, setCustomPerPlatform] = useState(false);
  const [platformCopy, setPlatformCopy] = useState<Record<string, string>>({});
  const [platformFiles, setPlatformFiles] = useState<Record<string, File[]>>({});
  const [platformPreviews, setPlatformPreviews] = useState<Record<string, string[]>>({});
  const [platformFileTarget, setPlatformFileTarget] = useState<string>("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const valid = selected.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (valid.length !== selected.length) toast.error("Solo se permiten imágenes y videos");
    const oversized = valid.filter(f => f.size > (f.type.startsWith("video/") ? 100 * 1024 * 1024 : 20 * 1024 * 1024));
    if (oversized.length > 0) { toast.error("Algunos archivos exceden el tamaño máximo"); return; }
    setFiles(prev => [...prev, ...valid]);
    valid.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      } else {
        setPreviews(prev => [...prev, "video"]);
      }
    });
  };

  const handlePlatformFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0 || !platformFileTarget) return;
    const valid = selected.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    setPlatformFiles(prev => ({ ...prev, [platformFileTarget]: [...(prev[platformFileTarget] || []), ...valid] }));
    valid.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setPlatformPreviews(prev => ({
          ...prev,
          [platformFileTarget]: [...(prev[platformFileTarget] || []), ev.target?.result as string],
        }));
        reader.readAsDataURL(file);
      } else {
        setPlatformPreviews(prev => ({
          ...prev,
          [platformFileTarget]: [...(prev[platformFileTarget] || []), "video"],
        }));
      }
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removePlatformFile = (platform: string, idx: number) => {
    setPlatformFiles(prev => ({ ...prev, [platform]: (prev[platform] || []).filter((_, i) => i !== idx) }));
    setPlatformPreviews(prev => ({ ...prev, [platform]: (prev[platform] || []).filter((_, i) => i !== idx) }));
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleAIGenerateCopy = async () => {
    if (files.length === 0 && !customPerPlatform) {
      toast.error("Sube al menos una imagen o video primero");
      return;
    }
    setGeneratingCopy(true);
    try {
      let imageContext = "";
      const firstFile = files[0];
      if (firstFile?.type.startsWith("image/")) {
        imageContext = `\n\n[La imagen es: ${firstFile.name}, tipo: ${firstFile.type}. Analiza el contexto visual y genera un copy apropiado.]`;
      }
      const prompt = `Genera un copy profesional y atractivo para redes sociales (${platforms.join(", ")}) para un ${postFormat === "post" ? "post de feed" : postFormat === "story" ? "historia/story" : "reel/video corto"}.
${title ? `Tema/título: ${title}` : ""}
${imageContext}

El copy debe ser:
- Atractivo y con gancho desde la primera línea
- Apropiado para las plataformas seleccionadas
- Con llamada a la acción
- Incluir emojis relevantes

Responde en formato JSON:
{"body": "el copy completo", "hashtags": "#hashtag1 #hashtag2 ...", "firstComment": "primer comentario sugerido", "title": "título corto si no se proporcionó"}`;
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: { prompt, tone: "Profesional", platform: platforms[0] || "instagram", type: "copy" },
      });
      if (error) throw error;
      const text = data?.content || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setCopy(parsed.body || text);
          if (parsed.hashtags) setHashtags(parsed.hashtags);
          if (parsed.firstComment) setFirstComment(parsed.firstComment);
          if (!title && parsed.title) setTitle(parsed.title);
          toast.success("✨ Copy generado con IA");
        } else {
          setCopy(text);
        }
      } catch {
        setCopy(text);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generando copy con IA");
    } finally {
      setGeneratingCopy(false);
    }
  };

  const uploadFilesToStorage = async (filesToUpload: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop();
      const fileName = `${clinicId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("content-media")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (action: "draft" | "scheduled" | "publish_now") => {
    if (!clinicId) return;
    
    const hasSharedFiles = files.length > 0;
    const hasPlatformFiles = customPerPlatform && Object.values(platformFiles).some(f => f.length > 0);
    
    if (!hasSharedFiles && !hasPlatformFiles) {
      toast.error("Sube al menos un archivo");
      return;
    }
    if (action === "scheduled" && !scheduledDate) {
      toast.error("Selecciona fecha de publicación");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Selecciona al menos una plataforma");
      return;
    }

    setUploading(true);
    try {
      if (customPerPlatform) {
        // Create separate posts per platform
        for (const platform of platforms) {
          const pFiles = platformFiles[platform]?.length > 0 ? platformFiles[platform] : files;
          const pCopy = platformCopy[platform] || copy;
          
          if (pFiles.length === 0 && !pCopy) continue;
          
          const mediaUrls = pFiles.length > 0 ? await uploadFilesToStorage(pFiles) : [];
          const mediaType = pFiles[0]?.type.startsWith("video/") ? "video" : "image";
          const scheduledAt = action === "scheduled" && scheduledDate
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
            : null;

          const postStatus = action === "publish_now" ? "draft" : action;
          const created = await content.createPost({
            title: title || null,
            body: pCopy || null,
            media_urls: mediaUrls,
            media_type: mediaType,
            post_type: postFormat,
            status: postStatus,
            platforms: [platform],
            hashtags: hashtags ? hashtags.split(/\s+/).filter(Boolean) : [],
            first_comment: firstComment || null,
            scheduled_at: scheduledAt,
            ai_generated: false,
          });

          if (action === "publish_now" && created?.id) {
            await publishNow(created.id);
          }
        }
      } else {
        // Single post for all platforms
        const mediaUrls = await uploadFilesToStorage(files);
        const mediaType = files[0]?.type.startsWith("video/") ? "video" : "image";
        const scheduledAt = action === "scheduled" && scheduledDate
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : null;

        const postStatus = action === "publish_now" ? "draft" : action;
        const created = await content.createPost({
          title: title || null,
          body: copy || null,
          media_urls: mediaUrls,
          media_type: mediaType,
          post_type: postFormat,
          status: postStatus,
          platforms,
          hashtags: hashtags ? hashtags.split(/\s+/).filter(Boolean) : [],
          first_comment: firstComment || null,
          scheduled_at: scheduledAt,
          ai_generated: false,
        });

        if (action === "publish_now" && created?.id) {
          await publishNow(created.id);
        }
      }

      const msg = action === "publish_now" ? "🚀 Publicando..." : action === "scheduled" ? "📅 Contenido programado" : "📝 Guardado como borrador";
      toast.success(msg);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Error subiendo contenido");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFiles([]); setPreviews([]); setPostFormat("post"); setPlatforms(["instagram", "facebook"]);
    setCopy(""); setTitle(""); setHashtags(""); setFirstComment("");
    setScheduledDate(""); setScheduledTime("10:00");
    setCustomPerPlatform(false); setPlatformCopy({}); setPlatformFiles({}); setPlatformPreviews({});
  };

  const isProcessing = uploading || publishingNow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Subir contenido propio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Publicar en</Label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    platforms.includes(p.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Per-platform toggle */}
          {platforms.length > 1 && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Personalizar por plataforma</p>
                <p className="text-xs text-muted-foreground">Usar diferente imagen o copy para cada red social</p>
              </div>
              <Switch checked={customPerPlatform} onCheckedChange={setCustomPerPlatform} />
            </div>
          )}

          {/* Post format */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formato de publicación</Label>
            <div className="grid grid-cols-3 gap-2">
              {postFormats.map(f => (
                <button
                  key={f.value}
                  onClick={() => setPostFormat(f.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    postFormat === f.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <f.icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Shared file upload (when not custom per platform) */}
          {!customPerPlatform && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Imagen o Video</Label>
              {files.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Haz clic para subir</p>
                    <p className="text-xs text-muted-foreground mt-1">Imágenes o Videos • Máx 100MB</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                        {preview === "video" ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => removeFile(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border-2 border-dashed border-border aspect-square flex items-center justify-center hover:border-primary/40">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* Per-platform content sections */}
          {customPerPlatform && platforms.map(platform => (
            <div key={platform} className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">{platform === "facebook" ? "📘 Facebook" : "📸 Instagram"}</Badge>
              </div>

              {/* Platform-specific files */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Imagen/Video para {platform}</Label>
                {(platformPreviews[platform] || []).length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(platformPreviews[platform] || []).map((preview, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                        {preview === "video" ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center"><Video className="w-6 h-6 text-muted-foreground" /></div>
                        ) : (
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => removePlatformFile(platform, idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => { setPlatformFileTarget(platform); platformFileInputRef.current?.click(); }} className="rounded-lg border-2 border-dashed border-border aspect-square flex items-center justify-center hover:border-primary/40">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPlatformFileTarget(platform); platformFileInputRef.current?.click(); }}
                    className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 hover:border-primary/40 transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Subir archivo para {platform}</p>
                    <p className="text-[10px] text-muted-foreground">Si no subes, usará el archivo compartido</p>
                  </button>
                )}
              </div>

              {/* Platform-specific copy */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Copy para {platform}</Label>
                <Textarea
                  placeholder={`Copy específico para ${platform}... (deja vacío para usar el general)`}
                  className="min-h-[70px] text-sm"
                  value={platformCopy[platform] || ""}
                  onChange={e => setPlatformCopy(prev => ({ ...prev, [platform]: e.target.value }))}
                />
              </div>
            </div>
          ))}

          <input ref={platformFileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handlePlatformFileSelect} />

          {/* Shared file upload area when custom per platform (fallback) */}
          {customPerPlatform && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Archivo compartido (se usa como respaldo)</Label>
              {files.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Subir archivo compartido (opcional)</p>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                      {preview === "video" ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center"><Video className="w-6 h-6 text-muted-foreground" /></div>
                      ) : (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border-2 border-dashed border-border aspect-square flex items-center justify-center hover:border-primary/40"><Upload className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Título (opcional)</Label>
            <Input placeholder="Ej: Promoción de verano" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Copy (shared) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{customPerPlatform ? "Copy general (respaldo)" : "Copy / Texto"}</Label>
              <Button variant="outline" size="sm" onClick={handleAIGenerateCopy} disabled={generatingCopy} className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10">
                {generatingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingCopy ? "Generando..." : "Generar con IA"}
              </Button>
            </div>
            <Textarea placeholder="Escribe tu copy o deja que la IA lo genere..." className="min-h-[100px]" value={copy} onChange={e => setCopy(e.target.value)} />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Hashtags</Label>
            <Input placeholder="#marketing #negocio #estrategia" value={hashtags} onChange={e => setHashtags(e.target.value)} />
          </div>

          {/* First comment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Primer comentario (opcional)</Label>
            <Input placeholder="Comentario para publicar junto al post" value={firstComment} onChange={e => setFirstComment(e.target.value)} />
          </div>

          {/* Schedule */}
          <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              Programar publicación (para la opción "Programar")
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fecha</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hora</Label>
                <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Actions - 3 buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleSubmit("draft")}
              variant="outline"
              className="flex-1 gap-2"
              disabled={isProcessing}
            >
              {uploading && !publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              Borrador
            </Button>
            <Button
              onClick={() => handleSubmit("scheduled")}
              variant="outline"
              className="flex-1 gap-2"
              disabled={isProcessing || !scheduledDate}
            >
              {uploading && !publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              Programar
            </Button>
            <Button
              onClick={() => handleSubmit("publish_now")}
              className="flex-1 gap-2 gradient-primary text-primary-foreground"
              disabled={isProcessing || platforms.length === 0}
            >
              {publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {publishingNow ? "Publicando..." : "Publicar ahora"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadContentDialog;