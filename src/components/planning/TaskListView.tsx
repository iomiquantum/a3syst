import { useState } from "react";
import { Plus, Loader2, Trash2, Calendar, User, ChevronDown, ChevronRight, Flag, MessageSquare, Paperclip, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PlanningColumn, PlanningTask, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/usePlanning";

interface Props {
  columns: PlanningColumn[];
  tasks: PlanningTask[];
  projectId: string;
  profiles: { user_id: string; full_name: string }[];
}

const priorityConfig: Record<string, { label: string; flag: string; color: string }> = {
  urgent: { label: "Urgente", flag: "🚩", color: "text-red-500" },
  high: { label: "Alta", flag: "🔴", color: "text-orange-500" },
  medium: { label: "Media", flag: "🟡", color: "text-yellow-500" },
  low: { label: "Baja", flag: "🔵", color: "text-blue-400" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function isOverdue(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

export default function TaskListView({ columns, tasks, projectId, profiles }: Props) {
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set(columns.map(c => c.id)));
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
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

  const toggleComplete = (taskId: string) => {
    const next = new Set(completedTasks);
    next.has(taskId) ? next.delete(taskId) : next.add(taskId);
    setCompletedTasks(next);
  };

  const getProfile = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find(p => p.user_id === userId) || null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Vista Lista</h2>
        <div className="text-xs text-muted-foreground">{tasks.length} tareas</div>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
        <div className="w-5" />
        <div className="w-5" />
        <div className="flex-1">Tarea</div>
        <div className="w-20 text-center">Prioridad</div>
        <div className="w-24 text-center">Asignado</div>
        <div className="w-24 text-center">Fecha</div>
        <div className="w-28 text-center">Estado</div>
        <div className="w-16" />
      </div>

      {columns.map(col => {
        const colTasks = tasks.filter(t => t.column_id === col.id);
        const expanded = expandedCols.has(col.id);
        return (
          <div key={col.id}>
            {/* Column group header - ClickUp style */}
            <button
              onClick={() => toggleCol(col.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors rounded-lg group"
            >
              <div className="flex items-center gap-2 flex-1">
                {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-bold uppercase tracking-wider">{col.name}</span>
                <span className="text-xs font-bold text-muted-foreground ml-1">{colTasks.length}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setNewTaskCol(col.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </button>

            {/* Column color line */}
            {expanded && <div className="h-0.5 rounded-full mx-2 mb-1" style={{ backgroundColor: col.color, opacity: 0.4 }} />}

            {expanded && (
              <div>
                {colTasks.map(task => {
                  const priority = priorityConfig[task.priority] || priorityConfig.medium;
                  const profile = getProfile(task.assigned_to);
                  const overdue = isOverdue(task.due_date);
                  const done = completedTasks.has(task.id);

                  return (
                    <div key={task.id} className={cn(
                      "flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors group border-l-2 ml-4",
                      done ? "opacity-50" : ""
                    )} style={{ borderLeftColor: col.color }}>
                      {/* Drag handle */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </div>

                      {/* Checkbox */}
                      <Checkbox checked={done} onCheckedChange={() => toggleComplete(task.id)} className="data-[state=checked]:bg-primary" />

                      {/* Task name */}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-foreground truncate", done && "line-through")}>{task.title}</p>
                        {task.description && <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>}
                      </div>

                      {/* Priority */}
                      <div className="w-20 flex justify-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">{priority.flag}</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{priority.label}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Assignee */}
                      <div className="w-24 flex justify-center">
                        {profile ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[9px] font-bold gradient-primary text-primary-foreground">
                                  {getInitials(profile.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{profile.full_name}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>

                      {/* Due date */}
                      <div className="w-24 flex justify-center">
                        {task.due_date ? (
                          <span className={cn(
                            "text-[11px] font-medium px-1.5 py-0.5 rounded",
                            overdue ? "bg-destructive/15 text-destructive" : "text-muted-foreground"
                          )}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(task.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">Sin fecha</span>
                        )}
                      </div>

                      {/* Status selector */}
                      <div className="w-28">
                        <Select value={task.column_id} onValueChange={v => updateTask.mutate({ id: task.id, column_id: v })}>
                          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent hover:bg-muted">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: columns.find(c => c.id === task.column_id)?.color }} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.color }} />
                                  {c.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="w-16 flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-muted" onClick={() => {}}>
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button className="p-1 rounded hover:bg-muted" onClick={() => {}}>
                          <Paperclip className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => deleteTask.mutate(task.id)} className="p-1 rounded hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add task inline */}
                {newTaskCol === col.id ? (
                  <div className="flex items-center gap-2 px-4 py-2 ml-4 border-l-2" style={{ borderLeftColor: col.color }}>
                    <div className="w-5" />
                    <div className="w-5" />
                    <Input
                      autoFocus
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreate(col.id); if (e.key === "Escape") setNewTaskCol(null); }}
                      placeholder="Nombre de la tarea..."
                      className="h-7 text-sm flex-1"
                    />
                    <Button size="sm" onClick={() => handleCreate(col.id)} disabled={createTask.isPending} className="h-7 text-xs">
                      {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Crear"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewTaskCol(null)} className="h-7 text-xs">✕</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewTaskCol(col.id)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors ml-4 border-l-2 border-transparent hover:border-l-2"
                    style={{ borderLeftColor: `${col.color}40` }}
                  >
                    <div className="w-5" />
                    <Plus className="w-3.5 h-3.5" /> Agregar Tarea
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
