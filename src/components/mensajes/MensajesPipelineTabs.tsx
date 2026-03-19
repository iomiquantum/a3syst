import { Bot, Clock, MessageSquareOff, ThumbsDown, AlertTriangle, UserCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PeriodSelector, { Period } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { PipelineTab, MockConversation } from "@/data/mockConversations";

export type PipelineFilter = "todos" | PipelineTab;

const TABS: { value: PipelineFilter; label: string; icon?: React.ElementType; badgeColor: string }[] = [
  { value: "todos", label: "Todos", badgeColor: "bg-muted text-muted-foreground" },
  { value: "resueltos_ia", label: "Resueltos IA", icon: Bot, badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  { value: "seguimiento_c1", label: "Seguimiento", icon: Clock, badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  { value: "no_responden", label: "No responden", icon: MessageSquareOff, badgeColor: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  { value: "no_interesado", label: "No interesado", icon: ThumbsDown, badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  { value: "escalados", label: "Escalados", icon: AlertTriangle, badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
  { value: "clientes", label: "Clientes", icon: UserCheck, badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
];

interface Props {
  activeTab: PipelineFilter;
  onTabChange: (t: PipelineFilter) => void;
  conversations: MockConversation[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
}

function getCount(conversations: MockConversation[], tab: PipelineFilter): number {
  if (tab === "todos") return conversations.length;
  if (tab === "seguimiento_c1") return conversations.filter(c => c.pipelineTab === "seguimiento_c1" || c.pipelineTab === "seguimiento_c2" || c.pipelineTab === "seguimiento_c3").length;
  return conversations.filter(c => c.pipelineTab === tab).length;
}

const MensajesPipelineTabs = ({ activeTab, onTabChange, conversations, period, onPeriodChange, dateRange, onDateRangeChange }: Props) => {
  const escaladosCount = conversations.filter(c => c.pipelineTab === "escalados").length;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <Tabs value={activeTab} onValueChange={v => onTabChange(v as PipelineFilter)} className="flex-1 min-w-0">
        <TabsList className="h-auto p-1 bg-muted/50 gap-0.5 flex-wrap">
          {TABS.map(t => {
            const count = getCount(conversations, t.value);
            const isEscalado = t.value === "escalados" && escaladosCount > 0;
            return (
              <TabsTrigger key={t.value} value={t.value} className="px-2.5 py-1.5 text-[11px] gap-1 relative data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {t.icon && <t.icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{t.label}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold", t.badgeColor)}>
                  {count}
                </span>
                {isEscalado && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
