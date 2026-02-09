import { useState } from "react";
import { Plus, Loader2, Trash2, GripVertical, MoreVertical, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PlanningColumn, PlanningTask, useCreateTask, useUpdateTask, useDeleteTask, useCreateColumn, useDeleteColumn } from "@/hooks/usePlanning";

interface Props {
  columns: PlanningColumn[];
  tasks: PlanningTask[];
  projectId: string;
  profiles: { user_id: string; full_name: string }[];
  isAdmin: boolean;
}

const priorityColors: Record<string, string> = {
  low: "border-l-muted",
  medium: "border-l-[hsl(var(--warning))]",
  high: "border-l-destructive",
  urgent: "border-l-destructive",
};

export default function KanbanBoardView({ columns, tasks, projectId, profiles, isAdmin }: Props) {
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newTaskColId, setNewTaskColId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editTask, setEditTask] = useState<PlanningTask | null>(null);
  const [editFields, setEditFields] = useState<Partial<PlanningTask>>({});

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createColumn = useCreateColumn();
  const deleteColumn = useDeleteColumn();

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
    createColumn.mutate({ project_id: projectId, name: newColName, position: columns.length }, {
      onSuccess: () => { setNewColName(""); setAddingCol(false); },
    });
  };

  const openEdit = (task: PlanningTask) => {
    setEditTask(task);
    setEditFields({ title: task.title, description: task.description, priority: task.priority, assigned_to: task.assigned_to, due_date: task.due_date, column_id: task.column_id });
  };

  const saveEdit = () => {
    if (!editTask) return;
    updateTask.mutate({ id: editTask.id, ...editFields }, { onSuccess: () => setEditTask(null) });
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) updateTask.mutate({ id: taskId, column_id: colId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tablero</h2>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setAddingCol(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Columna
          </Button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.column_id === col.id);
          return (
            <div
              key={col.id}
              className="w-72 shrink-0 bg-muted/30 rounded-xl border border-border flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold flex-1 truncate">{col.name}</span>
                <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="p-0.5 hover:bg-muted rounded"><MoreVertical className="w-3.5 h-3.5 text-muted-foreground" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteColumn.mutate(col.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar columna
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <ScrollArea className="flex-1 px-2 py-2">
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                      onClick={() => openEdit(task)}
                      className={cn(
                        "bg-card rounded-lg border border-border p-3 cursor-pointer hover:shadow-md transition-all border-l-4",
                        priorityColors[task.priority] || "border-l-muted"
                      )}
                    >
                      <p className="text-sm font-medium text-foreground mb-1">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.assigned_to && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                            <User className="w-3 h-3" />
                            {profiles.find(p => p.user_id === task.assigned_to)?.full_name?.split(" ")[0] || "—"}
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString("es", { day: "numeric", month: "short" })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {newTaskColId === col.id ? (
                <div className="p-2 border-t border-border space-y-1.5">
                  <Input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateTask(col.id)} placeholder="Tarea..." className="h-8 text-sm" />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => handleCreateTask(col.id)} disabled={createTask.isPending} className="h-7 text-xs flex-1">
                      {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Crear"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewTaskColId(null)} className="h-7 text-xs">✕</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setNewTaskColId(col.id)} className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border">
                  <Plus className="w-3.5 h-3.5" /> Agregar tarea
                </button>
              )}
            </div>
          );
        })}

        {addingCol && (
          <div className="w-72 shrink-0 bg-muted/30 rounded-xl border border-dashed border-border p-3 space-y-2">
            <Input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddCol()} placeholder="Nombre de columna..." className="h-8 text-sm" />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleAddCol} disabled={createColumn.isPending} className="h-7 text-xs flex-1">Crear</Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingCol(false)} className="h-7 text-xs">✕</Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={open => !open && setEditTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar tarea</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={editFields.title || ""} onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={editFields.description || ""} onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={editFields.priority} onValueChange={v => setEditFields(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Columna</Label>
                <Select value={editFields.column_id} onValueChange={v => setEditFields(p => ({ ...p, column_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Asignar a</Label>
                <Select value={editFields.assigned_to || "none"} onValueChange={v => setEditFields(p => ({ ...p, assigned_to: v === "none" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fecha límite</Label>
                <Input type="date" value={editFields.due_date || ""} onChange={e => setEditFields(p => ({ ...p, due_date: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={updateTask.isPending} className="flex-1 gradient-primary text-primary-foreground">
                {updateTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
              <Button variant="destructive" size="icon" onClick={() => { if (editTask) { deleteTask.mutate(editTask.id); setEditTask(null); } }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
