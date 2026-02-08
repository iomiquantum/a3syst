import { useState } from "react";
import { Palette, CalendarDays, List, FileText, Sparkles, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import ContentCalendarView from "@/components/content/ContentCalendarView";
import ContentListView from "@/components/content/ContentListView";
import ContentDraftsView from "@/components/content/ContentDraftsView";
import ContentAIGenerator from "@/components/content/ContentAIGenerator";
import CreatePostDialog from "@/components/content/CreatePostDialog";
import { useContentPosts } from "@/hooks/useContentPosts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ContentSection = "calendar" | "list" | "drafts" | "ai";

const sideNav = [
  { key: "calendar" as ContentSection, icon: CalendarDays, label: "Planificador", group: "Contenido" },
  { key: "list" as ContentSection, icon: List, label: "Publicaciones", group: "Contenido" },
  { key: "drafts" as ContentSection, icon: FileText, label: "Borradores", group: "Contenido" },
  { key: "ai" as ContentSection, icon: Sparkles, label: "Generar con IA", group: "Herramientas IA" },
];

const ContentPage = () => {
  const [section, setSection] = useState<ContentSection>("calendar");
  const [createOpen, setCreateOpen] = useState(false);
  const content = useContentPosts();
  const groups = ["Contenido", "Herramientas IA"];

  if (content.loading) {
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
              <Palette className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">Contenido</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Generación & Programación</p>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group} className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{group}</p>
              {sideNav.filter(n => n.group === group).map(({ key, icon: Icon, label }) => (
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
          ))}

          {/* Stats summary */}
          <div className="pt-4 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Resumen</p>
            <div className="space-y-1.5 px-2">
              {[
                { label: "Programadas", count: content.scheduled.length, color: "bg-[hsl(var(--info))]" },
                { label: "Borradores", count: content.drafts.length, color: "bg-[hsl(var(--warning))]" },
                { label: "Publicadas", count: content.published.length, color: "bg-[hsl(var(--success))]" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", s.color)} />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-semibold text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={() => setCreateOpen(true)} className="w-full gradient-primary text-primary-foreground text-sm">
              Crear publicación
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto pl-6">
          {section === "calendar" && <ContentCalendarView posts={content.posts} onCreatePost={() => setCreateOpen(true)} />}
          {section === "list" && <ContentListView content={content} />}
          {section === "drafts" && <ContentDraftsView content={content} />}
          {section === "ai" && <ContentAIGenerator content={content} />}
        </div>
      </div>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} content={content} />
    </AppLayout>
  );
};

export default ContentPage;
