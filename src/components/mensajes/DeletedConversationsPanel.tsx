import { useState, useEffect } from "react";
import { Trash2, Clock, User, MessageSquare, RotateCcw, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClinic } from "@/hooks/useClinic";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface TrashEntry {
  id: string;
  entity_name: string;
  entity_data: any;
  deleted_at: string;
  deleted_by: string;
  expires_at: string;
}

const DeletedConversationsPanel = ({ onRestore }: { onRestore?: () => void }) => {
  const { clinicId } = useClinic();
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchDeleted = async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clinic_trash")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("entity_type", "conversation")
      .order("deleted_at", { ascending: false });

    if (!error && data) {
      setEntries(data as TrashEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDeleted(); }, [clinicId]);

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoring(true);
    const entry = entries.find(e => e.id === restoreId);
    if (!entry) return;

    try {
      const { conversation, messages, pipeline_history } = entry.entity_data;

      // Remove backup-only fields before restoring
      const { contacts, ...convData } = conversation;
      // Re-insert conversation
      const { error: convErr } = await (supabase as any)
        .from("conversations")
        .insert({ ...convData, archived: false });
      if (convErr) throw convErr;

      // Re-insert messages
      if (messages && messages.length > 0) {
        const { error: msgErr } = await supabase
          .from("messages")
          .insert(messages);
        if (msgErr) console.error("Error restoring messages:", msgErr);
      }

      // Re-insert pipeline history
      if (pipeline_history && pipeline_history.length > 0) {
        const { error: histErr } = await supabase
          .from("conversation_pipeline_history")
          .insert(pipeline_history);
        if (histErr) console.error("Error restoring history:", histErr);
      }

      // Remove from trash
      await supabase.from("clinic_trash").delete().eq("id", restoreId);

      toast.success("Conversación restaurada correctamente");
      fetchDeleted();
      onRestore?.();
    } catch (err: any) {
      console.error("Restore error:", err);
      toast.error("Error al restaurar: " + (err.message || "Error desconocido"));
    } finally {
      setRestoring(false);
      setRestoreId(null);
    }
  };

  const getDaysLeft = (expiresAt: string) => {
    const days = differenceInDays(new Date(expiresAt), new Date());
    return Math.max(0, days);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-4 space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Conversaciones eliminadas</h3>
          <Badge variant="secondary" className="text-[10px]">{entries.length}</Badge>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <p className="text-[10px] text-muted-foreground">Se eliminan permanentemente después de 30 días</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <Trash2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No hay conversaciones eliminadas</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {entries.map(entry => {
              const daysLeft = getDaysLeft(entry.expires_at);
              const msgCount = entry.entity_data?.messages?.length || 0;
              const deletedByEmail = entry.entity_data?.deleted_by_email || "Desconocido";
              const contactPhone = entry.entity_data?.conversation?.contacts?.phone || "";
              const pipelineTab = entry.entity_data?.conversation?.pipeline_tab || "";

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.entity_name}</p>
                      {contactPhone && (
                        <p className="text-[11px] text-muted-foreground">{contactPhone}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1 shrink-0"
                      onClick={() => setRestoreId(entry.id)}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {msgCount} msg
                    </span>
                    {pipelineTab && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">{pipelineTab}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {deletedByEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.deleted_at), "dd MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>

                  <div className={`text-[10px] font-medium ${daysLeft <= 5 ? "text-destructive" : "text-amber-500"}`}>
                    ⏳ Se elimina en {daysLeft} día{daysLeft !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Restore confirmation */}
      <AlertDialog open={restoreId !== null} onOpenChange={(open) => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversación, sus mensajes y su historial serán restaurados al buzón principal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restaurando..." : "Sí, restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeletedConversationsPanel;
