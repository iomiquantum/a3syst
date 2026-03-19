import { Bot, Clock, MessageSquareOff, ThumbsDown, AlertTriangle, CalendarCheck, CalendarX2, UserX, HeartPulse, Archive, Inbox, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeriodSelector, { Period } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { PipelineFilter } from "@/hooks/useConversationsByPipeline";
import type { PipelineTab } from "@/hooks/useClinicPipelineTabs";
import { SEGUIMIENTO_SUB_FILTERS, AGENDADOS_SUB_FILTERS } from "@/hooks/useClinicPipelineTabs";

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Clock, MessageSquareOff, ThumbsDown, AlertTriangle,
  CalendarCheck, CalendarX: CalendarX2, UserX, HeartPulse, Archive, Inbox,
};

interface Props {
  activeTab: PipelineFilter;
  onTabChange: (t: PipelineFilter) => void;
  tabs: PipelineTab[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
  subFilter: string;
  onSubFilterChange: (f: string) => void;
  subFilterCounts: Record<string, number>;
}

const MensajesPipelineTabs = ({ activeTab, onTabChange, tabs, period, onPeriodChange, dateRange, onDateRangeChange, subFilter, onSubFilterChange, subFilterCounts }: Props) => {
  const escaladosCount = tabs.find(t => t.key === "escalados")?.count || 0;
  const showSeguimientoSubs = activeTab === "seguimiento_c1";
  const showAgendadosSubs = activeTab === "agendados";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={v => { onTabChange(v as PipelineFilter); onSubFilterChange("todos"); }} className="flex-1 min-w-0">
          <TabsList className="h-auto p-1 bg-muted/50 gap-0.5 flex-wrap overflow-x-auto">
            {tabs.map(t => {
              const IconComp = t.icon ? ICON_MAP[t.icon] : undefined;
              const isEscalado = t.key === "escalados" && escaladosCount > 0;
              return (
                <TabsTrigger key={t.key} value={t.key} className="px-2.5 py-1.5 text-[11px] gap-1 relative data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">
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

      {/* Sub-filters for Seguimiento */}
      {showSeguimientoSubs && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {SEGUIMIENTO_SUB_FILTERS.map(sf => {
            const count = subFilterCounts[`seg:${sf.key}`] || 0;
            const active = subFilter === sf.key;
            return (
              <button
                key={sf.key}
                onClick={() => onSubFilterChange(sf.key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0",
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"
                )}
              >
                {sf.label}
                {sf.badge && (
                  <span className={cn("px-1 py-0 rounded text-[8px] font-bold", sf.badgeColor)}>
                    {sf.badge}
                  </span>
                )}
                <span className="text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-filters for Agendados */}
      {showAgendadosSubs && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {AGENDADOS_SUB_FILTERS.map(sf => {
            const count = subFilterCounts[`ag:${sf.key}`] || 0;
            const active = subFilter === sf.key;
            return (
              <button
                key={sf.key}
                onClick={() => onSubFilterChange(sf.key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0",
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"
                )}
              >
                {sf.label}
                <span className="text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MensajesPipelineTabs;
