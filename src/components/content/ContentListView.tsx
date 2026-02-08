import { useState } from "react";
import { Search, Filter, MoreHorizontal, Trash2, Edit, Eye, Facebook, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ContentPost } from "@/hooks/useContentPosts";

interface Props {
  content: {
    posts: ContentPost[];
    deletePost: (id: string) => Promise<boolean>;
    updatePost: (id: string, data: Partial<ContentPost>) => Promise<boolean>;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  published: { label: "Publicada", className: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]" },
  scheduled: { label: "Programada", className: "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.2)]" },
  draft: { label: "Borrador", className: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]" },
  failed: { label: "Fallida", className: "bg-destructive/10 text-destructive border-destructive/20" },
  expired: { label: "Caducada", className: "bg-muted text-muted-foreground border-border" },
};

const tabs = [
  { key: "all", label: "Todas" },
  { key: "published", label: "Publicadas" },
  { key: "scheduled", label: "Programadas" },
  { key: "draft", label: "Borradores" },
  { key: "expired", label: "Caducadas" },
];

const ContentListView = ({ content }: Props) => {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = content.posts.filter(p => {
    if (tab !== "all" && p.status !== tab) return false;
    if (typeFilter !== "all" && p.post_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.title?.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Contenido</h2>
        <p className="text-sm text-muted-foreground">Programa, publica y administra publicaciones, reels e historias</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo de publicación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="post">Publicación</SelectItem>
            <SelectItem value="reel">Reel</SelectItem>
            <SelectItem value="story">Historia</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID o texto" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No se encontraron publicaciones</p>
          <p className="text-sm text-muted-foreground mt-1">Ajusta los filtros o crea una nueva publicación</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Contenido</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Plataformas</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Fecha</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(post => {
                const sc = statusConfig[post.status] || statusConfig.draft;
                return (
                  <tr key={post.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{post.title || post.body?.slice(0, 50) || "Sin título"}</p>
                      {post.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.body.slice(0, 80)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize text-xs">{post.post_type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {post.platforms.map(p => (
                          <span key={p} className="text-muted-foreground">
                            {p === "facebook" ? <Facebook className="w-4 h-4" /> : p === "instagram" ? <Instagram className="w-4 h-4" /> : <span className="text-xs">{p}</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn("text-xs", sc.className)}>{sc.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {post.scheduled_at ? format(new Date(post.scheduled_at), "dd MMM yyyy HH:mm", { locale: es }) : format(new Date(post.created_at), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Ver detalle</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => content.deletePost(post.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContentListView;
