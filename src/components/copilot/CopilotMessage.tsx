import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopilotMessage as CopilotMessageType } from "@/contexts/CopilotContext";

interface CopilotMessageProps {
  message: CopilotMessageType;
}

const CopilotMessage = ({ message }: CopilotMessageProps) => {
  const isUser = message.role === "user";
  const time = message.timestamp.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  // Simple markdown rendering
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      processed = processed.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
      // Bullet points
      if (processed.startsWith("• ") || processed.startsWith("- ")) {
        processed = `<span class="ml-2">${processed}</span>`;
      }
      return (
        <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }} />
      );
    });
  };

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div className="max-w-[85%] space-y-1">
        <div
          className={cn(
            "px-3 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-[12px_12px_4px_12px]"
              : "bg-muted text-foreground rounded-[12px_12px_12px_4px]"
          )}
        >
          {message.isVoice && isUser && (
            <span className="text-xs opacity-70 flex items-center gap-1 mb-1">🎙 Nota de voz</span>
          )}
          {renderContent(message.content)}
        </div>
        <p className={cn("text-[10px] text-muted-foreground", isUser ? "text-right" : "text-left")}>
          {time}
        </p>
      </div>
    </div>
  );
};

export default CopilotMessage;
