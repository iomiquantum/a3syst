import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Save, Trash2, GripVertical, Lock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const INDUSTRIES = ["Salud", "Bienestar", "Belleza", "Educación", "Servicios", "Otro"];
const TAB_COLORS = ["purple", "blue", "green", "red", "amber", "coral", "teal", "pink", "gray"];
const GENERIC_TABS = ["Todos", "Resueltos IA", "Seguimiento", "No responden", "No interesado", "Escalados", "Clientes"];

interface TabDef {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  position: number;
  sub_states: { name: string; color: string; description: string }[];
}

interface LabelDef {
  name: string;
  color: string;
}

function slugify(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const AdminPlantillaEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === "nueva";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("Otro");
  const [description, setDescription] = useState("");
  const [tabs, setTabs] = useState<TabDef[]>([]);
  const [labels, setLabels] = useState<LabelDef[]>([]);
  const [automationRules, setAutomationRules] = useState("[]");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        const { data } = await (supabase as any).from("pipeline_templates").select("*").eq("id", id).single();
        if (data) {
          setName(data.name);
          setSlug(data.slug);
          setIndustry(data.industry_type || "Otro");
          setDescription(data.description || "");
          setTabs(data.base_tabs || []);
          setLabels(data.extra_labels || []);
          setAutomationRules(JSON.stringify(data.automation_rules || [], null, 2));
        }
        setLoading(false);
      })();
    }
  }, [id]);

  useEffect(() => {
    if (isNew && name) setSlug(slugify(name));
  }, [name, isNew]);

  const addTab = () => {
    setTabs(prev => [...prev, { name: "", slug: "", icon: "Tag", color: "blue", description: "", position: prev.length + 1, sub_states: [] }]);
  };

  const updateTab = (idx: number, field: string, value: any) => {
    setTabs(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const updated = { ...t, [field]: value };
      if (field === "name") updated.slug = slugify(value);
      return updated;
    }));
  };

  const removeTab = (idx: number) => setTabs(prev => prev.filter((_, i) => i !== idx));

  const addSubState = (tabIdx: number) => {
    setTabs(prev => prev.map((t, i) => i === tabIdx ? { ...t, sub_states: [...t.sub_states, { name: "", color: "green", description: "" }] } : t));
  };

  const updateSubState = (tabIdx: number, subIdx: number, field: string, value: string) => {
    setTabs(prev => prev.map((t, i) => i === tabIdx ? {
      ...t,
      sub_states: t.sub_states.map((s, j) => j === subIdx ? { ...s, [field]: value } : s),
    } : t));
  };

  const removeSubState = (tabIdx: number, subIdx: number) => {
    setTabs(prev => prev.map((t, i) => i === tabIdx ? { ...t, sub_states: t.sub_states.filter((_, j) => j !== subIdx) } : t));
  };

  const addLabel = () => setLabels(prev => [...prev, { name: "", color: "green" }]);
  const updateLabel = (idx: number, field: string, value: string) => setLabels(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const removeLabel = (idx: number) => setLabels(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name || !slug) { toast.error("Nombre y slug son requeridos"); return; }
    setSaving(true);

    let parsedRules: any = [];
    try { parsedRules = JSON.parse(automationRules); } catch { parsedRules = []; }

    const payload = {
      name, slug, industry_type: industry, description,
      base_tabs: tabs, extra_labels: labels,
      automation_rules: parsedRules,
      is_active: true,
      ...(isNew ? { created_by: user?.id } : {}),
    };

    const { error } = isNew
      ? await (supabase as any).from("pipeline_templates").insert(payload)
      : await (supabase as any).from("pipeline_templates").update(payload).eq("id", id);

    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(isNew ? "Plantilla creada" : "Plantilla actualizada");
    navigate("/admin/plantillas");
    setSaving(false);
  };

  if (loading) return <AppLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plantillas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "Nueva plantilla" : `Editar: ${name}`}</h1>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Información básica</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Clínicas y consultorios médicos" />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="clinicas" />
              </div>
              <div>
                <Label>Industria</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Preview of all tabs */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Vista previa de tabs</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {GENERIC_TABS.map(t => (
                <Badge key={t} variant="outline" className="text-xs gap-1">
                  <Lock className="w-2.5 h-2.5" />{t}
                </Badge>
              ))}
              {tabs.filter(t => t.name).map(t => (
                <Badge key={t.slug} className="text-xs bg-primary/10 text-primary">
                  ✦ {t.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tabs adicionales del pipeline</CardTitle>
              <Button size="sm" variant="outline" onClick={addTab}><Plus className="w-3 h-3 mr-1" />Agregar tab</Button>
            </div>
            <p className="text-xs text-muted-foreground">Se agregan a las 7 tabs genéricas cuando se carga en un negocio</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tabs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin tabs adicionales</p>}
            {tabs.map((tab, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Tab {idx + 1}</span>
                    {tab.slug && <Badge variant="outline" className="text-[10px] font-mono">{tab.slug}</Badge>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeTab(idx)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nombre</Label>
                    <Input value={tab.name} onChange={e => updateTab(idx, "name", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Select value={tab.color} onValueChange={v => updateTab(idx, "color", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TAB_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Icono</Label>
                    <Input value={tab.icon} onChange={e => updateTab(idx, "icon", e.target.value)} className="h-8 text-sm" placeholder="Tag" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input value={tab.description} onChange={e => updateTab(idx, "description", e.target.value)} className="h-8 text-sm" />
                </div>

                {/* Sub-states */}
                <div className="pl-4 border-l-2 border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Sub-estados</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addSubState(idx)}>
                      <Plus className="w-3 h-3 mr-1" />Agregar
                    </Button>
                  </div>
                  {tab.sub_states.map((ss, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <Input value={ss.name} onChange={e => updateSubState(idx, si, "name", e.target.value)} className="h-7 text-xs flex-1" placeholder="Nombre" />
                      <Select value={ss.color} onValueChange={v => updateSubState(idx, si, "color", v)}>
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{TAB_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeSubState(idx, si)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Labels Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Etiquetas adicionales</CardTitle>
              <Button size="sm" variant="outline" onClick={addLabel}><Plus className="w-3 h-3 mr-1" />Agregar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {labels.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={l.name} onChange={e => updateLabel(idx, "name", e.target.value)} className="h-8 text-sm flex-1" placeholder="Nombre de etiqueta" />
                <Select value={l.color} onValueChange={v => updateLabel(idx, "color", v)}>
                  <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{TAB_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLabel(idx)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Automation Rules */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Reglas de automatización</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={automationRules}
              onChange={e => setAutomationRules(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder='[{"when": "pipeline_tab = seguimiento_venta", "condition": "show_result = no_show", "action": "move_to seguimiento_c1"}]'
            />
            <p className="text-xs text-muted-foreground mt-1">JSON con las reglas de automatización específicas de esta plantilla</p>
          </CardContent>
        </Card>

        {/* Save & Export */}
        <div className="flex gap-2 justify-end pb-8">
          {!isNew && (
            <Button variant="outline" onClick={() => {
              const exportData = {
                name, slug, version: "1.0", industry_type: industry, description,
                base_tabs: tabs, extra_labels: labels,
                automation_rules: (() => { try { return JSON.parse(automationRules); } catch { return []; } })(),
                exported_at: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `plantilla-${slug}-v1.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("JSON exportado");
            }}>
              <Download className="w-4 h-4 mr-1.5" />Exportar JSON
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/admin/plantillas")}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />{saving ? "Guardando..." : isNew ? "Crear plantilla" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminPlantillaEditorPage;
