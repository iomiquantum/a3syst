import { Users, UserPlus, CalendarCheck, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import PeriodSelector, { Period } from "./PeriodSelector";
import TimeSlotSelector, { TimeSlot } from "./TimeSlotSelector";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResumenStats } from "@/hooks/usePipelineStats";

interface Props {
  stats: ResumenStats;
  loading?: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
  timeSlot: TimeSlot;
  onTimeSlotChange: (s: TimeSlot) => void;
  customStart?: string;
  customEnd?: string;
  onCustomTimeChange?: (start: string, end: string) => void;
  selectedDayOfWeek?: number;
  onDayOfWeekChange?: (day: number) => void;
}

const MensajesResumen = ({ stats, loading, period, onPeriodChange, dateRange, onDateRangeChange, timeSlot, onTimeSlotChange, customStart, customEnd, onCustomTimeChange }: Props) => {
  const cards = [
    { label: "Clientes únicos", value: stats.clientesUnicos, icon: Users, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-500/20", tooltip: "Contactos únicos que enviaron al menos un mensaje en el período" },
    { label: "Nuevos", value: stats.nuevosClientes, icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/20", tooltip: "Contactos cuya primera conversación inició en el período" },
    { label: "Agendados", value: stats.agendados, icon: CalendarCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20", tooltip: "Conversaciones movidas a Agendado en el período" },
    { label: "No responden", value: stats.noRespondieron, icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-500/20", tooltip: "Contactos en etapa 'No responden'" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TooltipProvider>
          <div className="flex items-center gap-4 flex-wrap">
            {cards.map(c => (
              <Tooltip key={c.label}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2.5 cursor-default">
                    <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                      <c.icon className={`w-4 h-4 ${c.color}`} />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-5 w-8" />
                      ) : (
                        <p className="text-base font-bold text-foreground leading-none">{c.value}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground mt-0.5">{c.label}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">{c.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2">
          <TimeSlotSelector
            value={timeSlot}
            onChange={onTimeSlotChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={onCustomTimeChange}
          />
          <PeriodSelector label="Resumen" value={period} onChange={onPeriodChange} dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
        </div>
      </div>
    </div>
  );
};

export default MensajesResumen;
