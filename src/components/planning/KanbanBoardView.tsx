import { useState } from "react";
import { Plus, Loader2, Trash2, MoreHorizontal, User, Calendar, Flag, MessageSquare, Paperclip, Link2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PlanningColumn, PlanningTask, useCreateTask, useUpdateTask, useDeleteTask, useCreateColumn, useDeleteColumn } from "@/hooks/usePlanning";
import { toast } from "@/hooks/use-toast";

interface Props {
  columns: PlanningColumn[];
  tasks: PlanningTask[];
  projectId: string;
  profiles: { user_id: string; full_name: string }[];
  isAdmin: boolean;
}

const priorityConfig: Record<string, { label: string; color: string; flag: string; border: string }> = {
  urgent: { label: "Urgente", color: "text-red-500", flag: "🚩", border: "border-l-red-500" },
  high: { label: "Alta", color: "text-orange-500", flag: "🔴", border: "border-l-orange-500" },
  medium: { label: "Media", color: "text-yellow-500", flag: "🟡", border: "border-l-yellow-500" },
  low: { label: "Baja", color: "text-muted-foreground", flag: "🔵", border: "border-l-blue-400" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function isOverdue(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date(new Date().toDateString());
}

export default function KanbanBoardView({ columns, tasks, projectId, profiles, isAdmin }: Props) {
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("#94a3b8");
  const [newTaskColId, setNewTaskColId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editTask, setEditTask] = useState<PlanningTask | null>(null);
  const [editFields, setEditFields] = useState<Partial<PlanningTask>>({});

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createColumn = useCreateColumn();
  const deleteColumn = useDeleteColumn();

  const COL_COLORS = ["#94a3b8", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  const handleCreateTask = (colId: string) => {
    if (!newTitle.trim()) return;
    createTask.mutate({
      project_id: projectId,
      column_id: colId,
      title: newTitle,
      position: tasks.filter(t => t.column_id === colId).length,
    }, { onSuccess: () => { setNewTitle(""); setNewTaskColId(null); } });
  };

  const handleAddCol = () => {
    if (!newColName.trim()) return;
    createColumn.mutate({ project_id: projectId, name: newColName, color: newColColor, position: columns.length }, {
      onSuccess: () => { setNewColName(""); setNewColColor("#94a3b8"); setAddingCol(false); },
    });
  };

  const openEdit = (task: PlanningTask) => {
    setEditTask(task);
    setEditFields({ title: task.title, description: task.description, priority: task.priority, assigned_to: task.assigned_to, due_date: task.due_date, column_id: task.column_id });
  };

  const saveEdit = () => {
    if (!editTask) return;
    updateTask.mutate({ id: editTask.id, ...editFields }, {
      onSuccess: () => { setEditTask(null); toast({ title: "Tarea actualizada" }); },
    });
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary/50");
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) updateTask.mutate({ id: taskId, column_id: colId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-primary/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("ring-2", "ring-primary/50");
  };

  const getProfile = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find(p => p.user_id === userId) || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tablero</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setAddingCol(true)} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Columna
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs gradient-primary text-primary-foreground" onClick={() => {
            if (columns.length > 0) setNewTaskColId(columns[0].id);
          }}>
            <Plus className="w-3.5 h-3.5" /> Tarea
          </Button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.column_id === col.id);
          return (
            <div
              key={col.id}
              className="w-[290px] shrink-0 rounded-xl flex flex-col transition-all duration-200"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column header - ClickUp style */}
              <div className="flex items-center gap-2 px-3 py-2.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex-1 truncate">{col.name}</span>
                <span className="text-xs font-bold text-muted-foreground">{colTasks.length}</span>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive text-xs" onClick={() => deleteColumn.mutate(col.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar columna
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <button onClick={() => setNewTaskColId(col.id)} className="p-0.5 hover:bg-muted rounded">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Column divider line */}
              <div className="h-0.5 rounded-full mx-1 mb-2" style={{ backgroundColor: col.color }} />

              {/* Tasks */}
              <ScrollArea className="flex-1 px-1">
                <div className="space-y-2 pb-2">
                  {colTasks.map(task => {
                    const priority = priorityConfig[task.priority] || priorityConfig.medium;
                    const profile = getProfile(task.assigned_to);
                    const overdue = isOverdue(task.due_date);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData("taskId", task.id); e.currentTarget.classList.add("opacity-50"); }}
                        onDragEnd={e => e.currentTarget.classList.remove("opacity-50")}
                        onClick={() => openEdit(task)}
                        className={cn(
                          "bg-card rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-200 border-l-[3px] group/card",
                          priority.border
                        )}
                      >
                        {/* Task title */}
                        <p className="text-sm font-semibold text-foreground leading-snug mb-1.5">{task.title}</p>

                        {/* Description preview */}
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">{task.description}</p>
                        )}

                        {/* Meta row - ClickUp style */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority flag */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm cursor-default">{priority.flag}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">{priority.label}</TooltipContent>
                            </Tooltip>

                            {/* Due date */}
                            {task.due_date && (
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 font-medium",
                                overdue ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                              )}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                              </div>
                            )}
                          </div>

                          {/* Action icons + Avatar */}
                          <div className="flex items-center gap-1">
                            {/* Quick action icons - hidden until hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-1 rounded hover:bg-muted" onClick={e => e.stopPropagation()}>
                                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Comentar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-1 rounded hover:bg-muted" onClick={e => e.stopPropagation()}>
                                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">Adjuntar</TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Assignee avatar */}
                            {profile ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="w-6 h-6 border-2 border-card">
                                    <AvatarFallback className="text-[9px] font-bold gradient-primary text-primary-foreground">
                                      {getInitials(profile.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">{profile.full_name}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <User className="w-3 h-3 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Add task input */}
              {newTaskColId === col.id ? (
                <div className="p-2 space-y-1.5">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreateTask(col.id); if (e.key === "Escape") setNewTaskColId(null); }}
                    placeholder="Nombre de la tarea..."
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => handleCreateTask(col.id)} disabled={createTask.isPending} className="h-7 text-xs flex-1 gradient-primary text-primary-foreground">
                      {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Crear"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewTaskColId(null)} className="h-7 text-xs">✕</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNewTaskColId(col.id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-b-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Tarea
                </button>
              )}
            </div>
          );
        })}

        {/* Add column */}
        {addingCol ? (
          <div className="w-[290px] shrink-0 rounded-xl border border-dashed border-border p-3 space-y-3 bg-muted/20">
            <Input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddCol(); if (e.key === "Escape") setAddingCol(false); }} placeholder="Nombre de columna..." className="h-8 text-sm" />
            <div className="flex gap-1.5 flex-wrap">
              {COL_COLORS.map(c => (
                <button key={c} onClick={() => setNewColColor(c)}
                  className={cn("w-5 h-5 rounded-full border-2 transition-all", newColColor === c ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleAddCol} disabled={createColumn.isPending} className="h-7 text-xs flex-1">Crear</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingCol(false)} className="h-7 text-xs">✕</Button>
            </div>
          </div>
        ) : isAdmin ? (
          <button onClick={() => setAddingCol(true)} className="w-[290px] shrink-0 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all min-h-[100px]">
            <Plus className="w-4 h-4" /> Nueva columna
          </button>
        ) : null}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={open => !open && setEditTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{priorityConfig[editFields.priority || "medium"]?.flag}</span>
              Editar tarea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Título</Label>
              <Input value={editFields.title || ""} onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))} className="mt-1 font-medium" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
              <Textarea value={editFields.description || ""} onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))} rows={3} className="mt-1" placeholder="Agrega una descripción..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Prioridad</Label>
                <Select value={editFields.priority} onValueChange={v => setEditFields(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, { label, flag }]) => (
                      <SelectItem key={key} value={key}><span className="flex items-center gap-2">{flag} {label}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                <Select value={editFields.column_id} onValueChange={v => setEditFields(p => ({ ...p, column_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Asignar a</Label>
                <Select value={editFields.assigned_to || "none"} onValueChange={v => setEditFields(p => ({ ...p, assigned_to: v === "none" ? null : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        <span className="flex items-center gap-2">
                          <Avatar className="w-4 h-4"><AvatarFallback className="text-[7px] gradient-primary text-primary-foreground">{getInitials(p.full_name)}</AvatarFallback></Avatar>
                          {p.full_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Fecha límite</Label>
                <Input type="date" value={editFields.due_date || ""} onChange={e => setEditFields(p => ({ ...p, due_date: e.target.value || null }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={updateTask.isPending} className="flex-1 gradient-primary text-primary-foreground">
                {updateTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar cambios"}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => {
                    if (editTask) {
                      createTask.mutate({ project_id: editTask.project_id, column_id: editTask.column_id, title: editTask.title + " (copia)", description: editTask.description, priority: editTask.priority, assigned_to: editTask.assigned_to, due_date: editTask.due_date });
                      setEditTask(null);
                      toast({ title: "Tarea duplicada" });
                    }
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicar tarea</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructive" size="icon" onClick={() => { if (editTask) { deleteTask.mutate(editTask.id); setEditTask(null); } }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar tarea</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
