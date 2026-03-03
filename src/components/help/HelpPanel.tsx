import { Lightbulb } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpModule } from "./helpContent";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  content: HelpModule | null;
  onStartTour: () => void;
}

const HelpPanel = ({ open, onClose, content, onStartTour }: HelpPanelProps) => {
  if (!content) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[350px] sm:w-[350px] bg-[#0d0d1a]/95 backdrop-blur-xl border-white/10 text-white overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-bold text-white">
            {content.emoji} {content.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pr-2">
          {/* What does it do */}
          <div>
            <h3 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-1.5">
              ¿Qué hace?
            </h3>
            <p className="text-sm text-white/70 leading-relaxed">{content.description}</p>
          </div>

          {/* How to use it */}
          <div>
            <h3 className="text-xs font-semibold text-[#A78BFA] uppercase tracking-wider mb-2">
              ¿Cómo usarlo?
            </h3>
            <ol className="space-y-2.5">
              {content.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/70">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-[#8B5CF6]/20 text-[#A78BFA] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {content.tips.length > 0 && (
            <div className="rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Tips</span>
              </div>
              {content.tips.map((tip, i) => (
                <p key={i} className="text-sm text-white/70 leading-relaxed">
                  {tip}
                </p>
              ))}
            </div>
          )}

          {/* Full tour button */}
          <Button
            variant="outline"
            className="w-full border-[#8B5CF6]/30 text-[#A78BFA] hover:bg-[#8B5CF6]/10 hover:text-white"
            onClick={() => {
              onClose();
              setTimeout(onStartTour, 300);
            }}
          >
            🎓 Ver tutorial completo de la app
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HelpPanel;
