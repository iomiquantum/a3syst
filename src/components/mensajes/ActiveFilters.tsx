import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChip {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  filters: FilterChip[];
  onRemove: (key: string) => void;
}

const ActiveFilters = ({ filters, onRemove }: Props) => {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {filters.map(f => (
        <span
          key={f.key}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            f.color || "bg-muted text-muted-foreground"
          )}
        >
          {f.label}
          <button onClick={() => onRemove(f.key)} className="hover:text-foreground transition-colors">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
};

export default ActiveFilters;
