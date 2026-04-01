import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMarketingTags } from "@/hooks/useMarketingTags";
import { useTagStats } from "@/hooks/useTagStats";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#10B981", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#F97316", "#6B7280"];

const TagsTab = () => {
  const { tags, isLoading, createTag, deleteTag } = useMarketingTags();
  const { tags: contactTagStats } = useTagStats();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deletingTag = tags.find(t => t.id === deleteId);

  const handleCreate = () => {
    if (!name.trim()) return;
    createTag.mutate({ name: name.trim(), color }, { onSuccess: () => setName("") });
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Gestiona las etiquetas para organizar contactos</p>
      </div>

      <div className="flex items-center gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del tag" className="max-w-xs" onKeyDown={e => e.key === "Enter" && handleCreate()} />
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-9 h-9 rounded-md border border-input shrink-0" style={{ backgroundColor: color }} />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-md border-2 transition-all" style={{ backgroundColor: c, borderColor: c === color ? "hsl(var(--foreground))" : "transparent" }} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" onClick={handleCreate} disabled={!name.trim() || createTag.isPending}>+ Crear tag</Button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No hay tags personalizados. Crea tu primer tag.</p>
      ) : (
        <div className="space-y-1.5">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium text-foreground flex-1">{tag.name}</span>
              <button onClick={() => setDeleteId(tag.id)} className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contact tags in use */}
      {contactTagStats.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Etiquetas en uso en contactos</p>
          <div className="flex flex-wrap gap-2">
            {contactTagStats.map(t => (
              <Badge key={t.tag} variant="secondary" className="text-xs gap-1">
                {t.tag} <span className="text-muted-foreground font-normal">({t.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tag?</AlertDialogTitle>
            <AlertDialogDescription>¿Eliminar el tag "{deletingTag?.name}"? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteTag.mutate(deleteId); setDeleteId(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagsTab;
