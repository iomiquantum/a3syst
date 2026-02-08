import { useState } from "react";
import { Edit, Trash2, Clock, Pencil, RefreshCw, Loader2, Image as ImageIcon, Check, X } from "lucide-react";
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
  };
}

const ContentDraftsView = ({ content }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showPromptId, setShowPromptId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Borradores</h2>
        <p className="text-sm text-muted-foreground">Publicaciones guardadas como borrador — edita el copy o regenera imágenes</p>
      </div>

      {content.drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No tienes borradores</p>
          <p className="text-sm text-muted-foreground mt-1">Los borradores aparecerán aquí cuando guardes publicaciones sin programar</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {content.drafts.map(draft => {
            const isEditing = editingId === draft.id;
            const isRegenerating = regeneratingImageId === draft.id;
            const showingPrompt = showPromptId === draft.id;
            const hasImage = draft.media_urls && draft.media_urls.length > 0;

            return (
              <div key={draft.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)] text-xs">Borrador</Badge>
                    {draft.ai_generated && (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ IA</Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(draft.created_at), "dd MMM", { locale: es })}</span>
                </div>

                {/* Image */}
                {hasImage && (
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

                <div className="flex gap-2 pt-1">
                  {!isEditing && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => startEditing(draft)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar copy
                    </Button>
                  )}
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
    </div>
  );
};

export default ContentDraftsView;
