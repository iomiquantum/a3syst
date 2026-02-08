import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Image, Send, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentPost } from "@/hooks/useContentPosts";

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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState("post");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [saving, setSaving] = useState(false);

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    if (!body.trim()) return;
    setSaving(true);
    const data: Partial<ContentPost> = {
      title: title || undefined,
      body,
      post_type: postType,
      platforms,
      status,
      hashtags: hashtags ? hashtags.split(/[,\s]+/).filter(Boolean).map(h => h.startsWith("#") ? h : `#${h}`) : [],
      first_comment: firstComment || undefined,
    };
    if (status === "scheduled" && scheduledDate && scheduledTime) {
      data.scheduled_at = `${scheduledDate}T${scheduledTime}:00`;
    }
    await content.createPost(data);
    setSaving(false);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(""); setBody(""); setPostType("post"); setPlatforms(["instagram"]);
    setScheduledDate(""); setScheduledTime(""); setHashtags(""); setFirstComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Crear publicación</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
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
            <Input className="mt-1.5" placeholder="Título interno de la publicación" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Body */}
          <div>
            <Label className="text-sm font-medium">Texto de la publicación</Label>
            <Textarea className="mt-1.5 min-h-[140px]" placeholder="Escribe el contenido de tu publicación..." value={body} onChange={e => setBody(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{body.length} caracteres</p>
          </div>

          {/* Media placeholder */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Archivos multimedia</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
              <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Arrastra imágenes o videos aquí</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, MP4 — Máx. 50MB</p>
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <Label className="text-sm font-medium">Hashtags</Label>
            <Input className="mt-1.5" placeholder="#dental #salud #clinica" value={hashtags} onChange={e => setHashtags(e.target.value)} />
          </div>

          {/* First comment */}
          <div>
            <Label className="text-sm font-medium">Primer comentario (opcional)</Label>
            <Textarea className="mt-1.5 min-h-[60px]" placeholder="Agrega hashtags o texto adicional como primer comentario" value={firstComment} onChange={e => setFirstComment(e.target.value)} />
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
            <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleSubmit("draft")} disabled={saving || !body.trim()}>
              <Save className="w-4 h-4" /> Guardar borrador
            </Button>
            <Button className="flex-1 gap-1.5 gradient-primary text-primary-foreground" onClick={() => handleSubmit("scheduled")} disabled={saving || !body.trim() || !scheduledDate || !scheduledTime}>
              <Send className="w-4 h-4" /> Programar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
