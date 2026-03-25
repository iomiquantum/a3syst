import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Search, ChevronRight, Clock, AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";
import { useProjectPhases, useProjectTasks, useCreateTask, useCreatePhase, statusLabel, priorityLabel, ProjectTask } from "@/hooks/useProjectRoadmap";
import RoadmapTaskSheet from "./roadmap/RoadmapTaskSheet";
import RoadmapImportDialog from "./roadmap/RoadmapImportDialog";
import { startOfWeek } from "date-fns";

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  in_progress: "🔄",
  testing: "🧪",
  completed: "✅",
  blocked: "🚫",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  low: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
};

export default function AdminRoadmapTab() {
  const { data: phases, isLoading: phasesLoading } = useProjectPhases();
  const { data: tasks, isLoading: tasksLoading } = useProjectTasks();

  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [showCompleted, setShowCompleted] = useState(true);

  // New task dialog
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskPhaseId, setNewTaskPhaseId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const createTask = useCreateTask();

  const loading = phasesLoading || tasksLoading;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (!showCompleted && t.status === "completed") return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterPhase !== "all" && t.phase_id !== filterPhase) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterPhase, searchQuery, showCompleted]);

  // Stats
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress").length || 0;
  const blockedTasks = tasks?.filter((t) => t.status === "blocked").length || 0;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const completedThisWeek = tasks?.filter((t) => t.completed_at && new Date(t.completed_at) >= weekStart).length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !newTaskPhaseId) return;
    const phaseTaskCount = tasks?.filter((t) => t.phase_id === newTaskPhaseId).length || 0;
    createTask.mutate(
      { phase_id: newTaskPhaseId, title: newTaskTitle, priority: newTaskPriority, sort_order: phaseTaskCount },
      { onSuccess: () => { setNewTaskOpen(false); setNewTaskTitle(""); } }
    );
  };

  const openTask = (t: ProjectTask) => {
    setSelectedTask(t);
    setSheetOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold">🗺️ Roadmap de Desarrollo</h2>
              <p className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks} tareas completadas
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground"><ListTodo className="w-3.5 h-3.5" /> {totalTasks - completedTasks - inProgressTasks - blockedTasks} pendientes</div>
              <div className="flex items-center gap-1 text-blue-600"><Clock className="w-3.5 h-3.5" /> {inProgressTasks} en curso</div>
              <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> {blockedTasks} bloqueadas</div>
              <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> {completedThisWeek} esta semana</div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{progressPercent}%</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar tareas..." className="h-8 pl-8 text-xs" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">⏳ Pendiente</SelectItem>
            <SelectItem value="in_progress">🔄 En progreso</SelectItem>
            <SelectItem value="testing">🧪 Testing</SelectItem>
            <SelectItem value="completed">✅ Completado</SelectItem>
            <SelectItem value="blocked">🚫 Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">🔴 Crítica</SelectItem>
            <SelectItem value="high">🟠 Alta</SelectItem>
            <SelectItem value="medium">🟡 Media</SelectItem>
            <SelectItem value="low">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fases</SelectItem>
            {phases?.map((p) => (
              <SelectItem key={p.id} value={p.id}>Fase {p.phase_number}: {p.name.slice(0, 20)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="rounded" />
          Completadas
        </label>

        <div className="ml-auto flex gap-2">
          <RoadmapImportDialog existingPhases={phases || []} />
          <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Nueva tarea</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={newTaskPhaseId} onValueChange={setNewTaskPhaseId}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
                  <SelectContent>
                    {phases?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>Fase {p.phase_number}: {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Título de la tarea" className="text-xs" />
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Crítica</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateTask} disabled={createTask.isPending || !newTaskTitle.trim() || !newTaskPhaseId} className="w-full">
                  {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear tarea"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Phases accordion */}
      <Accordion type="multiple" defaultValue={phases?.map((p) => p.id) || []} className="space-y-2">
        {phases?.map((phase) => {
          const phaseTasks = filteredTasks.filter((t) => t.phase_id === phase.id);
          const allPhaseTasks = tasks?.filter((t) => t.phase_id === phase.id) || [];
          const phaseCompleted = allPhaseTasks.filter((t) => t.status === "completed").length;
          const phaseTotal = allPhaseTasks.length;
          const phasePercent = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

          // Hide phase if filtered away and no matching tasks
          if (filterPhase !== "all" && filterPhase !== phase.id) return null;
          if (searchQuery && phaseTasks.length === 0) return null;

          return (
            <AccordionItem key={phase.id} value={phase.id} className="border border-border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: phase.color }} />
                  <span className="text-sm font-semibold truncate">
                    Fase {phase.phase_number}: {phase.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{phaseCompleted}/{phaseTotal}</Badge>
                  <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[200px]">
                    <Progress value={phasePercent} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground w-8">{phasePercent}%</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                {phaseTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No hay tareas que coincidan</p>
                ) : (
                  <div className="space-y-1">
                    {phaseTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => openTask(task)}
                        className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left hover:bg-muted/50 transition-colors group"
                      >
                        <span className="text-sm shrink-0">{STATUS_ICONS[task.status] || "⏳"}</span>
                        <span className={`text-xs flex-1 truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        {task.tags && task.tags.length > 0 && (
                          <div className="hidden sm:flex gap-1">
                            {task.tags.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="text-[9px] px-1 h-4">{t}</Badge>
                            ))}
                          </div>
                        )}
                        <Badge className={`text-[9px] px-1.5 h-4 border ${PRIORITY_COLORS[task.priority] || ""}`}>
                          {task.priority === "critical" ? "CRIT" : task.priority === "high" ? "ALTA" : task.priority === "medium" ? "MED" : "BAJA"}
                        </Badge>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Task detail sheet */}
      <RoadmapTaskSheet
        task={selectedTask}
        phase={phases?.find((p) => p.id === selectedTask?.phase_id) || null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
