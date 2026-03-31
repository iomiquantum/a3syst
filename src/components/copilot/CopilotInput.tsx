import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface CopilotInputProps {
  onSend: (text: string, isVoice?: boolean) => void;
  disabled?: boolean;
}

const CopilotInput = ({ onSend, disabled }: CopilotInputProps) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onResult: (transcript) => {
      if (transcript.trim()) {
        onSend(transcript.trim(), true);
      }
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe o envía nota de voz..."
          disabled={disabled}
          className="flex-1 resize-none bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 min-h-[40px] max-h-[120px]"
          rows={1}
        />

        {isSupported && !text.trim() && (
          <button
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
              isListening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-label={isListening ? "Detener grabación" : "Grabar nota de voz"}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {text.trim() && (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
            aria-label="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CopilotInput;
