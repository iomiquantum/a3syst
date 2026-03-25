import { useState, useRef } from "react";
import { Paperclip, Smile, BookmarkIcon, Sparkles, Wand2, Mic, MicOff, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";

const EMOJIS = ["😊","👍","❤️","🙏","✅","⭐","🎉","💪","📌","🔥","😂","👏","💡","📞","📋","🏥","💊","🩺","📅","⏰"];

interface SavedSnippet {
  id: string;
  title: string;
  content: string;
}

interface Props {
  onInsertText: (text: string, fromAI?: boolean) => void;
  onAttach?: (file: File) => void;
  conversationId: string;
  clinicId: string;
}

const ChatToolbar = ({ onInsertText, onAttach, conversationId, clinicId }: Props) => {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"auto" | "prompt" | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Saved snippets (basic hardcoded for now, can be DB-driven later)
  const snippets: SavedSnippet[] = [
    { id: "1", title: "Saludo", content: "¡Hola! Gracias por comunicarse con nosotros. ¿En qué podemos ayudarle?" },
    { id: "2", title: "Horarios", content: "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00." },
    { id: "3", title: "Despedida", content: "¡Gracias por su confianza! Estamos a su disposición. Que tenga un excelente día." },
  ];

  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({
    onResult: (transcript) => {
      setAiPrompt(prev => prev + " " + transcript);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("El archivo no puede superar 10MB");
        return;
      }
      onAttach?.(file);
    }
    e.target.value = "";
  };

  const generateAIResponse = async (mode: "auto" | "prompt") => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-reply", {
        body: {
          conversation_id: conversationId,
          clinic_id: clinicId,
          triggered_by: "manual",
          draft_only: true,
          custom_prompt: mode === "prompt" ? aiPrompt.trim() : undefined,
        },
      });

      if (error) throw error;

      const reply = data?.reply || data?.content || "";
      if (reply) {
        onInsertText(reply, true);
        toast.success("Respuesta generada — revísala antes de enviar");
      } else {
        toast.error("No se pudo generar respuesta");
      }
    } catch (e: any) {
      toast.error(e.message || "Error generando respuesta IA");
    } finally {
      setAiLoading(false);
      setAiOpen(false);
      setAiMode(null);
      setAiPrompt("");
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        {/* Attachments */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => fileRef.current?.click()}>
              <Paperclip className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adjuntar archivo</TooltipContent>
        </Tooltip>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*,.pdf,.doc,.docx" />

        {/* Emojis */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Emojis</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start" side="top">
            <div className="grid grid-cols-5 gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => onInsertText(e)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-lg">
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Saved snippets */}
        <Popover open={snippetsOpen} onOpenChange={setSnippetsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <BookmarkIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Respuestas guardadas</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 p-2" align="start" side="top">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2 px-1">Fragmentos</p>
            <div className="space-y-1">
              {snippets.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onInsertText(s.content); setSnippetsOpen(false); }}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-xs"
                >
                  <p className="font-medium text-foreground">{s.title}</p>
                  <p className="text-muted-foreground truncate">{s.content}</p>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Response - auto context */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10"
              disabled={aiLoading}
              onClick={() => generateAIResponse("auto")}
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generar respuesta IA (auto)</TooltipContent>
        </Tooltip>

        {/* AI Response - with prompt */}
        <Popover open={aiOpen} onOpenChange={setAiOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                  disabled={aiLoading}
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Generar con instrucciones</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-72 p-3" align="start" side="top">
            <p className="text-xs font-semibold text-foreground mb-2">¿Qué quieres que responda la IA?</p>
            <div className="relative">
              <Textarea
                placeholder="Ej: Respóndele que la cita es el jueves a las 3pm..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="text-xs min-h-[60px] pr-10 resize-none"
                rows={3}
              />
              {voiceSupported && (
                <div className="absolute right-1 bottom-1 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 transition-all ${
                      isListening
                        ? "text-red-500 bg-red-50 dark:bg-red-500/10 ring-2 ring-red-300 ring-offset-1"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={toggleListening}
                    title={isListening ? "Detener grabación" : "Hablar con voz"}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </Button>
                  {isListening && (
                    <div className="flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Grabando...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAiOpen(false); setAiPrompt(""); }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={!aiPrompt.trim() || aiLoading}
                onClick={() => generateAIResponse("prompt")}
              >
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};

export default ChatToolbar;
