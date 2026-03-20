import { cn } from "@/lib/utils";

const CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  resueltos_ia: { label: "IA", bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300" },
  seguimiento_s1: { label: "S1", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s2: { label: "S2", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s3: { label: "S3", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s4: { label: "S4", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s5: { label: "S5", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s6: { label: "S6", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s7: { label: "S7", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s8: { label: "S8", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  seguimiento_s9: { label: "S9", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  seguimiento_s10: { label: "S10", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  no_responden: { label: "No resp.", bg: "bg-red-100 dark:bg-red-500/20", text: "text-red-700 dark:text-red-300" },
  no_interesado: { label: "No inter.", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  escalados: { label: "Escalado", bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300" },
  agendados: { label: "Agendado", bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300" },
  no_show: { label: "No-show", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  show_sin_venta: { label: "Show s/v", bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300" },
  pacientes: { label: "Paciente", bg: "bg-teal-100 dark:bg-teal-500/20", text: "text-teal-700 dark:text-teal-300" },
  perdidos: { label: "Perdido", bg: "bg-pink-100 dark:bg-pink-500/20", text: "text-pink-700 dark:text-pink-300" },
};

interface Props {
  tab: string;
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
