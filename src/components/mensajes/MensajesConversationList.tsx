import { useState, useEffect, useRef } from "react";
import { Search, MessageSquare, CheckSquare, Archive, Trash2, X, Tag, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConversationCard from "./ConversationCard";
import ActiveFilters from "./ActiveFilters";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";
import { useTagStats } from "@/hooks/useTagStats";

interface FilterChip {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  conversations: PipelineConversation[];
  selectedId: string | null;
  onSelect: (c: PipelineConversation) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilters: FilterChip[];
  onRemoveFilter: (key: string) => void;
  loading?: boolean;
  onBulkActionComplete?: () => void;
}

const DEBOUNCE_MS = 400;

const MensajesConversationList = ({ conversations, selectedId, onSelect, searchQuery, onSearchChange, activeFilters, onRemoveFilter, loading, onBulkActionComplete }: Props) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk tag state
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const { allTags } = useTagStats();

  // Bulk move pipeline state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedPipelineKey, setSelectedPipelineKey] = useState<string | null>(null);

  const pipelineOptions = EMBUDO_STAGES.filter(s => s.key !== "todos");

  useEffect(() => {
    if (searchQuery !== localQuery) setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (selectionMode) {
      setSelectedIds(prev => {
        const validIds = new Set<string>();
        prev.forEach(id => {
          if (conversations.some(c => c.id === id)) validIds.add(id);
        });
        return validIds;
      });
    }
  }, [conversations, selectionMode]);

  const handleChange = (value: string) => {
    setLocalQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearchChange(value), DEBOUNCE_MS);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const toggleCheck = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // ── Bulk archive / delete ──
  const handleBulkAction = async () => {
    if (!confirmAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "unknown";

      if (confirmAction === "archive") {
        const { error } = await (supabase as any)
          .from("conversations")
          .update({ archived: true })
          .in("id", ids);
        if (error) throw error;
        toast.success(`${ids.length} conversación(es) archivada(s)`);
      } else if (confirmAction === "delete") {
        const { data: convsToBackup, error: fetchConvErr } = await (supabase as any)
          .from("conversations")
          .select("*, contacts!conversations_contact_id_fkey(name, phone)")
          .in("id", ids);
        if (fetchConvErr) throw fetchConvErr;

        const { data: msgsToBackup, error: fetchMsgErr } = await supabase
          .from("messages").select("*").in("conversation_id", ids);
        if (fetchMsgErr) throw fetchMsgErr;

        const { data: histToBackup, error: fetchHistErr } = await supabase
          .from("conversation_pipeline_history").select("*").in("conversation_id", ids);
        if (fetchHistErr) throw fetchHistErr;

        const clinicId = convsToBackup?.[0]?.clinic_id;
        if (clinicId && convsToBackup) {
          const trashEntries = convsToBackup.map((conv: any) => ({
            clinic_id: clinicId,
            entity_type: "conversation",
            entity_id: conv.id,
            entity_name: conv.contacts?.name || conv.visitor_name || "Sin nombre",
            entity_data: {
              conversation: conv,
              messages: (msgsToBackup || []).filter((m: any) => m.conversation_id === conv.id),
              pipeline_history: (histToBackup || []).filter((h: any) => h.conversation_id === conv.id),
              deleted_by_user_id: userId,
              deleted_by_email: user?.email || "unknown",
              deleted_at_detail: new Date().toISOString(),
            },
            deleted_by: userId,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }));

          const { error: trashErr } = await supabase.from("clinic_trash").insert(trashEntries);
          if (trashErr) {
            console.error("Error creating backup:", trashErr);
            toast.warning("Backup parcial — algunos datos podrían no haberse respaldado");
          }
        }

        const { error: msgErr } = await supabase.from("messages").delete().in("conversation_id", ids);
        if (msgErr) throw msgErr;
        const { error: histErr } = await supabase.from("conversation_pipeline_history").delete().in("conversation_id", ids);
        if (histErr) throw histErr;
        const { error } = await supabase.from("conversations").delete().in("id", ids);
        if (error) throw error;
        toast.success(`${ids.length} conversación(es) eliminada(s) — backup guardado por 30 días`);
      }

      exitSelectionMode();
      onBulkActionComplete?.();
    } catch (err: any) {
      console.error("Bulk action error:", err);
      toast.error("Error al procesar la acción: " + (err.message || "Error desconocido"));
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
    }
  };

  // ── Bulk tag ──
  const handleBulkTag = async () => {
    if (selectedTagsForBulk.length === 0 || selectedIds.size === 0) return;
    setBulkLoading(true);

    const ids = Array.from(selectedIds);
    try {
      // Get contact_ids for the selected conversations
      const contactIds = conversations
        .filter(c => ids.includes(c.id))
        .map(c => c.contact_id)
        .filter(Boolean);

      const uniqueContactIds = [...new Set(contactIds)];

      // Fetch current tags for each contact
      const { data: contacts, error: fetchErr } = await supabase
        .from("contacts")
        .select("id, tags")
        .in("id", uniqueContactIds);
      if (fetchErr) throw fetchErr;

      // Update each contact's tags (merge, no duplicates)
      for (const contact of (contacts || [])) {
        const existing = (contact.tags as string[]) || [];
        const merged = [...new Set([...existing, ...selectedTagsForBulk])];
        const { error } = await supabase
          .from("contacts")
          .update({ tags: merged })
          .eq("id", contact.id);
        if (error) throw error;
      }

      toast.success(`Etiquetas aplicadas a ${uniqueContactIds.length} contacto(s)`);
      setShowTagDialog(false);
      setSelectedTagsForBulk([]);
      setNewTagInput("");
      exitSelectionMode();
      onBulkActionComplete?.();
    } catch (err: any) {
      console.error("Bulk tag error:", err);
      toast.error("Error al etiquetar: " + (err.message || "Error desconocido"));
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Bulk move pipeline ──
  const handleBulkMove = async () => {
    if (!selectedPipelineKey || selectedIds.size === 0) return;
    setBulkLoading(true);

    const ids = Array.from(selectedIds);
    try {
      const { error } = await (supabase as any)
        .from("conversations")
        .update({ pipeline_tab: selectedPipelineKey })
        .in("id", ids);
      if (error) throw error;

      const label = pipelineOptions.find(p => p.key === selectedPipelineKey)?.label || selectedPipelineKey;
      toast.success(`${ids.length} conversación(es) movida(s) a "${label}"`);
      setShowMoveDialog(false);
      setSelectedPipelineKey(null);
      exitSelectionMode();
      onBulkActionComplete?.();
    } catch (err: any) {
      console.error("Bulk move error:", err);
      toast.error("Error al mover: " + (err.message || "Error desconocido"));
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleBulkTag = (tag: string) => {
    setSelectedTagsForBulk(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addNewTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTagsForBulk.includes(trimmed)) {
      setSelectedTagsForBulk(prev => [...prev, trimmed]);
      setNewTagInput("");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 space-y-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, email o mensaje..."
              value={localQuery}
              onChange={e => handleChange(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className="h-8 px-2 shrink-0"
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            title={selectionMode ? "Cancelar selección" : "Seleccionar múltiples"}
          >
            {selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <ActiveFilters filters={activeFilters} onRemove={onRemoveFilter} />
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="px-3 py-2 border-b border-border bg-muted/50 flex flex-wrap items-center gap-2 shrink-0">
          <Checkbox
            checked={conversations.length > 0 && selectedIds.size === conversations.length}
            onCheckedChange={toggleAll}
            className="w-4 h-4"
          />
          <span className="text-xs text-muted-foreground flex-1 min-w-[100px]">
            {selectedIds.size > 0
              ? `${selectedIds.size} de ${conversations.length} seleccionada(s)`
              : `Seleccionar todas (${conversations.length})`}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setConfirmAction("archive")}>
                <Archive className="w-3 h-3" /> Archivar
              </Button>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" onClick={() => setConfirmAction("delete")}>
                <Trash2 className="w-3 h-3" /> Eliminar
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-300 dark:hover:bg-violet-500/10" onClick={() => { setSelectedTagsForBulk([]); setShowTagDialog(true); }}>
                <Tag className="w-3 h-3" /> Etiquetar
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-500/50 dark:text-blue-300 dark:hover:bg-blue-500/10" onClick={() => { setSelectedPipelineKey(null); setShowMoveDialog(true); }}>
                <ArrowUpDown className="w-3 h-3" /> Mover
              </Button>
            </div>
          )}
        </div>
      )}

      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay conversaciones en este filtro</p>
          </div>
        ) : (
          conversations.map(c => (
            <ConversationCard
              key={c.id}
              conversation={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c)}
              selectionMode={selectionMode}
              isChecked={selectedIds.has(c.id)}
              onToggleCheck={toggleCheck}
            />
          ))
        )}
      </ScrollArea>

      {/* Archive / Delete confirmation */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "archive"
                ? `¿Archivar ${selectedIds.size} conversación(es)?`
                : `¿Eliminar ${selectedIds.size} conversación(es)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "archive"
                ? "Las conversaciones archivadas no aparecerán en tus embudos activos. Podrás verlas activando el filtro de archivadas."
                : "Esta acción es irreversible. Se eliminarán las conversaciones y todos sus mensajes permanentemente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAction}
              disabled={bulkLoading}
              className={confirmAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkLoading ? "Procesando..." : confirmAction === "archive" ? "Sí, archivar" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-600" />
              Etiquetar {selectedIds.size} conversación(es)
            </DialogTitle>
            <DialogDescription>
              Las etiquetas se agregarán a los contactos de las conversaciones seleccionadas. Las etiquetas existentes se conservarán.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Selected tags */}
            {selectedTagsForBulk.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTagsForBulk.map(tag => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="text-xs gap-1 cursor-pointer bg-violet-600 hover:bg-violet-700"
                    onClick={() => toggleBulkTag(tag)}
                  >
                    {tag} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva etiqueta..."
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addNewTag())}
                className="h-8 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addNewTag} disabled={!newTagInput.trim()}>
                Agregar
              </Button>
            </div>

            {/* Existing tags */}
            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Etiquetas existentes:</p>
                <ScrollArea className="max-h-[180px]">
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTagsForBulk.includes(tag) ? "default" : "outline"}
                        className={`text-xs cursor-pointer transition-colors ${selectedTagsForBulk.includes(tag) ? "bg-violet-600 hover:bg-violet-700" : "hover:bg-violet-50 dark:hover:bg-violet-500/10"}`}
                        onClick={() => toggleBulkTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowTagDialog(false)} disabled={bulkLoading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkTag}
              disabled={bulkLoading || selectedTagsForBulk.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {bulkLoading ? "Aplicando..." : `Aplicar ${selectedTagsForBulk.length} etiqueta(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Pipeline Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              Mover {selectedIds.size} conversación(es) de embudo
            </DialogTitle>
            <DialogDescription>
              Selecciona la etapa del embudo a la que deseas mover las conversaciones seleccionadas. Esta acción es masiva e inmediata.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px] py-2">
            <div className="space-y-1">
              {pipelineOptions.map(stage => (
                <button
                  key={stage.key}
                  onClick={() => setSelectedPipelineKey(stage.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPipelineKey === stage.key
                      ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stage.color.split(" ")[0]}`} />
                  <span className="flex-1 text-left truncate">{stage.label}</span>
                  {selectedPipelineKey === stage.key && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowMoveDialog(false)} disabled={bulkLoading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkMove}
              disabled={bulkLoading || !selectedPipelineKey}
            >
              {bulkLoading ? "Moviendo..." : `Mover a "${pipelineOptions.find(p => p.key === selectedPipelineKey)?.label || "..."}"`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MensajesConversationList;
