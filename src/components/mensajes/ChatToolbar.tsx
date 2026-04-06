import { useState, useRef } from "react";
import { Paperclip, Smile, BookmarkIcon, Sparkles, Wand2, Mic, MicOff, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useMarketingFragmentos } from "@/hooks/useMarketingFragmentos";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMOJIS = ["😊","👍","❤️","🙏","✅","⭐","🎉","💪","📌","🔥","😂","👏","💡","📞","📋","🏥","💊","🩺","📅","⏰"];

interface Props {
  onInsertText: (text: string, fromAI?: boolean) => void;
  onAttach?: (file: File) => void;
  conversationId: string;
  clinicId: string;
}

const ChatToolbar = ({ onInsertText, onAttach, conversationId, clinicId }: Props) => {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [snippetSearch, setSnippetSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { fragments, isLoading: fragmentsLoading, createFragment } = useMarketingFragmentos();

  const filteredFragments = fragments.filter(f =>
    !snippetSearch || f.name.toLowerCase().includes(snippetSearch.toLowerCase()) || f.content.toLowerCase().includes(snippetSearch.toLowerCase())
  );

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
      setAiPrompt("");
    }
  };

  const handleCreateFragment = () => {
    if (!newName.trim() || !newContent.trim()) return;
    createFragment.mutate({ name: newName.trim(), content: newContent.trim(), type: "respuesta_rapida", scope: "chat" });
    setNewName("");
    setNewContent("");
    setShowCreateForm(false);
  };

  const handleSelectFragment = (content: string) => {
    onInsertText(content);
    setSnippetsOpen(false);
    setSnippetSearch("");
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

        {/* Fragments / Quick replies */}
        <Popover open={snippetsOpen} onOpenChange={(open) => { setSnippetsOpen(open); if (!open) { setSnippetSearch(""); setShowCreateForm(false); } }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
                  <BookmarkIcon className="w-4 h-4" />
                  {fragments.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                      {fragments.length > 99 ? "99" : fragments.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Fragmentos / Respuestas rápidas</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-0" align="start" side="top">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold px-1">Fragmentos</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 text-primary"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  <Plus className="w-3 h-3" />
                  Crear
                </Button>
              </div>
              {fragments.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fragmento..."
                    value={snippetSearch}
                    onChange={e => setSnippetSearch(e.target.value)}
                    className="h-7 text-xs pl-7"
                  />
                </div>
              )}
            </div>

            {showCreateForm && (
              <div className="p-2 border-b border-border space-y-1.5 bg-muted/30">
                <Input
                  placeholder="Nombre del fragmento"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Textarea
                  placeholder="Contenido del fragmento... (puedes usar {{nombre}} para variables)"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="text-xs min-h-[50px] resize-none"
                  rows={2}
                />
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setShowCreateForm(false); setNewName(""); setNewContent(""); }}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="h-6 text-[10px]" disabled={!newName.trim() || !newContent.trim() || createFragment.isPending} onClick={handleCreateFragment}>
                    {createFragment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="max-h-[240px]">
              <div className="p-1">
                {fragmentsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFragments.length === 0 ? (
                  <div className="text-center py-6 px-3">
                    <BookmarkIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      {snippetSearch ? "Sin resultados" : "No hay fragmentos aún"}
                    </p>
                    {!snippetSearch && !showCreateForm && (
                      <Button variant="link" size="sm" className="text-[10px] h-6 mt-1" onClick={() => setShowCreateForm(true)}>
                        Crear tu primer fragmento
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredFragments.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFragment(f.content)}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-xs group"
                    >
                      <p className="font-medium text-foreground">{f.name}</p>
                      <p className="text-muted-foreground line-clamp-2 text-[11px]">{f.content}</p>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
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
                placeholder={isListening ? "🎤 Escuchando... habla y tu voz se convertirá en texto aquí" : "Ej: Respóndele que la cita es el jueves a las 3pm..."}
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
