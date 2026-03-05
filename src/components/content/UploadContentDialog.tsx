import { useState, useRef } from "react";
import { Upload, Image, Video, Sparkles, Loader2, CalendarDays, X, FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
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
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

const UploadContentDialog = ({ open, onOpenChange, content }: Props) => {
  const { clinicId } = useClinic();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [postFormat, setPostFormat] = useState("post");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [copy, setCopy] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    
    // Validate file types
    const valid = selected.filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (valid.length !== selected.length) {
      toast.error("Solo se permiten imágenes y videos");
    }
    
    // Validate size (100MB max for videos, 20MB for images)
    const oversized = valid.filter(f => f.size > (f.type.startsWith("video/") ? 100 * 1024 * 1024 : 20 * 1024 * 1024));
    if (oversized.length > 0) {
      toast.error("Algunos archivos exceden el tamaño máximo");
      return;
    }

    setFiles(prev => [...prev, ...valid]);
    
    // Generate previews
    valid.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreviews(prev => [...prev, ev.target?.result as string]);
        reader.readAsDataURL(file);
      } else {
        // Video thumbnail placeholder
        setPreviews(prev => [...prev, "video"]);
      }
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleAIGenerateCopy = async () => {
    if (files.length === 0) {
      toast.error("Sube al menos una imagen o video primero");
      return;
    }
    setGeneratingCopy(true);
    try {
      // Upload first image temporarily to get a URL for AI analysis
      let imageContext = "";
      const firstFile = files[0];
      
      if (firstFile.type.startsWith("image/")) {
        // Convert to base64 for AI analysis
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(firstFile);
        });
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

  const handleUploadAndSave = async (saveAs: "draft" | "scheduled") => {
    if (!clinicId || files.length === 0) {
      toast.error("Sube al menos un archivo");
      return;
    }
    if (saveAs === "scheduled" && !scheduledDate) {
      toast.error("Selecciona fecha de publicación");
      return;
    }

    setUploading(true);
    try {
      // Upload files to storage
      const mediaUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const fileName = `${clinicId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("content-media")
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(fileName);
        mediaUrls.push(urlData.publicUrl);
      }

      const mediaType = files[0].type.startsWith("video/") ? "video" : "image";
      const scheduledAt = saveAs === "scheduled" && scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      await content.createPost({
        title: title || null,
        body: copy || null,
        media_urls: mediaUrls,
        media_type: mediaType,
        post_type: postFormat,
        status: saveAs === "scheduled" ? "scheduled" : "draft",
        platforms,
        hashtags: hashtags ? hashtags.split(/\s+/).filter(Boolean) : [],
        first_comment: firstComment || null,
        scheduled_at: scheduledAt,
        ai_generated: false,
      });

      toast.success(saveAs === "scheduled" ? "📅 Contenido programado" : "📝 Guardado como borrador");
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
    setFiles([]);
    setPreviews([]);
    setPostFormat("post");
    setPlatforms(["instagram"]);
    setCopy("");
    setTitle("");
    setHashtags("");
    setFirstComment("");
    setScheduledDate("");
    setScheduledTime("10:00");
  };

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
          {/* File upload area */}
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
                  <p className="text-xs text-muted-foreground mt-1">Imágenes (JPG, PNG, WebP) o Videos (MP4, MOV) • Máx 100MB</p>
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
                          <p className="text-[10px] text-muted-foreground absolute bottom-2">{files[idx]?.name}</p>
                        </div>
                      ) : (
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-border aspect-square flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

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

          {/* Platforms */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Plataformas</Label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    platforms.includes(p.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Título (opcional)</Label>
            <Input
              placeholder="Ej: Promoción de verano"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Copy / Texto</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIGenerateCopy}
                disabled={generatingCopy}
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
              >
                {generatingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingCopy ? "Generando..." : "Generar con IA"}
              </Button>
            </div>
            <Textarea
              placeholder="Escribe tu copy o deja que la IA lo genere..."
              className="min-h-[100px]"
              value={copy}
              onChange={e => setCopy(e.target.value)}
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Hashtags</Label>
            <Input
              placeholder="#marketing #negocio #estrategia"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
            />
          </div>

          {/* First comment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Primer comentario (opcional)</Label>
            <Input
              placeholder="Comentario para publicar junto al post"
              value={firstComment}
              onChange={e => setFirstComment(e.target.value)}
            />
          </div>

          {/* Schedule */}
          <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              Programar publicación (opcional)
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => handleUploadAndSave("draft")}
              variant="outline"
              className="flex-1 gap-2"
              disabled={uploading || files.length === 0}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              Guardar borrador
            </Button>
            <Button
              onClick={() => handleUploadAndSave("scheduled")}
              className="flex-1 gap-2 gradient-primary text-primary-foreground"
              disabled={uploading || files.length === 0}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {scheduledDate ? "Programar" : "Guardar y programar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadContentDialog;
