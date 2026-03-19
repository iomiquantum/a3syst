import { cn } from "@/lib/utils";
import type { PipelineTab } from "@/data/mockConversations";

const CONFIG: Record<PipelineTab, { label: string; bg: string; text: string }> = {
  resueltos_ia: { label: "IA", bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300" },
  seguimiento_c1: { label: "C1", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_c2: { label: "C2", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_c3: { label: "C3", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  no_responden: { label: "No resp.", bg: "bg-red-100 dark:bg-red-500/20", text: "text-red-700 dark:text-red-300" },
  no_interesado: { label: "No inter.", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  escalados: { label: "Escalado", bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300" },
  clientes: { label: "Cliente", bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300" },
};

interface Props {
  tab: PipelineTab;
  className?: string;
}

const PipelineBadge = ({ tab, className }: Props) => {
  const c = CONFIG[tab] || CONFIG.resueltos_ia;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", c.bg, c.text, className)}>
      {c.label}
    </span>
  );
};

export default PipelineBadge;
