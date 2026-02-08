import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isSameMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";
import type { ContentPost } from "@/hooks/useContentPosts";

interface Props {
  posts: ContentPost[];
  onCreatePost: () => void;
}

const platformIcon = (p: string) => {
  if (p === "facebook") return <Facebook className="w-3 h-3" />;
  if (p === "instagram") return <Instagram className="w-3 h-3" />;
  return <span className="text-[10px] font-bold">{p[0]?.toUpperCase()}</span>;
};

const statusColor: Record<string, string> = {
  scheduled: "bg-[hsl(var(--info))]",
  published: "bg-[hsl(var(--success))]",
  draft: "bg-[hsl(var(--warning))]",
  failed: "bg-[hsl(var(--destructive))]",
};

const ContentCalendarView = ({ posts, onCreatePost }: Props) => {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (dir: number) => {
    setCurrentDate(prev => viewMode === "week" ? (dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)) : (dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1)));
  };

  const goToday = () => setCurrentDate(new Date());

  const days = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const result: Date[] = [];
    let d = calStart;
    while (d <= calEnd) { result.push(d); d = addDays(d, 1); }
    return result;
  }, [currentDate, viewMode]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    posts.forEach(p => {
      const dateStr = p.scheduled_at || p.created_at;
      if (!dateStr) return;
      const key = format(new Date(dateStr), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) || []), p]);
    });
    return map;
  }, [posts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Planificador</h2>
          <p className="text-sm text-muted-foreground">Crea, programa y administra tu contenido</p>
        </div>
        <Button onClick={onCreatePost} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Crear publicación
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode("week")} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Semana</button>
            <button onClick={() => setViewMode("month")} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Mes</button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-sm" onClick={goToday}>Hoy</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <span className="text-lg font-semibold text-foreground capitalize">
            {format(currentDate, viewMode === "month" ? "MMMM yyyy" : "MMMM yyyy", { locale: es })}
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className={cn("border border-border rounded-xl overflow-hidden", viewMode === "month" ? "grid grid-cols-7" : "grid grid-cols-7")}>
        {/* Day headers */}
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
          <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground border-b border-border">{d}</div>
        ))}

        {/* Day cells */}
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDay.get(key) || [];
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={i}
              className={cn(
                "border-b border-r border-border p-1.5 transition-colors",
                viewMode === "week" ? "min-h-[400px]" : "min-h-[100px]",
                !inMonth && viewMode === "month" && "bg-muted/30",
                today && "bg-[hsl(var(--info)/0.05)]"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                today ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, viewMode === "month" ? 2 : 10).map(post => (
                  <div key={post.id} className="bg-card border border-border rounded-md p-1.5 cursor-pointer hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor[post.status] || "bg-muted-foreground")} />
                      <span className="text-[10px] text-muted-foreground">
                        {post.scheduled_at ? format(new Date(post.scheduled_at), "HH:mm") : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight">{post.title || post.body?.slice(0, 40) || "Sin título"}</p>
                    <div className="flex gap-0.5 mt-1">
                      {post.platforms.map(p => (
                        <span key={p} className="text-muted-foreground">{platformIcon(p)}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {dayPosts.length > (viewMode === "month" ? 2 : 10) && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayPosts.length - (viewMode === "month" ? 2 : 10)} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentCalendarView;
