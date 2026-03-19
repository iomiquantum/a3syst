import { MessageSquare, Columns3, Bot } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "buzon" | "pipeline";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

const MensajesHeader = ({ viewMode, onViewModeChange }: Props) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          💬 Mensajes
        </h1>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
          <Bot className="w-3 h-3" /> Autopilot activo
        </span>
      </div>
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={v => v && onViewModeChange(v as ViewMode)}
        size="sm"
        className="border border-border rounded-md overflow-hidden gap-0"
      >
        <ToggleGroupItem value="buzon" className="px-3 py-1.5 text-xs gap-1.5 rounded-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <MessageSquare className="w-3.5 h-3.5" /> Buzón
        </ToggleGroupItem>
        <ToggleGroupItem value="pipeline" className="px-3 py-1.5 text-xs gap-1.5 rounded-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Columns3 className="w-3.5 h-3.5" /> Pipeline
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default MensajesHeader;
