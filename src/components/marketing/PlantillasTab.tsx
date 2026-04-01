import { useState, useEffect } from "react";
import {
  Loader2, RefreshCw, Plus, Trash2, MessageSquareText, Send, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateComponent {
  type: string;
  text: string;
  format: string | null;
  variableIndexes: number[];
}

interface TemplateItem {
  id: string;
  meta_id: string | null;
  name: string;
  language: string;
  category: string;
  status: string;
  preview: string;
  variableIndexes: number[];
  components: TemplateComponent[];
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const PlantillasTab = () => {
  const { clinicId } = useClinic();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("UTILITY");
  const [newLanguage, setNewLanguage] = useState("es");
  const [newHeader, setNewHeader] = useState("");
  const [newBody, setNewBody] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: { clinic_id: clinicId, approved_only: false, action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTemplates((data?.templates || []) as TemplateItem[]);
      setBusinessName(data?.business_name || null);
    } catch (e: any) {
      toast.error(e.message || "No se pudieron cargar las plantillas");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [clinicId]);

  const handleCreate = async () => {
    if (!clinicId || !newName.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: {
          clinic_id: clinicId,
          action: "create",
          name: newName.trim(),
          category: newCategory,
          language: newLanguage,
          header_text: newHeader.trim() || undefined,
          body_text: newBody.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Plantilla enviada a Meta para aprobación");
      setCreateOpen(false);
      resetCreateForm();
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "No se pudo crear la plantilla");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!clinicId || !deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: { clinic_id: clinicId, action: "delete", template_name: deleteTarget.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Plantilla eliminada de Meta");
      setDeleteTarget(null);
      if (selectedTemplate?.name === deleteTarget.name) setSelectedTemplate(null);
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message || "No se pudo eliminar la plantilla");
    } finally {
      setDeleting(false);
    }
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewCategory("UTILITY");
    setNewLanguage("es");
    setNewHeader("");
    setNewBody("");
  };

  if (loading && templates.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {businessName
              ? `Plantillas de WhatsApp de ${businessName}`
              : "Plantillas de WhatsApp vinculadas a tu negocio"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadTemplates} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva plantilla
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* Template List */}
        <div className="rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">{templates.length} plantillas</p>
            <p className="text-xs text-muted-foreground">Todos los estados</p>
          </div>
          <ScrollArea className="h-[420px]">
            <div className="p-2 space-y-1.5">
              {templates.length === 0 && !loading && (
                <div className="py-12 text-center space-y-2">
                  <MessageSquareText className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                  <p className="text-sm font-medium text-foreground">Sin plantillas</p>
                  <p className="text-xs text-muted-foreground">Crea tu primera plantilla o sincroniza desde Meta.</p>
                </div>
              )}
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2.5 text-left transition-colors",
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <Badge className={cn("text-[10px] shrink-0", STATUS_COLORS[t.status.toUpperCase()] || "")}>
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.preview}</p>
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px]">{t.language}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{t.category.toLowerCase()}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        <div className="rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">Detalle</p>
          </div>
          <div className="p-4">
            {!selectedTemplate ? (
              <div className="py-16 text-center space-y-2">
                <Eye className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Selecciona una plantilla para ver su contenido</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selectedTemplate.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={cn(STATUS_COLORS[selectedTemplate.status.toUpperCase()] || "")}>
                      {selectedTemplate.status}
                    </Badge>
                    <Badge variant="outline">{selectedTemplate.language}</Badge>
                    <Badge variant="secondary" className="capitalize">{selectedTemplate.category.toLowerCase()}</Badge>
                    {selectedTemplate.variableIndexes.length > 0 && (
                      <Badge variant="outline">{selectedTemplate.variableIndexes.length} variable(s)</Badge>
                    )}
                  </div>
                </div>

                {/* Components */}
                <div className="space-y-3">
                  {selectedTemplate.components.map((comp, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{comp.type}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comp.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(selectedTemplate)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear plantilla de WhatsApp</DialogTitle>
            <DialogDescription>
              La plantilla se enviará a Meta para su aprobación. Puede tardar hasta 24 horas en ser aprobada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre (sin espacios ni caracteres especiales)</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="ej: recordatorio_cita"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={newLanguage} onValueChange={setNewLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="es_MX">Español (MX)</SelectItem>
                    <SelectItem value="en_US">Inglés (US)</SelectItem>
                    <SelectItem value="pt_BR">Portugués (BR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Encabezado (opcional)</Label>
              <Input
                value={newHeader}
                onChange={e => setNewHeader(e.target.value)}
                placeholder="ej: Recordatorio de cita"
              />
            </div>
            <div className="space-y-2">
              <Label>Cuerpo del mensaje *</Label>
              <Textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder={"Hola {{1}}, te recordamos tu cita el día {{2}} a las {{3}}."}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Usa {"{{1}}"}, {"{{2}}"}, etc. para variables dinámicas.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim() || !newBody.trim()}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Enviar a Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleteTarget?.name}" de tu cuenta de WhatsApp Business en Meta. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlantillasTab;
