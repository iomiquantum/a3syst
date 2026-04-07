import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MessageSquare, CheckSquare, Square, Archive, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConversationCard from "./ConversationCard";
import ActiveFilters from "./ActiveFilters";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";

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

  // Sync external resets (e.g. filter clear)
  useEffect(() => {
    if (searchQuery !== localQuery) setLocalQuery(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Exit selection mode when conversations change significantly
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

  const handleBulkAction = async () => {
    if (!confirmAction || selectedIds.size === 0) return;
    setBulkLoading(true);

    const ids = Array.from(selectedIds);

    try {
      if (confirmAction === "archive") {
        const { error } = await (supabase as any)
          .from("conversations")
          .update({ archived: true })
          .in("id", ids);
        if (error) throw error;
        toast.success(`${ids.length} conversación(es) archivada(s)`);
      } else if (confirmAction === "delete") {
        // First delete related messages, then conversations
        const { error: msgErr } = await supabase
          .from("messages")
          .delete()
          .in("conversation_id", ids);
        if (msgErr) throw msgErr;

        const { error: histErr } = await supabase
          .from("conversation_pipeline_history")
          .delete()
          .in("conversation_id", ids);
        if (histErr) throw histErr;

        const { error } = await supabase
          .from("conversations")
          .delete()
          .in("id", ids);
        if (error) throw error;
        toast.success(`${ids.length} conversación(es) eliminada(s)`);
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
        <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center gap-2 shrink-0">
          <Checkbox
            checked={conversations.length > 0 && selectedIds.size === conversations.length}
            onCheckedChange={toggleAll}
            className="w-4 h-4"
          />
          <span className="text-xs text-muted-foreground flex-1">
            {selectedIds.size > 0
              ? `${selectedIds.size} de ${conversations.length} seleccionada(s)`
              : `Seleccionar todas (${conversations.length})`}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setConfirmAction("archive")}
              >
                <Archive className="w-3 h-3" />
                Archivar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setConfirmAction("delete")}
              >
                <Trash2 className="w-3 h-3" />
                Eliminar
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

      {/* Confirmation dialog */}
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
              {bulkLoading
                ? "Procesando..."
                : confirmAction === "archive"
                  ? "Sí, archivar"
                  : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MensajesConversationList;
