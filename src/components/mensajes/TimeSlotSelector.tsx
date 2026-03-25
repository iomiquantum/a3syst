import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TimeSlot = "all" | "morning" | "afternoon" | "night" | "custom";

interface Props {
  value: TimeSlot;
  onChange: (slot: TimeSlot) => void;
  customStart?: string;
  customEnd?: string;
  onCustomChange?: (start: string, end: string) => void;
}

const TIME_SLOT_CONFIG: Record<Exclude<TimeSlot, "custom">, { label: string; start: string; end: string }> = {
  all: { label: "Todo el día", start: "00:00", end: "23:59" },
  morning: { label: "🌅 Mañana", start: "06:00", end: "11:59" },
  afternoon: { label: "☀️ Tarde", start: "12:00", end: "17:59" },
  night: { label: "🌙 Noche", start: "18:00", end: "05:59" },
};

const TimeSlotSelector = ({ value, onChange, customStart, customEnd, onCustomChange }: Props) => {
  const [open, setOpen] = useState(false);
  const currentLabel = value === "custom"
    ? `⏰ ${customStart || "00:00"} — ${customEnd || "23:59"}`
    : TIME_SLOT_CONFIG[value].label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {currentLabel}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-1.5">
          {(Object.keys(TIME_SLOT_CONFIG) as Exclude<TimeSlot, "custom">[]).map(slot => (
            <button
              key={slot}
              onClick={() => { onChange(slot); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                value === slot ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="font-medium">{TIME_SLOT_CONFIG[slot].label}</span>
              {slot !== "all" && (
                <span className="text-[10px] opacity-70 ml-1">
                  ({TIME_SLOT_CONFIG[slot].start} - {TIME_SLOT_CONFIG[slot].end})
                </span>
              )}
            </button>
          ))}

          <div className="border-t border-border pt-2 mt-2">
            <button
              onClick={() => onChange("custom")}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                value === "custom" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              ⏰ Personalizado
            </button>
            {value === "custom" && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <div className="flex-1">
                  <Label className="text-[10px]">Desde</Label>
                  <Input
                    type="time"
                    value={customStart || "00:00"}
                    onChange={(e) => onCustomChange?.(e.target.value, customEnd || "23:59")}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px]">Hasta</Label>
                  <Input
                    type="time"
                    value={customEnd || "23:59"}
                    onChange={(e) => onCustomChange?.(customStart || "00:00", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimeSlotSelector;

export function getTimeSlotHours(slot: TimeSlot, customStart?: string, customEnd?: string): { startHour: number; startMin: number; endHour: number; endMin: number } {
  if (slot === "custom" && customStart && customEnd) {
    const [sh, sm] = customStart.split(":").map(Number);
    const [eh, em] = customEnd.split(":").map(Number);
    return { startHour: sh, startMin: sm, endHour: eh, endMin: em };
  }
  const config: Record<string, { startHour: number; startMin: number; endHour: number; endMin: number }> = {
    all: { startHour: 0, startMin: 0, endHour: 23, endMin: 59 },
    morning: { startHour: 6, startMin: 0, endHour: 11, endMin: 59 },
    afternoon: { startHour: 12, startMin: 0, endHour: 17, endMin: 59 },
    night: { startHour: 18, startMin: 0, endHour: 5, endMin: 59 },
  };
  return config[slot] || config.all;
}
