import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, GraduationCap, Mic, MicOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  clinicId: string;
}

const FEEDBACK_TYPES = [
  { value: "general", label: "📝 Observación general" },
  { value: "wrong_stage", label: "🔀 Debió moverlo a otra etapa" },
  { value: "wrong_info", label: "❌ Información incorrecta" },
  { value: "tone", label: "💬 Tono/comunicación inadecuada" },
  { value: "missed_action", label: "⚡ Acción no ejecutada" },
];

const ChatTrainingDialog = ({ open, onOpenChange, conversationId, clinicId }: Props) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({
    onResult: (transcript) => {
      setFeedback(prev => prev + " " + transcript);
    },
  });

  const analyzeChat = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent-reply", {
        body: {
          conversation_id: conversationId,
          clinic_id: clinicId,
          triggered_by: "training_analysis",
          draft_only: true,
          custom_prompt: "MODO ENTRENAMIENTO: Analiza esta conversación completa y genera un reporte de mejora. Identifica: 1) Qué se hizo bien, 2) Qué se pudo hacer mejor, 3) En qué etapa debería estar el contacto, 4) Información que faltó dar, 5) Sugerencias específicas de respuesta. Sé directo y práctico. Usa emojis para hacerlo visual.",
        },
      });
      if (error) throw error;
      const analysis = data?.reply || data?.content || "No se pudo generar análisis";
      setAiAnalysis(analysis);
    } catch (e: any) {
      toast.error("Error analizando chat: " + (e.message || ""));
    } finally {
      setAnalyzing(false);
    }
  };

  const saveFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Escribe tu observación de entrenamiento");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("chat_training_feedback").insert({
        conversation_id: conversationId,
        clinic_id: clinicId,
        created_by: user?.id,
        feedback_text: feedback.trim(),
        ai_analysis: aiAnalysis,
        feedback_type: feedbackType,
      });
      if (error) throw error;
      toast.success("Entrenamiento guardado correctamente");
      setFeedback("");
      setAiAnalysis(null);
      setFeedbackType("general");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Error guardando: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-500" />
            Entrenar IA — Análisis de Chat
          </DialogTitle>
          <DialogDescription>
            Analiza esta conversación y entrena a la IA con tu feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={analyzeChat}
              disabled={analyzing}
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-violet-500" />}
              {analyzing ? "Analizando conversación..." : "🤖 Analizar chat con IA"}
            </Button>

            {aiAnalysis && (
              <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold mb-1">Análisis de la IA:</p>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tipo de observación" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Textarea
                placeholder="Escribe tu observación de entrenamiento... Ej: 'Aquí debió preguntar por la fecha preferida antes de ofrecer el precio'"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px] text-xs pr-10"
                rows={5}
              />
              {voiceSupported && (
                <div className="absolute right-2 bottom-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isListening ? "text-red-500 animate-pulse ring-2 ring-red-300" : "text-muted-foreground"}`}
                    onClick={toggleListening}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </Button>
                  {isListening && (
                    <span className="absolute -top-5 right-0 text-[9px] text-red-500 font-medium whitespace-nowrap">
                      🔴 Grabando...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={saveFeedback}
            disabled={saving || !feedback.trim()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Guardar entrenamiento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatTrainingDialog;
