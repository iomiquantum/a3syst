import { useEffect, useRef } from "react";
import { Sparkles, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopilot } from "@/hooks/useCopilot";
import CopilotMessage from "./CopilotMessage";
import CopilotInput from "./CopilotInput";

const CopilotPanel = () => {
  const {
    isOpen,
    setIsOpen,
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    pageSubtitle,
    quickSuggestions,
  } = useCopilot();

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasUserMessages = messages.some(m => m.role === "user");

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 bottom-0 z-40 flex flex-col bg-background border-l border-border",
          "w-full lg:w-[400px]",
          "top-14", // below header
          "animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Copiloto a3</span>
                  <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    EN LÍNEA
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{pageSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasUserMessages && (
                <button
                  onClick={clearMessages}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Limpiar conversación"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.map(msg => (
            <CopilotMessage key={msg.id} message={msg} />
          ))}

          {/* Thinking indicator */}
          {isLoading && (
            <div className="flex gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-[12px_12px_12px_4px] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Pensando</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick suggestions - only show when no user messages */}
          {!hasUserMessages && quickSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {quickSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <CopilotInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </>
  );
};

export default CopilotPanel;
