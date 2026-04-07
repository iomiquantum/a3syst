import { useState, useRef, useEffect } from "react";
import { Upload, Image, Video, Sparkles, Loader2, CalendarDays, X, FileUp, Zap, Maximize2, ChevronRight, ChevronLeft, Check, RefreshCw, Eye } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const postFormats = [
  { value: "post", label: "Post / Feed", icon: Image, desc: "Imagen o carrusel en el feed principal" },
  { value: "story", label: "Historia / Story", icon: FileUp, desc: "Contenido vertical de 24h" },
  { value: "reel", label: "Reel / Video corto", icon: Video, desc: "Video corto vertical hasta 90s" },
];

const platformOptions = [
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "facebook", label: "Facebook", emoji: "📘" },
];

const hashtagOptions = [
  { value: "with", label: "Con hashtags" },
  { value: "without", label: "Sin hashtags" },
];

const sizesByPlatform: Record<string, { category: string; sizes: { label: string; ratio: string; value: string; w: number; h: number }[] }[]> = {
  instagram: [
    { category: "Feed (Posts)", sizes: [
      { label: "Feed vertical", ratio: "4:5", value: "ig-feed-v", w: 1080, h: 1350 },
      { label: "Feed cuadrado", ratio: "1:1", value: "ig-feed-sq", w: 1080, h: 1080 },
      { label: "Feed landscape", ratio: "1.91:1", value: "ig-feed-h", w: 1200, h: 628 },
    ]},
    { category: "Stories & Reels", sizes: [
      { label: "Story / Reel", ratio: "9:16", value: "ig-story", w: 1080, h: 1920 },
    ]},
  ],
  facebook: [
    { category: "Feed (Posts)", sizes: [
      { label: "Feed vertical", ratio: "4:5", value: "fb-feed-v", w: 1080, h: 1350 },
      { label: "Feed cuadrado", ratio: "1:1", value: "fb-feed-sq", w: 1080, h: 1080 },
      { label: "Feed horizontal", ratio: "1.91:1", value: "fb-feed-h", w: 1200, h: 630 },
    ]},
    { category: "Stories & Reels", sizes: [
      { label: "Story / Reel", ratio: "9:16", value: "fb-story", w: 1080, h: 1920 },
    ]},
  ],
};

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB max for Instagram compatibility

const compressImage = (file: File, maxBytes: number = MAX_IMAGE_SIZE_BYTES): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("video/") || file.size <= maxBytes) {
      resolve(file);
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let quality = 0.85;
      const canvas = document.createElement("canvas");
      // Scale down if very large
      let { width, height } = img;
      const maxDim = 2048;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      // Iteratively lower quality until under maxBytes
      let blob: Blob | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
        if (blob && blob.size <= maxBytes) break;
        quality -= 0.15;
      }
      if (!blob) { resolve(file); return; }
      const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
      console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB`);
      resolve(compressed);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to get base64 from a URL (for resized images stored as URLs)
const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const STEPS = [
  { id: 1, title: "Subir archivo", desc: "Sube tu imagen o video" },
  { id: 2, title: "Formato y redes", desc: "Elige formato y plataformas" },
  { id: 3, title: "Copy y hashtags", desc: "Genera o escribe tu texto" },
  { id: 4, title: "Personalizar", desc: "Ajusta por plataforma" },
  { id: 5, title: "Publicar", desc: "Programa o publica" },
];

const UploadContentDialog = ({ open, onOpenChange, content }: Props) => {
  const { clinicId } = useClinic();
  const { publishNow, publishing: publishingNow } = usePublishToMeta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const platformFileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [postFormat, setPostFormat] = useState("post");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [copy, setCopy] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [hashtagMode, setHashtagMode] = useState<"with" | "without">("with");
  const [firstComment, setFirstComment] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Per-platform
  const [customPerPlatform, setCustomPerPlatform] = useState(false);
  const [platformCopy, setPlatformCopy] = useState<Record<string, string>>({});
  const [platformFiles, setPlatformFiles] = useState<Record<string, File[]>>({});
  const [platformPreviews, setPlatformPreviews] = useState<Record<string, string[]>>({});
  const [platformFileTarget, setPlatformFileTarget] = useState<string>("");

  // Resize
  const [resizingPlatform, setResizingPlatform] = useState<string | null>(null);
  const [resizeSize, setResizeSize] = useState<Record<string, string>>({});
  const [resizingShared, setResizingShared] = useState(false);
  const [sharedResizeSize, setSharedResizeSize] = useState("");

  // Regenerating per-platform copy
  const [regeneratingCopy, setRegeneratingCopy] = useState<string | null>(null);

  // Sync platform images/previews from main files whenever customPerPlatform is enabled or files change
  useEffect(() => {
    if (customPerPlatform && (files.length > 0 || previews.length > 0)) {
      const newPF: Record<string, File[]> = {};
      const newPP: Record<string, string[]> = {};
      for (const p of platforms) {
        // Always sync to the latest main files/previews (including resized ones)
        if (!platformFiles[p]?.length || platformPreviews[p]?.[0] !== previews[0]) {
          newPF[p] = [...files];
          newPP[p] = [...previews];
        }
      }
      if (Object.keys(newPF).length > 0) {
        setPlatformFiles(prev => ({ ...prev, ...newPF }));
        setPlatformPreviews(prev => ({ ...prev, ...newPP }));
      }
    }
  }, [customPerPlatform, files, previews]);

  // Auto-generate per-platform copy when enabling customization
  useEffect(() => {
    if (customPerPlatform && copy) {
      const newCopies: Record<string, string> = {};
      for (const p of platforms) {
        if (!platformCopy[p]) {
          newCopies[p] = copy;
        }
      }
      if (Object.keys(newCopies).length > 0) {
        setPlatformCopy(prev => ({ ...prev, ...newCopies }));
      }
    }
  }, [customPerPlatform]);

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
    setPlatformFiles(prev => ({ ...prev, [platformFileTarget]: valid }));
    const newPreviews: string[] = [];
    let loaded = 0;
    valid.forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          newPreviews.push(ev.target?.result as string);
          loaded++;
          if (loaded === valid.length) {
            setPlatformPreviews(prev => ({ ...prev, [platformFileTarget]: newPreviews }));
          }
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push("video");
        loaded++;
        if (loaded === valid.length) {
          setPlatformPreviews(prev => ({ ...prev, [platformFileTarget]: newPreviews }));
        }
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

  const handleAIGenerateCopy = async (targetPlatform?: string) => {
    const sourceFiles = targetPlatform ? (platformFiles[targetPlatform] || files) : files;
    if (sourceFiles.length === 0) {
      toast.error("Sube al menos una imagen o video primero");
      return;
    }
    if (targetPlatform) setRegeneratingCopy(targetPlatform);
    else setGeneratingCopy(true);

    try {
      let imageDataUrl: string | null = null;
      const firstFile = sourceFiles[0];
      if (firstFile?.type.startsWith("image/")) {
        imageDataUrl = await fileToBase64(firstFile);
      }

      const hashtagInstruction = hashtagMode === "with"
        ? "Incluye hashtags relevantes y populares en el campo 'hashtags'."
        : "NO incluyas hashtags. Deja el campo 'hashtags' vacío.";

      const platformName = targetPlatform || platforms[0] || "instagram";
      const charLimit = platformName === "instagram" ? "2200 caracteres máximo. Las primeras 125 son las más importantes (se ven antes del 'más')" : "Sin límite estricto, pero 40-80 palabras funcionan mejor";

      const prompt = `Analiza la imagen adjunta y genera el MEJOR copy vendedor para ${platformName === "instagram" ? "Instagram" : "Facebook"} (${postFormat === "post" ? "post de feed" : postFormat === "story" ? "historia/story" : "reel/video corto"}).
${title ? `Contexto del usuario: ${title}` : ""}

INSTRUCCIONES DE PLATAFORMA (${platformName}):
- Límite de copy: ${charLimit}
- Gancho irresistible en la primera línea (pregunta, dato impactante o promesa)
- Emojis estratégicos (no excesivos)
- Llamada a la acción clara al final
- Tono profesional pero cercano
- ${hashtagInstruction}
- Primer comentario: estratégico para engagement

Analiza DETALLADAMENTE la imagen: elementos visuales, colores, texto visible, productos, personas, ambiente.

Responde SOLO en JSON:
{"title": "título corto basado en la imagen", "body": "copy vendedor optimizado para ${platformName}", "hashtags": "#hashtag1 #hashtag2 ...", "firstComment": "primer comentario estratégico"}`;

      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: {
          prompt,
          tone: "Profesional",
          platform: platformName,
          type: "copy",
          imageDataUrl: imageDataUrl || undefined,
          action_label: targetPlatform ? `Copy optimizado ${platformName}` : "Análisis de imagen + copy",
        },
      });
      if (error) throw error;
      const text = data?.content || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (targetPlatform) {
            setPlatformCopy(prev => ({ ...prev, [targetPlatform]: parsed.body || text }));
            toast.success(`✨ Copy regenerado para ${platformName}`);
          } else {
            setCopy(parsed.body || text);
            if (hashtagMode === "with" && parsed.hashtags) setHashtags(parsed.hashtags);
            if (hashtagMode === "without") setHashtags("");
            if (parsed.firstComment) setFirstComment(parsed.firstComment);
            if (parsed.title) setTitle(parsed.title);
            toast.success("✨ Contenido generado analizando tu imagen");
          }
        } else {
          if (targetPlatform) setPlatformCopy(prev => ({ ...prev, [targetPlatform]: text }));
          else setCopy(text);
        }
      } catch {
        if (targetPlatform) setPlatformCopy(prev => ({ ...prev, [targetPlatform]: text }));
        else setCopy(text);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generando copy con IA");
    } finally {
      setGeneratingCopy(false);
      setRegeneratingCopy(null);
    }
  };

  const handleResizeImage = async (platform: string, isShared = false) => {
    const sizeKey = isShared ? sharedResizeSize : (resizeSize[platform] || "");
    if (!sizeKey) { toast.error("Selecciona un tamaño"); return; }

    const allSizes = (sizesByPlatform[platform] || sizesByPlatform["instagram"])?.flatMap(c => c.sizes) || [];
    const selectedSize = allSizes.find(s => s.value === sizeKey);
    if (!selectedSize) return;

    // Get image data - try File first, then fall back to preview URL
    const sourceFiles = isShared ? files : (platformFiles[platform] || files);
    const sourcePreviews = isShared ? previews : (platformPreviews[platform] || previews);
    
    let imageDataUrl: string | null = null;
    
    if (sourceFiles?.length > 0 && sourceFiles[0]?.type?.startsWith("image/")) {
      imageDataUrl = await fileToBase64(sourceFiles[0]);
    } else if (sourcePreviews?.length > 0 && sourcePreviews[0] && sourcePreviews[0] !== "video") {
      // Preview is either a data URL or a public URL from a previous resize
      const previewUrl = sourcePreviews[0];
      if (previewUrl.startsWith("data:")) {
        imageDataUrl = previewUrl;
      } else {
        try {
          imageDataUrl = await urlToBase64(previewUrl);
        } catch (e) {
          console.error("Error converting URL to base64:", e);
        }
      }
    }

    if (!imageDataUrl) {
      toast.error("No hay imagen para redimensionar");
      return;
    }

    if (isShared) setResizingShared(true);
    else setResizingPlatform(platform);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: {
          prompt: `Redimensiona esta imagen al formato ${selectedSize.label} (${selectedSize.w}x${selectedSize.h}, ratio ${selectedSize.ratio}). Mantén la composición, textos y elementos visuales adaptándolos al nuevo formato. NO agregues nuevos elementos.`,
          platform: platform === "instagram" ? "Instagram" : "Facebook",
          type: "image",
          width: selectedSize.w,
          height: selectedSize.h,
          sizeLabel: selectedSize.label,
          imageModel: "pro",
          referenceImageUrl: imageDataUrl,
          action_label: `Redimensionar a ${selectedSize.label}`,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const resizedFile = new File([blob], `resized-${platform}-${Date.now()}.png`, { type: "image/png" });
        if (isShared) {
          setFiles([resizedFile]);
          setPreviews([data.imageUrl]);
        } else {
          setPlatformFiles(prev => ({ ...prev, [platform]: [resizedFile] }));
          setPlatformPreviews(prev => ({ ...prev, [platform]: [data.imageUrl] }));
        }
        toast.success(`✅ Imagen redimensionada a ${selectedSize.label}`);
      } else {
        toast.error("No se pudo redimensionar");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al redimensionar");
    } finally {
      setResizingPlatform(null);
      setResizingShared(false);
    }
  };

  const uploadFilesToStorage = async (filesToUpload: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop();
      const fileName = `${clinicId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("content-media").upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(fileName);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (action: "draft" | "scheduled" | "publish_now") => {
    if (!clinicId) return;
    const hasFiles = files.length > 0 || (customPerPlatform && Object.values(platformFiles).some(f => f.length > 0));
    if (!hasFiles) { toast.error("Sube al menos un archivo"); return; }
    if (action === "scheduled" && !scheduledDate) { toast.error("Selecciona fecha"); return; }
    if (platforms.length === 0) { toast.error("Selecciona al menos una plataforma"); return; }

    const finalHashtags = hashtagMode === "with" && hashtags ? hashtags.split(/\s+/).filter(Boolean) : [];
    setUploading(true);

    try {
      if (customPerPlatform) {
        for (const platform of platforms) {
          const pFiles = platformFiles[platform]?.length > 0 ? platformFiles[platform] : files;
          const pCopy = platformCopy[platform] || copy;
          if (pFiles.length === 0 && !pCopy) continue;
          const mediaUrls = pFiles.length > 0 ? await uploadFilesToStorage(pFiles) : [];
          const mediaType = pFiles[0]?.type.startsWith("video/") ? "video" : "image";
          const scheduledAt = action === "scheduled" && scheduledDate ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
          const postStatus = action === "publish_now" ? "draft" : action;
          const created = await content.createPost({
            title: title || null, body: pCopy || null, media_urls: mediaUrls, media_type: mediaType,
            post_type: postFormat, status: postStatus, platforms: [platform],
            hashtags: finalHashtags, first_comment: firstComment || null, scheduled_at: scheduledAt, ai_generated: false,
          });
          if (action === "publish_now" && created?.id) await publishNow(created.id);
        }
      } else {
        const mediaUrls = await uploadFilesToStorage(files);
        const mediaType = files[0]?.type.startsWith("video/") ? "video" : "image";
        const scheduledAt = action === "scheduled" && scheduledDate ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null;
        const postStatus = action === "publish_now" ? "draft" : action;
        const created = await content.createPost({
          title: title || null, body: copy || null, media_urls: mediaUrls, media_type: mediaType,
          post_type: postFormat, status: postStatus, platforms,
          hashtags: finalHashtags, first_comment: firstComment || null, scheduled_at: scheduledAt, ai_generated: false,
        });
        if (action === "publish_now" && created?.id) await publishNow(created.id);
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
    setStep(1); setFiles([]); setPreviews([]); setPostFormat("post"); setPlatforms(["instagram", "facebook"]);
    setCopy(""); setTitle(""); setHashtags(""); setHashtagMode("with"); setFirstComment("");
    setScheduledDate(""); setScheduledTime("10:00");
    setCustomPerPlatform(false); setPlatformCopy({}); setPlatformFiles({}); setPlatformPreviews({});
    setResizeSize({}); setSharedResizeSize("");
  };

  const isProcessing = uploading || publishingNow || resizingPlatform !== null || resizingShared;

  const canProceed = () => {
    switch (step) {
      case 1: return files.length > 0;
      case 2: return platforms.length > 0;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const goNext = () => { if (canProceed() && step < 5) setStep(step + 1); };
  const goBack = () => { if (step > 1) setStep(step - 1); };

  // If only 1 platform selected, skip step 4
  const effectiveSteps = platforms.length > 1 ? STEPS : STEPS.filter(s => s.id !== 4);
  const nextStep = () => {
    if (step === 3 && platforms.length <= 1) setStep(5);
    else goNext();
  };
  const prevStep = () => {
    if (step === 5 && platforms.length <= 1) setStep(3);
    else goBack();
  };

  // All platform sizes flat for shared resize
  const sharedSizes = platforms.length > 0 ? (sizesByPlatform[platforms[0]] || []) : [];

  // Get current format label
  const currentFormatLabel = postFormats.find(f => f.value === postFormat)?.label || postFormat;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Subir contenido propio
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-2">
          {effectiveSteps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => { if (s.id <= step) setStep(s.id); }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all w-full justify-center",
                  step === s.id ? "bg-primary text-primary-foreground" :
                  step > s.id ? "bg-primary/20 text-primary cursor-pointer" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="w-3 h-3" /> : <span>{s.id}</span>}
                <span className="hidden sm:inline truncate">{s.title}</span>
              </button>
              {i < effectiveSteps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold">Sube tu imagen o video</h3>
                <p className="text-sm text-muted-foreground mt-1">Selecciona el contenido visual que quieres publicar en tus redes sociales</p>
              </div>

              {files.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-primary/30 rounded-xl p-12 flex flex-col items-center gap-4 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Haz clic para seleccionar archivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Imágenes (JPG, PNG) o Videos (MP4) • Máx 100MB</p>
                    <p className="text-xs text-muted-foreground">Puedes subir hasta 10 archivos</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-border aspect-square shadow-sm">
                        {preview === "video" ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="w-10 h-10 text-muted-foreground" />
                            <p className="absolute bottom-2 text-xs text-muted-foreground">{files[idx]?.name}</p>
                          </div>
                        ) : (
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => removeFile(idx)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {files.length < 10 && (
                      <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border-2 border-dashed border-border aspect-square flex flex-col items-center justify-center gap-1 hover:border-primary/40 transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Agregar más</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            </div>
          )}

          {/* ── STEP 2: Format & Platforms ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold">Elige formato y plataformas</h3>
                <p className="text-sm text-muted-foreground mt-1">Selecciona el tipo de contenido y dónde quieres publicarlo</p>
              </div>

              {/* Formato */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Formato de publicación</Label>
                <div className="grid grid-cols-3 gap-3">
                  {postFormats.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setPostFormat(f.value)}
                      className={cn(
                        "p-4 rounded-xl border text-center transition-all",
                        postFormat === f.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <f.icon className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs font-semibold">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plataformas */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">¿Dónde quieres publicar?</Label>
                <div className="flex gap-3">
                  {platformOptions.map(p => (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      className={cn(
                        "flex-1 p-3 rounded-xl border text-center transition-all",
                        platforms.includes(p.value)
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/30 text-muted-foreground"
                      )}
                    >
                      <span className="text-2xl">{p.emoji}</span>
                      <p className="text-sm font-medium mt-1">{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of image in each platform */}
              {previews.length > 0 && previews[0] !== "video" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Vista previa</Label>
                  <div className="flex gap-4 justify-center">
                    {platforms.map(p => (
                      <div key={p} className="space-y-1.5">
                        <p className="text-xs font-semibold text-center text-muted-foreground uppercase">{p}</p>
                        <div className={cn(
                          "rounded-lg overflow-hidden border border-border bg-muted shadow-sm",
                          postFormat === "story" || postFormat === "reel" ? "w-24 h-[170px]" :
                          postFormat === "post" ? "w-36 h-36" : "w-36 h-36"
                        )}>
                          <img src={previews[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shared resize */}
                  {files[0]?.type.startsWith("image/") && (
                    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">¿Quieres redimensionar la imagen al tamaño ideal?</p>
                      <div className="flex items-center gap-2">
                        <Select value={sharedResizeSize} onValueChange={setSharedResizeSize}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Elegir tamaño..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sharedSizes.map(cat => (
                              <div key={cat.category}>
                                <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{cat.category}</p>
                                {cat.sizes.map(s => (
                                  <SelectItem key={s.value} value={s.value} className="text-xs">
                                    {s.label} ({s.w}×{s.h}) — {s.ratio}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-8 shrink-0" onClick={() => handleResizeImage(platforms[0], true)} disabled={resizingShared || !sharedResizeSize}>
                          {resizingShared ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          {resizingShared ? "..." : "Redimensionar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Copy & Hashtags ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold">Escribe o genera tu copy</h3>
                <p className="text-sm text-muted-foreground mt-1">La IA analiza tu imagen y crea el mejor texto vendedor, o escríbelo tú mismo</p>
              </div>

              {/* AI button - ABOVE title */}
              <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" /> Generar con IA</p>
                    <p className="text-xs text-muted-foreground">La IA analiza tu imagen y genera título, copy, hashtags y primer comentario</p>
                  </div>
                  <Button onClick={() => handleAIGenerateCopy()} disabled={generatingCopy || files.length === 0} className="gap-1.5 text-xs">
                    {generatingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generatingCopy ? "Analizando..." : "Generar"}
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Título interno (opcional)</Label>
                <Input placeholder="Ej: Promoción de verano — solo para ti, no se publica" value={title} onChange={e => setTitle(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Este título es solo para organizar tu contenido, no se publica</p>
              </div>

              {/* Copy */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Copy / Texto de la publicación</Label>
                <Textarea
                  placeholder="Escribe tu copy aquí o usa el botón 'Generar con IA' para que la IA lo cree por ti..."
                  className="min-h-[120px]"
                  value={copy}
                  onChange={e => setCopy(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground text-right">{copy.length} caracteres</p>
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Hashtags</Label>
                  <Select value={hashtagMode} onValueChange={(v: "with" | "without") => {
                    setHashtagMode(v);
                    // Only clear hashtags, don't change anything else
                    if (v === "without") setHashtags("");
                  }}>
                    <SelectTrigger className="w-[150px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {hashtagOptions.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hashtagMode === "with" && (
                  <Input placeholder="#marketing #negocio #estrategia" value={hashtags} onChange={e => setHashtags(e.target.value)} />
                )}
              </div>

              {/* First comment */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Primer comentario (opcional)</Label>
                <Input placeholder="Comentario estratégico para engagement" value={firstComment} onChange={e => setFirstComment(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Se publica automáticamente como el primer comentario debajo de tu post</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Personalize per Platform ── */}
          {step === 4 && platforms.length > 1 && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold">Personaliza por plataforma</h3>
                <p className="text-sm text-muted-foreground mt-1">Usa la misma imagen y copy para ambas redes, o personaliza cada una</p>
              </div>

              {/* Format badge */}
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  {postFormat === "post" ? <Image className="w-3 h-3" /> : postFormat === "story" ? <FileUp className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                  Formato: {currentFormatLabel}
                </Badge>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Personalizar por plataforma</p>
                  <p className="text-xs text-muted-foreground">Imagen y copy diferente para cada red social</p>
                </div>
                <Switch checked={customPerPlatform} onCheckedChange={setCustomPerPlatform} />
              </div>

              {!customPerPlatform && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 text-center space-y-2">
                  <Check className="w-8 h-8 text-primary mx-auto" />
                  <p className="text-sm font-medium">Se usará la misma imagen y copy para todas las plataformas</p>
                  <p className="text-xs text-muted-foreground">Activa "Personalizar" si quieres ajustar el contenido para cada red</p>
                </div>
              )}

              {customPerPlatform && platforms.map(platform => {
                const platformSizes = sizesByPlatform[platform] || [];
                const isResizing = resizingPlatform === platform;
                const isRegenerating = regeneratingCopy === platform;
                const pPreviews = platformPreviews[platform] || previews;

                return (
                  <div key={platform} className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {platform === "facebook" ? "📘 Facebook" : "📸 Instagram"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {currentFormatLabel}
                      </Badge>
                    </div>

                    {/* Platform image */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Imagen para {platform}</Label>
                      {pPreviews.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-2">
                            {pPreviews.map((preview, idx) => (
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

                          {/* Resize */}
                          {(pPreviews[0] && pPreviews[0] !== "video") && (
                            <div className="flex items-center gap-2">
                              <Select value={resizeSize[platform] || ""} onValueChange={v => setResizeSize(prev => ({ ...prev, [platform]: v }))}>
                                <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Redimensionar..." /></SelectTrigger>
                                <SelectContent>
                                  {platformSizes.map(cat => (
                                    <div key={cat.category}>
                                      <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{cat.category}</p>
                                      {cat.sizes.map(s => (
                                        <SelectItem key={s.value} value={s.value} className="text-xs">
                                          {s.label} ({s.w}×{s.h}) — {s.ratio}
                                        </SelectItem>
                                      ))}
                                    </div>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 shrink-0" onClick={() => handleResizeImage(platform)} disabled={isResizing || !resizeSize[platform]}>
                                {isResizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                {isResizing ? "..." : "Redimensionar"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setPlatformFileTarget(platform); platformFileInputRef.current?.click(); }}
                          className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 hover:border-primary/40 transition-all cursor-pointer"
                        >
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Subir archivo para {platform}</p>
                        </button>
                      )}
                    </div>

                    {/* Platform copy */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Copy para {platform}</Label>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-primary" onClick={() => handleAIGenerateCopy(platform)} disabled={isRegenerating}>
                          {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Regenerar
                        </Button>
                      </div>
                      <Textarea
                        placeholder={`Copy optimizado para ${platform}...`}
                        className="min-h-[80px] text-sm"
                        value={platformCopy[platform] || ""}
                        onChange={e => setPlatformCopy(prev => ({ ...prev, [platform]: e.target.value }))}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {platform === "instagram" ? "Recomendado: 125-2200 caracteres. Las primeras 125 son clave." : "Recomendado: 40-80 palabras para mejor engagement."}
                      </p>
                    </div>
                  </div>
                );
              })}

              <input ref={platformFileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handlePlatformFileSelect} />
            </div>
          )}

          {/* ── STEP 5: Publish ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="text-center pb-2">
                <h3 className="text-base font-semibold">¡Todo listo! ¿Cómo quieres publicar?</h3>
                <p className="text-sm text-muted-foreground mt-1">Elige si publicar ahora, programar o guardar como borrador</p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Plataformas</p>
                    <div className="flex gap-1 mt-0.5">
                      {platforms.map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">{p === "instagram" ? "📸 IG" : "📘 FB"}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Formato</p>
                    <p className="font-medium">{currentFormatLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Archivos</p>
                    <p className="font-medium">{files.length} archivo{files.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Personalizado</p>
                    <p className="font-medium">{customPerPlatform ? "Sí, por plataforma" : "Mismo para todas"}</p>
                  </div>
                </div>
                {copy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Copy</p>
                    <p className="text-sm mt-0.5 line-clamp-3">{copy}</p>
                  </div>
                )}
              </div>

              {/* Publish Now - Primary action */}
              <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Publicar ahora</p>
                    <p className="text-xs text-muted-foreground">Se publicará inmediatamente en {platforms.map(p => p === "instagram" ? "Instagram" : "Facebook").join(" y ")}</p>
                  </div>
                </div>
                <Button onClick={() => handleSubmit("publish_now")} className="w-full gap-2 gradient-primary text-primary-foreground" disabled={isProcessing || platforms.length === 0}>
                  {publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {publishingNow ? "Publicando en redes..." : "🚀 Publicar ahora"}
                </Button>
              </div>

              {/* Schedule - Secondary */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Programar publicación
                </Label>
                <p className="text-xs text-muted-foreground">Elige fecha y hora para que se publique automáticamente</p>
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
                <Button onClick={() => handleSubmit("scheduled")} variant="outline" className="w-full gap-2" disabled={isProcessing || !scheduledDate}>
                  {uploading && !publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                  📅 Programar para {scheduledDate ? new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "..."}
                </Button>
              </div>

              {/* Draft - Tertiary */}
              <Button onClick={() => handleSubmit("draft")} variant="ghost" className="w-full gap-2 text-muted-foreground" disabled={isProcessing}>
                {uploading && !publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                Guardar como borrador (no publicar)
              </Button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="ghost" onClick={prevStep} disabled={step === 1} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <p className="text-xs text-muted-foreground">Paso {effectiveSteps.findIndex(s => s.id === step) + 1} de {effectiveSteps.length}</p>
          {step < 5 ? (
            <Button onClick={nextStep} disabled={!canProceed()} className="gap-1.5">
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadContentDialog;
