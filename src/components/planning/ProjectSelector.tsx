import { useState } from "react";
import { Plus, FolderKanban, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PlanningProject, useCreateProject, useDeleteProject } from "@/hooks/usePlanning";

interface Props {
  projects: PlanningProject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isAdmin: boolean;
}

const COLORS = ["#6366f1", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

export default function ProjectSelector({ projects, selectedId, onSelect, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject.mutate({ name, description: desc, color }, {
      onSuccess: (data) => {
        setOpen(false);
        setName("");
        setDesc("");
        onSelect(data.id);
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">Proyectos</p>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="w-6 h-6"><Plus className="w-3.5 h-3.5" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nuevo proyecto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nombre del proyecto" value={name} onChange={e => setName(e.target.value)} />
                <Input placeholder="Descripción (opcional)" value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", color === c ? "border-foreground scale-110" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Button onClick={handleCreate} disabled={createProject.isPending} className="w-full gradient-primary text-primary-foreground">
                  {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear proyecto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="space-y-0.5">
        {projects.map(p => (
          <div key={p.id} className="group flex items-center">
            <button
              onClick={() => onSelect(p.id)}
              className={cn(
                "flex-1 flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-all duration-200",
                selectedId === p.id
                  ? "gradient-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.name}</span>
            </button>
            {isAdmin && selectedId !== p.id && (
              <button onClick={() => deleteProject.mutate(p.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Sin proyectos</p>
          </div>
        )}
      </div>
    </div>
  );
}
