import { useState } from "react";
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const ACTION_COLORS: Record<string, string> = {
  crear: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  editar: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  eliminar: "bg-destructive/10 text-destructive",
  restaurar: "bg-primary/10 text-primary",
  login: "bg-muted text-muted-foreground",
  config: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
};

const ActividadSection = ({ clinicId }: { clinicId: string }) => {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState("all");
  const [searchActivity, setSearchActivity] = useState("");
  const [trashSearch, setTrashSearch] = useState("");
  const [trashType, setTrashType] = useState("all");
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Activity log
  const { data: activities = [], isLoading: loadingActivity } = useQuery({
    queryKey: ["clinic-activity", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_activity_log")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Trash
  const { data: trashItems = [], isLoading: loadingTrash } = useQuery({
    queryKey: ["clinic-trash", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinic_trash")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restoreItem = async (item: any) => {
    try {
      // Re-insert entity
      const { error: insertError } = await (supabase as any).from(item.entity_type).insert(item.entity_data);
      if (insertError) throw insertError;
      // Remove from trash
      const { error: deleteError } = await (supabase as any).from("clinic_trash").delete().eq("id", item.id);
      if (deleteError) throw deleteError;
      toast.success("Elemento restaurado");
      queryClient.invalidateQueries({ queryKey: ["clinic-trash", clinicId] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const permanentDelete = async (id: string) => {
    const { error } = await (supabase as any).from("clinic_trash").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado permanentemente");
    queryClient.invalidateQueries({ queryKey: ["clinic-trash", clinicId] });
  };

  const emptyTrash = async () => {
    if (confirmText !== "CONFIRMAR") return;
    const { error } = await (supabase as any).from("clinic_trash").delete().eq("clinic_id", clinicId);
    if (error) { toast.error(error.message); return; }
    toast.success("Papelera vaciada");
    setEmptyConfirmOpen(false);
    setConfirmText("");
    queryClient.invalidateQueries({ queryKey: ["clinic-trash", clinicId] });
  };

  const filteredActivities = activities.filter((a: any) => {
    if (actionFilter !== "all" && a.action !== actionFilter) return false;
    if (searchActivity && !a.entity_name?.toLowerCase().includes(searchActivity.toLowerCase()) && !a.user_name?.toLowerCase().includes(searchActivity.toLowerCase())) return false;
    return true;
  });

  const filteredTrash = trashItems.filter((t: any) => {
    if (trashType !== "all" && t.entity_type !== trashType) return false;
    if (trashSearch && !t.entity_name?.toLowerCase().includes(trashSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <Tabs defaultValue="historial">
      <TabsList><TabsTrigger value="historial">Historial</TabsTrigger><TabsTrigger value="papelera">Papelera ({trashItems.length})</TabsTrigger></TabsList>

      <TabsContent value="historial" className="mt-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Acción" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="crear">Crear</SelectItem>
              <SelectItem value="editar">Editar</SelectItem>
              <SelectItem value="eliminar">Eliminar</SelectItem>
              <SelectItem value="restaurar">Restaurar</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Buscar..." value={searchActivity} onChange={e => setSearchActivity(e.target.value)} className="max-w-xs" />
        </div>

        {loadingActivity ? <Skeleton className="h-48" /> : filteredActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay actividad registrada aún</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Usuario</TableHead><TableHead>Acción</TableHead><TableHead>Entidad</TableHead><TableHead>Nombre</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredActivities.slice(0, 20).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                      <TableCell className="text-sm">{a.user_name || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={ACTION_COLORS[a.action] || ""}>{a.action}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.entity_type}</TableCell>
                      <TableCell className="text-sm">{a.entity_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="papelera" className="mt-4 space-y-4">
        <Alert className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />
          <AlertDescription className="text-sm">Los elementos se mantienen por 90 días antes de eliminarse permanentemente.</AlertDescription>
        </Alert>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={trashType} onValueChange={setTrashType}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="treatments">Tratamiento</SelectItem>
                <SelectItem value="professionals">Profesional</SelectItem>
                <SelectItem value="branches">Sede</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Buscar..." value={trashSearch} onChange={e => setTrashSearch(e.target.value)} className="max-w-xs" />
          </div>
          {trashItems.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setEmptyConfirmOpen(true)}>Vaciar papelera</Button>
          )}
        </div>

        {loadingTrash ? <Skeleton className="h-48" /> : filteredTrash.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">La papelera está vacía</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Días restantes</TableHead><TableHead className="text-right">Acciones</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredTrash.map((item: any) => {
                    const daysLeft = Math.max(0, differenceInDays(new Date(item.expires_at), new Date()));
                    const progressColor = daysLeft > 60 ? "bg-[hsl(var(--success))]" : daysLeft > 30 ? "bg-[hsl(var(--warning))]" : "bg-destructive";
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.entity_name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{item.entity_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(item.deleted_at), "dd/MM/yy", { locale: es })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={(daysLeft / 90) * 100} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">{daysLeft}d</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-[hsl(var(--success))]" onClick={() => restoreItem(item)}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Restaurar</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => permanentDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={emptyConfirmOpen} onOpenChange={o => { setEmptyConfirmOpen(o); if (!o) setConfirmText(""); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción es irreversible. Escribe CONFIRMAR para proceder.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Escribe CONFIRMAR" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={confirmText !== "CONFIRMAR"} onClick={emptyTrash}>Vaciar papelera</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>
    </Tabs>
  );
};

export default ActividadSection;
