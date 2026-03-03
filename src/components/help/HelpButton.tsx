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
      "bottom-6 right-6 w-12 h-12",
      "max-sm:bottom-4 max-sm:right-4 max-sm:w-10 max-sm:h-10"
    )}
  >
    <HelpCircle className="w-6 h-6 max-sm:w-5 max-sm:h-5" />
  </button>
);

export default HelpButton;
