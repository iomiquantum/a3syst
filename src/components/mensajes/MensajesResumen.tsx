import { MessageSquare, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import PeriodSelector, { Period } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { MOCK_CONVERSATIONS } from "@/data/mockConversations";
import { useMemo } from "react";

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
}

const MensajesResumen = ({ period, onPeriodChange, dateRange, onDateRangeChange }: Props) => {
  const metrics = useMemo(() => {
    const all = MOCK_CONVERSATIONS;
    const respondidos = all.filter(c => c.pipelineTab === "resueltos_ia" || c.pipelineTab === "clientes").length;
    const escalados = all.filter(c => c.pipelineTab === "escalados").length;
    const convertidos = all.filter(c => c.pipelineTab === "clientes").length;
    const c1 = all.filter(c => c.pipelineTab === "seguimiento_c1").length;
    const c2 = all.filter(c => c.pipelineTab === "seguimiento_c2").length;
    const c3 = all.filter(c => c.pipelineTab === "seguimiento_c3").length;
    const noResp = all.filter(c => c.pipelineTab === "no_responden").length;
    return { respondidos, escalados, convertidos, c1, c2, c3, noResp };
  }, []);

  const cards = [
    { label: "Respondidos", sublabel: "clientes únicos", value: metrics.respondidos, icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-500/20", tooltip: "Cantidad de clientes distintos que recibieron al menos una respuesta (IA o humano) en el periodo seleccionado" },
    { label: "Escalados", sublabel: "a humano", value: metrics.escalados, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-500/20", tooltip: "Conversaciones escaladas a un agente humano" },
    { label: "Convertidos", sublabel: "nuevos clientes", value: metrics.convertidos, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/20", tooltip: "Contactos convertidos a clientes" },
    { label: "En seguimiento", sublabel: `C1: ${metrics.c1} / C2: ${metrics.c2} / C3: ${metrics.c3}`, value: metrics.c1 + metrics.c2 + metrics.c3, icon: Clock, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/20", tooltip: "Contactos en seguimiento automático" },
    { label: "No responden", sublabel: "", value: metrics.noResp, icon: XCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-500/20", tooltip: "Contactos sin respuesta después del seguimiento" },
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
                    <p className="text-base font-bold text-foreground leading-none">{c.value}</p>
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
