import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Image, Send, Save, Upload, X, Eye, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import type { ContentPost } from "@/hooks/useContentPosts";
import PostPreview from "./PostPreview";
import { usePublishToMeta } from "@/hooks/usePublishToMeta";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: {
    createPost: (data: Partial<ContentPost>) => Promise<any>;
  };
}

const platformOptions = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
];

const CreatePostDialog = ({ open, onOpenChange, content }: Props) => {
  const { clinicId } = useClinic();
  const { publishNow, publishing: publishingNow } = usePublishToMeta();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("post");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - mediaFiles.length);
    const validFiles = newFiles.filter(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} excede 50MB`); return false; }
      return true;
    });
    setMediaFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const url = URL.createObjectURL(f);
      setMediaPreviewUrls(prev => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviewUrls[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (mediaFiles.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of mediaFiles) {
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("content-media").upload(path, file);
      if (error) { toast.error(`Error subiendo ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("content-media").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (status: "draft" | "scheduled" | "publish_now") => {
    if (!body.trim() && mediaFiles.length === 0) return;
    setSaving(true);
    
    const urls = await uploadFiles();
    const parsedHashtags = hashtags ? hashtags.split(/[,\s]+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`) : [];
    
    const postStatus = status === "publish_now" ? "draft" : status;
    const data: Partial<ContentPost> = {
      title: title || undefined,
      body,
      post_type: postType,
      platforms,
      status: postStatus,
      media_urls: urls,
      media_type: mediaFiles.some(f => f.type.startsWith("video")) ? "video" : "image",
      hashtags: parsedHashtags,
      first_comment: firstComment || undefined,
    };
    if (status === "scheduled" && scheduledDate && scheduledTime) {
      data.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
    }
    const created = await content.createPost(data);
    
    // If publish now, immediately publish via Meta API
    if (status === "publish_now" && created?.id) {
      await publishNow(created.id);
    }
    
    setSaving(false);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(""); setBody(""); setPostType("post"); setPlatforms(["instagram"]);
    setScheduledDate(""); setScheduledTime(""); setHashtags(""); setFirstComment("");
    mediaPreviewUrls.forEach(u => URL.revokeObjectURL(u));
    setMediaFiles([]); setMediaPreviewUrls([]); setUploadedUrls([]);
    setActiveTab("editor");
  };

  const parsedHashtags = hashtags ? hashtags.split(/[,\s]+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`) : [];
  const allMediaUrls = [...uploadedUrls, ...mediaPreviewUrls];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Crear publicación</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5"><Eye className="w-3.5 h-3.5" /> Vista previa</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="space-y-5">
              {/* Platforms */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Compartir en</Label>
                <div className="flex gap-3">
                  {platformOptions.map(p => (
                    <label key={p.id} className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                      platforms.includes(p.id) ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <Checkbox checked={platforms.includes(p.id)} onCheckedChange={() => togglePlatform(p.id)} />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Post type */}
              <div>
                <Label className="text-sm font-medium">Tipo de contenido</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Publicación</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Historia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label className="text-sm font-medium">Título (opcional)</Label>
                <Input className="mt-1.5" placeholder="Título interno" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              {/* Body */}
              <div>
                <Label className="text-sm font-medium">Texto de la publicación</Label>
                <Textarea className="mt-1.5 min-h-[120px]" placeholder="Escribe el contenido..." value={body} onChange={e => setBody(e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{body.length} caracteres</p>
              </div>

              {/* Media upload */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Archivos multimedia</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={e => handleFilesSelected(e.target.files)}
                />
                {mediaPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {mediaPreviewUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        {mediaFiles[i]?.type.startsWith("video") ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
                >
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-sm text-muted-foreground">Haz clic o arrastra archivos aquí</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, MP4 — Máx. 50MB — {mediaFiles.length}/10</p>
                </button>
              </div>

              {/* Hashtags */}
              <div>
                <Label className="text-sm font-medium">Hashtags</Label>
                <Input className="mt-1.5" placeholder="#dental #salud #clinica" value={hashtags} onChange={e => setHashtags(e.target.value)} />
              </div>

              {/* First comment */}
              <div>
                <Label className="text-sm font-medium">Primer comentario (opcional)</Label>
                <Textarea className="mt-1.5 min-h-[60px]" placeholder="Texto adicional como primer comentario" value={firstComment} onChange={e => setFirstComment(e.target.value)} />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fecha</Label>
                  <Input type="date" className="mt-1.5" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Hora</Label>
                  <Input type="time" className="mt-1.5" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleSubmit("draft")} disabled={saving || uploading || publishingNow || (!body.trim() && mediaFiles.length === 0)}>
                  {saving && !publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Borrador
                </Button>
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleSubmit("scheduled")} disabled={saving || uploading || publishingNow || (!body.trim() && mediaFiles.length === 0) || !scheduledDate || !scheduledTime}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Programar
                </Button>
                <Button className="flex-1 gap-1.5 gradient-primary text-primary-foreground" onClick={() => handleSubmit("publish_now")} disabled={saving || uploading || publishingNow || (!body.trim() && mediaFiles.length === 0) || platforms.length === 0}>
                  {publishingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} {publishingNow ? "Publicando..." : "Publicar ahora"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Así se verá tu publicación en cada plataforma:</p>
              <div className="flex flex-wrap gap-6 justify-center">
                {platforms.includes("instagram") && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Instagram</p>
                    <PostPreview platform="instagram" body={body} mediaUrls={allMediaUrls} hashtags={parsedHashtags} />
                  </div>
                )}
                {platforms.includes("facebook") && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Facebook</p>
                    <PostPreview platform="facebook" body={body} mediaUrls={allMediaUrls} hashtags={parsedHashtags} />
                  </div>
                )}
              </div>
              {!platforms.includes("instagram") && !platforms.includes("facebook") && (
                <p className="text-center text-sm text-muted-foreground py-8">Selecciona Facebook o Instagram para ver la vista previa</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
