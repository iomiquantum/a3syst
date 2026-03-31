import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMBUDO_STAGES } from "@/hooks/useClinicPipelineTabs";

const STAGES = EMBUDO_STAGES.filter(s => s.key !== "todos");

interface Props {
  pipelineTab: string;
  templateSlug: string | null;
  onMove: (tab: string, reason?: string, metadata?: Record<string, any>) => void;
  onGenerateAI?: () => void;
  appointmentDate?: string | null;
  hasBeenAgendado?: boolean;
}

const ClinicChatActions = ({ pipelineTab, onMove }: Props) => {
  return (
    <div className="flex items-center gap-1.5">
      <Select value={pipelineTab || "nuevos"} onValueChange={(val) => onMove(val, "Cambio manual de embudo")}>
        <SelectTrigger className="h-7 text-xs w-[160px]">
          <SelectValue placeholder="Mover a..." />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map(s => (
            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClinicChatActions;
