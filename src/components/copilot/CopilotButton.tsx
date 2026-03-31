import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopilot } from "@/hooks/useCopilot";
import { cn } from "@/lib/utils";

const CopilotButton = () => {
  const { isOpen, setIsOpen } = useCopilot();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
            isOpen
              ? "bg-primary/20 text-primary"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
          aria-label="Copiloto a3"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Copiloto a3</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default CopilotButton;
