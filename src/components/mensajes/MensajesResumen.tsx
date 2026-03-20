import { MessageSquare, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import PeriodSelector, { Period } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";

interface ResumenStats {
  respondidos: number;
  escalados: number;
  convertidos: number;
  seguimiento: { total: number; s1_s4: number; s5_s6: number };
  noResponden: number;
}

interface Props {
  stats: ResumenStats;
  loading?: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
}

const MensajesResumen = ({ stats, loading, period, onPeriodChange, dateRange, onDateRangeChange }: Props) => {
  const cards = [
    { label: "Respondidos", sublabel: "clientes únicos", value: stats.respondidos, icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-500/20", tooltip: "Cantidad de clientes distintos que recibieron al menos una respuesta (IA o humano)" },
    { label: "Escalados", sublabel: "a humano", value: stats.escalados, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-500/20", tooltip: "Conversaciones escaladas a un agente humano" },
    { label: "Convertidos", sublabel: "nuevos clientes", value: stats.convertidos, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/20", tooltip: "Contactos convertidos a clientes" },
    { label: "En seguimiento", sublabel: `Auto: ${stats.seguimiento.s1_s4} / Manual: ${stats.seguimiento.s5_s6}`, value: stats.seguimiento.total, icon: Clock, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20", tooltip: "Contactos en seguimiento automático (S1-S4) y manual (S5-S6)" },
    { label: "No responden", sublabel: "", value: stats.noResponden, icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-500/20", tooltip: "Contactos sin respuesta después del seguimiento" },
  ];

  return (
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
                    <p className="text-[9px] text-muted-foreground mt-0.5">{c.sublabel || c.label}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">{c.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <PeriodSelector label="Resumen" value={period} onChange={onPeriodChange} dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
    </div>
  );
};

export default MensajesResumen;
