import { useState } from "react";
import { ClipboardList, List, Columns3, Clock, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ProjectSelector from "@/components/planning/ProjectSelector";
import TaskListView from "@/components/planning/TaskListView";
import KanbanBoardView from "@/components/planning/KanbanBoardView";
import TimeTrackerView from "@/components/planning/TimeTrackerView";
import { usePlanningProjects, usePlanningColumns, usePlanningTasks, useBusinessProfiles } from "@/hooks/usePlanning";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Section = "list" | "board" | "time";

const sideNav = [
  { key: "list" as Section, icon: List, label: "Lista" },
  { key: "board" as Section, icon: Columns3, label: "Tablero" },
  { key: "time" as Section, icon: Clock, label: "Control de Tiempo" },
];

const PlanificacionPage = () => {
  const [section, setSection] = useState<Section>("board");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { user } = useAuth();
  const { businessId, isSuperAdmin } = useBusiness();

  const { data: projects, isLoading: loadingProjects } = usePlanningProjects();
  const { data: columns } = usePlanningColumns(selectedProjectId);
  const { data: tasks } = usePlanningTasks(selectedProjectId);
  const { data: profiles } = useBusinessProfiles();

  // Auto-select first project
  if (projects && projects.length > 0 && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

  // Check if user is admin (owner or admin role)
  const isAdmin = isSuperAdmin || !!(user && projects?.find(p => p.id === selectedProjectId)?.created_by === user.id);

  if (loadingProjects) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-0 h-[calc(100vh-8rem)]">
        {/* Internal sidebar */}
        <div className="w-56 shrink-0 border-r border-border pr-4 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">Planificación</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Proyectos & Tareas</p>
            </div>
          </div>

          {/* Views nav */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">Vistas</p>
            {sideNav.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium px-2.5 py-2 transition-all duration-200",
                  section === key
                    ? "gradient-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Projects list */}
          <ProjectSelector
            projects={projects || []}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
            isAdmin={isAdmin}
          />

          {/* Stats */}
          {selectedProjectId && tasks && columns && (
            <div className="pt-4 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Resumen</p>
              <div className="space-y-1.5 px-2">
                {columns.map(col => (
                  <div key={col.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-muted-foreground truncate">{col.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{tasks.filter(t => t.column_id === col.id).length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto pl-6">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium">Selecciona o crea un proyecto</p>
              <p className="text-sm text-muted-foreground mt-1">Usa el panel lateral para gestionar tus proyectos</p>
            </div>
          ) : (
            <>
              {section === "list" && <TaskListView columns={columns || []} tasks={tasks || []} projectId={selectedProjectId} profiles={profiles || []} />}
              {section === "board" && <KanbanBoardView columns={columns || []} tasks={tasks || []} projectId={selectedProjectId} profiles={profiles || []} isAdmin={isAdmin} />}
              {section === "time" && <TimeTrackerView tasks={tasks || []} columns={columns || []} profiles={profiles || []} />}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PlanificacionPage;
