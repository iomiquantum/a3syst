import { useMessageQueue, type QueueItem } from "@/hooks/useMessageQueue";
import { Button } from "@/components/ui/button";
import { Clock, Send, RefreshCw, AlertTriangle, PenLine } from "lucide-react";

interface QueueBannerProps {
  conversationId: string;
  onWriteManually?: () => void;
}

function estimateWaitTime(item: QueueItem, totalPending: number): string {
  // Each message ≈ 7 sec, batches of 10 every 5 min
  const position = totalPending; // approximate
  if (position <= 10) return "< 2 min";
  if (position <= 20) return "~5 min";
  if (position <= 30) return "~10 min";
  return `~${Math.ceil(position / 12)} min`;
}

export function QueueBanner({ conversationId, onWriteManually }: QueueBannerProps) {
  const { queueItem, stats, cancelQueueItem, retryQueueItem } = useMessageQueue(conversationId);

  if (!queueItem) return null;

  const handleWriteManually = async () => {
    await cancelQueueItem(queueItem.id);
    onWriteManually?.();
  };

  const handleRetry = async () => {
    await retryQueueItem(queueItem.id);
  };

  if (queueItem.status === "pending") {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-muted bg-muted/30 px-3 py-2 text-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            ⏳ Mensaje S{queueItem.contact_number} en cola — Envío estimado: {estimateWaitTime(queueItem, stats.pending)}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleWriteManually}>
          <PenLine className="h-3 w-3" />
          Escribir manualmente
        </Button>
      </div>
    );
  }

  if (queueItem.status === "processing") {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm flex items-center gap-2">
        <Send className="h-4 w-4 shrink-0 text-primary animate-pulse" />
        <span className="text-primary">📤 Enviando S{queueItem.contact_number}...</span>
      </div>
    );
  }

  if (queueItem.status === "retry") {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2 text-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          <span>🔄 Reintentando S{queueItem.contact_number} (intento {queueItem.attempt_count} de {queueItem.max_attempts})</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleWriteManually}>
          <PenLine className="h-3 w-3" />
          Escribir manualmente
        </Button>
      </div>
    );
  }

  if (queueItem.status === "failed") {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>⚠️ No se pudo enviar S{queueItem.contact_number} — {queueItem.last_error || "Error desconocido"}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleRetry}>
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleWriteManually}>
            <PenLine className="h-3 w-3" />
            Escribir
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
