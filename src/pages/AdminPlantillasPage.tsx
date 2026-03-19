import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileJson, Edit, Eye, Copy, Power, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PipelineTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  industry_type: string;
  base_tabs: any[];
  extra_labels: any[];
  is_active: boolean;
  created_at: string;
  clinic_count?: number;
}

const AdminPlantillasPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<any>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("pipeline_templates")
      .select("*")
      .order("created_at", { ascending: false });

    // Get clinic counts
    const { data: configs } = await supabase
      .from("clinic_pipeline_config")
      .select("pipeline_template_id");

    const countMap: Record<string, number> = {};
    (configs || []).forEach((c: any) => {
      if (c.pipeline_template_id) countMap[c.pipeline_template_id] = (countMap[c.pipeline_template_id] || 0) + 1;
    });

    setTemplates((data || []).map((t: any) => ({ ...t, clinic_count: countMap[t.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDuplicate = async (t: PipelineTemplate) => {
    const { error } = await (supabase as any).from("pipeline_templates").insert({
      name: `${t.name} (copia)`,
      slug: `${t.slug}-copia`,
      description: t.description,
      industry_type: t.industry_type,
      base_tabs: t.base_tabs,
      extra_labels: t.extra_labels,
      is_active: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plantilla duplicada");
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await (supabase as any).from("pipeline_templates").update({ is_active: !active }).eq("id", id);
    toast.success(active ? "Plantilla desactivada" : "Plantilla activada");
    fetchTemplates();
  };

  const handleValidateImport = () => {
    setImportError("");
    setImportPreview(null);
    try {
      const parsed = JSON.parse(importJson);
      if (!parsed.name || !parsed.slug) {
        setImportError("JSON debe tener 'name' y 'slug'");
        return;
      }
      setImportPreview(parsed);
    } catch (e) {
      setImportError("JSON inválido: " + (e as Error).message);
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;
    const { error } = await (supabase as any).from("pipeline_templates").insert({
      name: importPreview.name,
      slug: importPreview.slug,
      description: importPreview.description || "",
      industry_type: importPreview.industry_type || "Otro",
      base_tabs: importPreview.base_tabs || [],
      extra_labels: importPreview.extra_labels || [],
      seguimiento_config: importPreview.seguimiento_config || {},
      automation_rules: importPreview.automation_rules || {},
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plantilla importada");
    setImportOpen(false);
    setImportJson("");
    setImportPreview(null);
    fetchTemplates();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plantillas de pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">Diseña y gestiona plantillas de pipeline por industria. Asígnalas a negocios individuales.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileJson className="w-4 h-4 mr-1.5" />Importar JSON
            </Button>
            <Button onClick={() => navigate("/admin/plantillas/nueva")}>
              <Plus className="w-4 h-4 mr-1.5" />Crear nueva plantilla
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Cargando...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay plantillas creadas aún</p>
              <Button className="mt-4" onClick={() => navigate("/admin/plantillas/nueva")}>
                <Plus className="w-4 h-4 mr-1.5" />Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px]">{t.industry_type || "General"}</Badge>
                        <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">
                          {t.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">{t.description || "Sin descripción"}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>+{(t.base_tabs || []).length} tabs</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{t.clinic_count} negocios</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate(`/admin/plantillas/${t.id}/editar`)}>
                      <Edit className="w-3 h-3 mr-1" />Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleDuplicate(t)}>
                      <Copy className="w-3 h-3 mr-1" />Duplicar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleToggleActive(t.id, t.is_active)}>
                      <Power className="w-3 h-3 mr-1" />{t.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Importar plantilla desde JSON</DialogTitle>
            </DialogHeader>
            <Textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='{"name": "...", "slug": "...", "industry_type": "...", "base_tabs": [...] }'
              rows={8}
              className="font-mono text-xs"
            />
            {importError && <p className="text-sm text-destructive">{importError}</p>}
            {importPreview && (
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">{importPreview.name}</p>
                <p className="text-xs text-muted-foreground">{importPreview.industry_type} · {(importPreview.base_tabs || []).length} tabs</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleValidateImport}>Validar JSON</Button>
              <Button disabled={!importPreview} onClick={handleImport}>Importar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminPlantillasPage;
