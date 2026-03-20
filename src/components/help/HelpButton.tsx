import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  onClick: () => void;
}

const HelpButton = ({ onClick }: HelpButtonProps) => (
  <button
    onClick={onClick}
    aria-label="Ayuda del módulo"
    className={cn(
      "fixed z-[9999] rounded-full bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30",
      "flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
      "top-20 right-4 w-10 h-10",
      "max-sm:top-16 max-sm:right-3 max-sm:w-9 max-sm:h-9"
    )}
  >
    <HelpCircle className="w-6 h-6 max-sm:w-5 max-sm:h-5" />
  </button>
);

export default HelpButton;
