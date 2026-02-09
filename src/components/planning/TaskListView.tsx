import { useState } from "react";
import { Plus, Loader2, Trash2, Calendar, User, Flag, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PlanningColumn, PlanningTask, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/usePlanning";

interface Props {
  columns: PlanningColumn[];
  tasks: PlanningTask[];
  projectId: string;
  profiles: { user_id: string; full_name: string }[];
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

export default function TaskListView({ columns, tasks, projectId, profiles }: Props) {
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set(columns.map(c => c.id)));
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const toggleCol = (id: string) => {
    const next = new Set(expandedCols);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedCols(next);
  };

  const handleCreate = (columnId: string) => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      project_id: projectId,
      column_id: columnId,
      title: newTitle,
      position: tasks.filter(t => t.column_id === columnId).length,
    }, {
      onSuccess: () => { setNewTitle(""); setNewTaskCol(null); },
    });
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find(p => p.user_id === userId)?.full_name || "—";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Vista Lista</h2>
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.column_id === col.id);
        const expanded = expandedCols.has(col.id);
        return (
          <div key={col.id} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleCol(col.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="font-semibold text-sm">{col.name}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
            </button>
            {expanded && (
              <div className="divide-y divide-border">
                {colTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                    </div>
                    <Badge className={cn("text-[10px]", priorityColors[task.priority])}>{task.priority}</Badge>
                    {task.assigned_to && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="max-w-[80px] truncate">{getProfileName(task.assigned_to)}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.due_date).toLocaleDateString("es")}</span>
                      </div>
                    )}
                    <Select value={task.column_id} onValueChange={v => updateTask.mutate({ id: task.id, column_id: v })}>
                      <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button onClick={() => deleteTask.mutate(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {newTaskCol === col.id ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Input
                      autoFocus
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCreate(col.id)}
                      placeholder="Nombre de la tarea..."
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={() => handleCreate(col.id)} disabled={createTask.isPending} className="h-8">
                      {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Crear"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewTaskCol(null)} className="h-8">✕</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewTaskCol(col.id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar tarea
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
