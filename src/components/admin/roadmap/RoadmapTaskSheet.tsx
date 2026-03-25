import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mic, MicOff, Send, Bot, Trash2, Copy, FileText } from "lucide-react";
import { ProjectTask, ProjectPhase, ProjectTaskNote, useUpdateTask, useDeleteTask, useCreateNote, useTaskNotes, statusLabel, priorityLabel } from "@/hooks/useProjectRoadmap";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Props {
  task: ProjectTask | null;
  phase: ProjectPhase | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "⏳ Pendiente" },
  { value: "in_progress", label: "🔄 En progreso" },
  { value: "testing", label: "🧪 Testing" },
  { value: "completed", label: "✅ Completado" },
  { value: "blocked", label: "🚫 Bloqueado" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "🔴 Crítica" },
  { value: "high", label: "🟠 Alta" },
  { value: "medium", label: "🟡 Media" },
  { value: "low", label: "🟢 Baja" },
];

export default function RoadmapTaskSheet({ task, phase, open, onOpenChange }: Props) {
  const [noteText, setNoteText] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState("");

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createNote = useCreateNote();
  const { data: notes, isLoading: notesLoading } = useTaskNotes(task?.id || null);

  const { isListening, toggleListening } = useVoiceInput({
    onResult: (text) => setNoteText((p) => (p ? p + " " + text : text)),
  });

  if (!task || !phase) return null;

  const handleStatusChange = (status: string) => {
    updateTask.mutate({ id: task.id, status });
  };

  const handlePriorityChange = (priority: string) => {
    updateTask.mutate({ id: task.id, priority });
  };

  const handleSendNote = () => {
    if (!noteText.trim()) return;
    createNote.mutate({ task_id: task.id, content: noteText.trim() }, {
      onSuccess: () => setNoteText(""),
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id, { onSuccess: () => onOpenChange(false) });
  };

  const handleSaveDesc = () => {
    updateTask.mutate({ id: task.id, description: descText });
    setEditingDesc(false);
  };

  // Parse checklist from description
  const descLines = (task.description || "").split("\n");
  const checklistItems = descLines.filter((l) => /^- \[[ x]\]/.test(l));
  const nonChecklistDesc = descLines.filter((l) => !/^- \[[ x]\]/.test(l)).join("\n").trim();

  const toggleChecklistItem = (idx: number) => {
    const newLines = [...descLines];
    const lineIdx = descLines.findIndex((l, i) => {
      const matchingItems = descLines.slice(0, i + 1).filter((ll) => /^- \[[ x]\]/.test(ll));
      return matchingItems.length === idx + 1;
    });
    if (lineIdx >= 0) {
      newLines[lineIdx] = newLines[lineIdx].includes("- [x]")
        ? newLines[lineIdx].replace("- [x]", "- [ ]")
        : newLines[lineIdx].replace("- [ ]", "- [x]");
      updateTask.mutate({ id: task.id, description: newLines.join("\n") });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-base">{task.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Fase {phase.phase_number}: {phase.name}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {/* Status & Priority */}
            <div className="flex gap-2">
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-1/2 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-1/2 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Descripción</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { setDescText(task.description || ""); setEditingDesc(!editingDesc); }}>
                  {editingDesc ? "Cancelar" : "Editar"}
                </Button>
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea value={descText} onChange={(e) => setDescText(e.target.value)} rows={6} className="text-xs" />
                  <Button size="sm" onClick={handleSaveDesc} className="h-7 text-xs">Guardar</Button>
                </div>
              ) : (
                <>
                  {nonChecklistDesc && <p className="text-xs text-foreground whitespace-pre-wrap">{nonChecklistDesc}</p>}
                  {!nonChecklistDesc && checklistItems.length === 0 && <p className="text-xs text-muted-foreground italic">Sin descripción</p>}
                </>
              )}
            </div>

            {/* Checklist */}
            {checklistItems.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Sub-tareas</span>
                <div className="mt-1 space-y-1">
                  {checklistItems.map((item, idx) => {
                    const checked = item.includes("- [x]");
                    const label = item.replace(/^- \[[ x]\]\s*/, "");
                    return (
                      <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                        <input type="checkbox" checked={checked} onChange={() => toggleChecklistItem(idx)} className="rounded" />
                        <span className={checked ? "line-through text-muted-foreground" : ""}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prompt ID */}
            {task.lovable_prompt_id && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Prompt asociado</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] font-mono">{task.lovable_prompt_id}</Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(task.lovable_prompt_id!); toast({ title: "Copiado" }); }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Notes */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Notas y Chat</span>
              <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                {notesLoading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
                {notes?.map((n) => (
                  <div key={n.id} className={`rounded-lg p-2 text-xs ${n.note_type === "status_change" ? "bg-muted/50 italic text-muted-foreground" : n.note_type === "ai_suggestion" ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium">
                        {n.note_type === "status_change" ? "🔄 Sistema" : n.note_type === "ai_suggestion" ? "🤖 IA" : "💬"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), "dd MMM HH:mm", { locale: es })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
                {notes?.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-2">Sin notas aún</p>}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Note input */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe una nota o instrucción..."
              rows={2}
              className="text-xs flex-1 min-h-[48px]"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
            />
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" className={`h-7 w-7 ${isRecording ? "text-destructive" : ""}`} onClick={toggleRecording}>
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </Button>
              <Button size="icon" className="h-7 w-7" onClick={handleSendNote} disabled={!noteText.trim() || createNote.isPending}>
                {createNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="h-7 text-[10px]" onClick={handleDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Eliminar tarea
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
