import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

export type Period = "hoy" | "ayer" | "semana" | "mes" | "rango";

interface Props {
  label: string;
  value: Period;
  onChange: (p: Period) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (r: DateRange | undefined) => void;
}

const PeriodSelector = ({ label, value, onChange, dateRange, onDateRangeChange }: Props) => {
  const [calOpen, setCalOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <ToggleGroup type="single" value={value} onValueChange={v => v && onChange(v as Period)} size="sm" className="gap-0 border border-border rounded-md overflow-hidden">
          {(["hoy", "ayer", "semana", "mes", "rango"] as Period[]).map(p => (
            <ToggleGroupItem key={p} value={p} className="px-2.5 py-1 text-[10px] font-medium rounded-none data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {p === "hoy" ? "Hoy" : p === "ayer" ? "Ayer" : p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Rango"}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {value === "rango" && (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
              <CalendarDays className="w-3 h-3" />
              {dateRange?.from
                ? `${format(dateRange.from, "dd MMM", { locale: es })} - ${dateRange.to ? format(dateRange.to, "dd MMM", { locale: es }) : "..."}`
                : "Seleccionar rango"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" selected={dateRange} onSelect={r => { onDateRangeChange?.(r); if (r?.to) setCalOpen(false); }} locale={es} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default PeriodSelector;
