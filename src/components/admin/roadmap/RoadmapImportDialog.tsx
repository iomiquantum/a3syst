import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Eye, Upload } from "lucide-react";
import { useBulkCreatePhases, useBulkCreateTasks, ProjectPhase } from "@/hooks/useProjectRoadmap";

interface ParsedPhase {
  name: string;
  phase_number: number;
  tasks: { title: string; description: string }[];
}

function parseMarkdown(md: string): ParsedPhase[] {
  const lines = md.split("\n");
  const phases: ParsedPhase[] = [];
  let currentPhase: ParsedPhase | null = null;
  let phaseNum = 0;

  for (const line of lines) {
    // Match ### or ## headings as phases
    const phaseMatch = line.match(/^#{2,3}\s+(.+)/);
    if (phaseMatch) {
      currentPhase = { name: phaseMatch[1].trim(), phase_number: phaseNum++, tasks: [] };
      phases.push(currentPhase);
      continue;
    }
    // Match - [ ] or - [x] as tasks
    const taskMatch = line.match(/^-\s+\[[ x]\]\s+(.+)/);
    if (taskMatch && currentPhase) {
      currentPhase.tasks.push({ title: taskMatch[1].trim(), description: "" });
      continue;
    }
    // Match plain - items as tasks too
    const plainMatch = line.match(/^-\s+(.{3,})/);
    if (plainMatch && currentPhase && !line.match(/^-\s+\[/)) {
      currentPhase.tasks.push({ title: plainMatch[1].trim(), description: "" });
    }
  }
  return phases.filter((p) => p.tasks.length > 0);
}

interface Props {
  existingPhases: ProjectPhase[];
}

export default function RoadmapImportDialog({ existingPhases }: Props) {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMarkdown(ev.target?.result as string || "");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const bulkPhases = useBulkCreatePhases();
  const bulkTasks = useBulkCreateTasks();

  const parsed = useMemo(() => (step === "preview" ? parseMarkdown(markdown) : []), [markdown, step]);
  const totalTasks = parsed.reduce((s, p) => s + p.tasks.length, 0);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const maxPhaseNum = existingPhases.length > 0
        ? Math.max(...existingPhases.map((p) => p.phase_number)) + 1
        : 0;

      const phaseInputs = parsed.map((p, i) => ({
        name: p.name,
        phase_number: maxPhaseNum + i,
        color: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"][i % 7],
      }));

      const createdPhases = await bulkPhases.mutateAsync(phaseInputs);

      const taskInputs = parsed.flatMap((p, i) =>
        p.tasks.map((t, j) => ({
          phase_id: createdPhases[i].id,
          title: t.title,
          description: t.description || null,
          sort_order: j,
        }))
      );

      if (taskInputs.length > 0) {
        await bulkTasks.mutateAsync(taskInputs);
      }

      setOpen(false);
      setMarkdown("");
      setStep("input");
    } catch {
      // error handled by hooks
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep("input"); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Importar Markdown
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>📥 Importar desde Markdown</DialogTitle>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Sube un archivo .md / .txt o pega el contenido. Los encabezados (## o ###) se interpretan como fases y los items (- [ ]) como tareas.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-dashed h-12 text-xs"
            >
              <Upload className="w-4 h-4 mr-2" /> Subir archivo .md o .txt
            </Button>
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={`### Fase 1: Nombre\n- [ ] Tarea uno\n- [ ] Tarea dos\n\n### Fase 2: Otra\n- [ ] Tarea tres`}
              rows={10}
              className="text-xs font-mono"
            />
            <Button onClick={() => setStep("preview")} disabled={!markdown.trim()} className="w-full">
              <Eye className="w-4 h-4 mr-2" /> Vista previa
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{parsed.length} fases</Badge>
              <Badge variant="secondary">{totalTasks} tareas</Badge>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {parsed.map((p, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <ul className="mt-1 space-y-0.5">
                      {p.tasks.map((t, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                          {t.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("input")} className="flex-1">Volver</Button>
              <Button onClick={handleImport} disabled={importing} className="flex-1">
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Importar {totalTasks} tareas
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
