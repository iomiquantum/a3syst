import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  lastCompletedS: number;
  nextS: number;
  currentTab: string;
  isRecurrente: boolean;
  recurrenteCount: number;
}

const PipelineProgressBar = ({ lastCompletedS, nextS, currentTab, isRecurrente, recurrenteCount }: Props) => {
  const getStatus = (index: number) => {
    if (index <= lastCompletedS) return "completed";
    if (index === nextS) return "current";
    return "pending";
  };

  const getLabel = () => {
    if (currentTab?.startsWith("seguimiento_s")) {
      const n = parseInt(currentTab.replace("seguimiento_s", ""));
      if (n >= 9) return `Esperando agente (S${n} manual)`;
      return `Enviando S${n}...`;
    }
    if (currentTab === "resueltos_ia" && nextS > 0) {
      if (nextS > 10) return "Ciclo completado";
      return `S${lastCompletedS} completado → Próximo: S${nextS}`;
    }
    return "";
  };

  return (
    <div className="flex flex-col gap-0.5" style={{ maxHeight: 30 }}>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-[3px]">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(index => {
            const status = getStatus(index);
            const isManual = index >= 9;
            const baseColor = isManual
              ? "bg-amber-500"
              : "bg-blue-500";
            const pendingColor = isManual
              ? "bg-amber-500/25"
              : "bg-blue-500/25";

            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "rounded-sm transition-all",
                      status === "completed" && baseColor,
                      status === "current" && cn(baseColor, "ring-1 ring-offset-1 ring-blue-400"),
                      status === "pending" && pendingColor
                    )}
                    style={{
                      width: 20,
                      height: status === "current" ? 6 : 4,
                      borderRadius: status === "current" ? 3 : 2,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] py-0.5 px-1.5">
                  S{index} — {status === "completed" ? "completado" : status === "current" ? "próximo" : "pendiente"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-muted-foreground">S1</span>
        <span className="text-[9px] text-muted-foreground">
          {getLabel()}
          {isRecurrente && (
            <span className="ml-1 text-emerald-600 font-medium">↻ Recurrente #{recurrenteCount}</span>
          )}
        </span>
        <span className="text-[8px] text-muted-foreground">S10</span>
      </div>
    </div>
  );
};

export default PipelineProgressBar;
