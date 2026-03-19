import { Bot, Clock, MessageSquareOff, ThumbsDown, AlertTriangle, UserCheck, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeriodSelector, { Period } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { PipelineFilter } from "@/hooks/useConversationsByPipeline";
import type { PipelineTab } from "@/hooks/useClinicPipelineTabs";

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Clock, MessageSquareOff, ThumbsDown, AlertTriangle, UserCheck,
};

interface Props {
  activeTab: PipelineFilter;
  onTabChange: (t: PipelineFilter) => void;
  tabs: PipelineTab[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
}

const MensajesPipelineTabs = ({ activeTab, onTabChange, tabs, period, onPeriodChange, dateRange, onDateRangeChange }: Props) => {
  const escaladosCount = tabs.find(t => t.key === "escalados")?.count || 0;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <Tabs value={activeTab} onValueChange={v => onTabChange(v as PipelineFilter)} className="flex-1 min-w-0">
        <TabsList className="h-auto p-1 bg-muted/50 gap-0.5 flex-wrap">
          {tabs.map(t => {
            const IconComp = t.icon ? ICON_MAP[t.icon] : undefined;
            const isEscalado = t.key === "escalados" && escaladosCount > 0;
            return (
              <TabsTrigger key={t.key} value={t.key} className="px-2.5 py-1.5 text-[11px] gap-1 relative data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t.isTemplate && <Sparkles className="w-2.5 h-2.5 text-primary" />}
                {IconComp && <IconComp className="w-3 h-3" />}
                <span className="hidden sm:inline">{t.label}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold", t.color)}>
                  {t.count}
                </span>
                {isEscalado && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <PeriodSelector label="Pipeline" value={period} onChange={onPeriodChange} dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
    </div>
  );
};

export default MensajesPipelineTabs;
