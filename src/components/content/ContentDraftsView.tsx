import { Edit, Trash2, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ContentPost } from "@/hooks/useContentPosts";

interface Props {
  content: {
    drafts: ContentPost[];
    deletePost: (id: string) => Promise<boolean>;
    updatePost: (id: string, data: Partial<ContentPost>) => Promise<boolean>;
  };
}

const ContentDraftsView = ({ content }: Props) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Borradores</h2>
        <p className="text-sm text-muted-foreground">Publicaciones guardadas como borrador pendientes de completar</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.drafts.map(draft => (
            <div key={draft.id} className="bg-card border border-border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)] text-xs">Borrador</Badge>
                <span className="text-[10px] text-muted-foreground">{format(new Date(draft.created_at), "dd MMM", { locale: es })}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground line-clamp-1">{draft.title || "Sin título"}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{draft.body || "Sin contenido aún..."}</p>
              </div>
              {draft.platforms.length > 0 && (
                <div className="flex gap-1">
                  {draft.platforms.map(p => (
                    <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                  ))}
                </div>
              )}
              {draft.ai_generated && (
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">✨ Generado con IA</Badge>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
                  <Edit className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Programar
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => content.deletePost(draft.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentDraftsView;
