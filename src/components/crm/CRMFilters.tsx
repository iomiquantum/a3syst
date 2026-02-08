import { useState } from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

export type DatePreset = "todos" | "hoy" | "ayer" | "semana" | "mes" | "personalizado";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface AgentOption {
  id: string;
  name: string;
}

interface Props {
  datePreset: DatePreset;
  dateRange: DateRange;
  agentFilter: string;
  agents: AgentOption[];
  showAgentFilter: boolean;
  onDatePresetChange: (preset: DatePreset) => void;
  onDateRangeChange: (range: DateRange) => void;
  onAgentChange: (agentId: string) => void;
}

const presets: { value: DatePreset; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "personalizado", label: "Calendario" },
];

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "hoy":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "ayer":
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case "semana":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "mes":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: undefined, to: undefined };
  }
}

const CRMFilters = ({
  datePreset,
  dateRange,
  agentFilter,
  agents,
  showAgentFilter,
  onDatePresetChange,
  onDateRangeChange,
  onAgentChange,
}: Props) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePreset = (preset: DatePreset) => {
    onDatePresetChange(preset);
    if (preset !== "personalizado") {
      onDateRangeChange(getDateRangeFromPreset(preset));
    }
  };

  const dateLabel =
    datePreset === "personalizado" && dateRange.from
      ? dateRange.to
        ? `${format(dateRange.from, "d MMM", { locale: es })} - ${format(dateRange.to, "d MMM", { locale: es })}`
        : format(dateRange.from, "d MMM yyyy", { locale: es })
      : undefined;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date preset chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              if (p.value === "personalizado") {
                setCalendarOpen(true);
                handlePreset("personalizado");
              } else {
                handlePreset(p.value);
              }
            }}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              datePreset === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {p.value === "personalizado" ? (
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {dateLabel || p.label}
              </span>
            ) : (
              p.label
            )}
          </button>
        ))}

        {/* Calendar popover for custom range */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <span />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={(range) => {
                onDateRangeChange({ from: range?.from, to: range?.to });
                if (range?.from && range?.to) {
                  setCalendarOpen(false);
                }
              }}
              numberOfMonths={2}
              locale={es}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Agent filter (only for admins) */}
      {showAgentFilter && agents.length > 0 && (
        <Select value={agentFilter} onValueChange={onAgentChange}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <SelectValue placeholder="Todos los agentes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los agentes</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default CRMFilters;
