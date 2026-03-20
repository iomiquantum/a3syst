import { cn } from "@/lib/utils";
import { Pin } from "lucide-react";
import PipelineBadge from "./PipelineBadge";
import InactivityTimer from "./InactivityTimer";
import ChannelIcon from "@/components/messaging/ChannelIcon";
import type { PipelineConversation, PipelineTab } from "@/hooks/useConversationsByPipeline";

interface Props {
  conversation: PipelineConversation;
  selected?: boolean;
  onClick: () => void;
  variant?: "list" | "kanban";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
}

function hashColor(name: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const ConversationCard = ({ conversation: c, selected, onClick, variant = "list" }: Props) => {
  if (variant === "kanban") {
    return (
      <div
        onClick={onClick}
        className="rounded-md border border-border bg-card p-3 cursor-pointer transition-all hover:shadow-md space-y-1.5"
      >
        <p className="text-sm font-medium text-foreground leading-tight truncate">{c.contactName}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{c.last_message_preview}</p>
        {/* S-tracking badges for kanban */}
        <div className="flex gap-1 flex-wrap">
          {c.seguimiento_responded_at_s > 0 && c.seguimiento_next_s > 0 && (
            <span className="text-[8px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
              Vino de S{c.seguimiento_responded_at_s} → S{c.seguimiento_next_s}
            </span>
          )}
          {c.seguimiento_is_recurrente && (
            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
              Recurrente #{c.seguimiento_recurrente_count}
            </span>
          )}
          {c.contactTags.slice(0, 2).map(t => (
            <span key={t} className="text-[8px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">{relativeTime(c.last_message_at)}</span>
          <ChannelIcon channel={c.channel} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border",
        selected && "bg-muted"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", hashColor(c.contactName))}>
          {getInitials(c.contactName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[13px] font-semibold text-foreground truncate flex items-center gap-1">
              {c.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
              {c.contactName}
            </p>
            <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(c.last_message_at)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{c.last_message_preview}</p>
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-1 flex-wrap items-center">
              {c.pipeline_tab === "resueltos_ia" && c.seguimiento_next_s > 0 ? (
                <span className="text-[8px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                  Vino de S{c.seguimiento_responded_at_s} → Próximo S{c.seguimiento_next_s}
                </span>
              ) : c.pipeline_tab === "resueltos_ia" ? (
                <span className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Nuevo</span>
              ) : null}
              {c.seguimiento_is_recurrente && (
                <span className="text-[8px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                  Recurrente #{c.seguimiento_recurrente_count}
                </span>
              )}
              {c.pipeline_tab === "resueltos_ia" && c.inactivity_timer_start && (
                <InactivityTimer
                  startTime={new Date(c.inactivity_timer_start)}
                  timeoutMinutes={15}
                />
              )}
              {c.contactTags.slice(0, 2).map(t => (
                <span key={t} className="text-[8px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
              ))}
            </div>
            <PipelineBadge tab={c.pipeline_tab} />
          </div>
        </div>
      </div>
    </button>
  );
};

export default ConversationCard;
