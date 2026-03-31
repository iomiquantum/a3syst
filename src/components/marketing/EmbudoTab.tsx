import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Stage {
  id?: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
}

const COLOR_OPTIONS = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#EF4444", label: "Rojo" },
  { value: "#F59E0B", label: "Amarillo" },
  { value: "#8B5CF6", label: "Morado" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#F97316", label: "Naranja" },
  { value: "#6B7280", label: "Gris" },
];

const EmbudoTab = () => {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  const [stages, setStages] = useState<Stage[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: dbStages, isLoading } = useQuery({
    queryKey: ["pipeline-stages", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pipeline_stages")
        .select("*")
        .eq("clinic_id", clinicId!)
        .order("position");
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!clinicId,
  });

  useEffect(() => {
    if (dbStages) setStages(dbStages);
  }, [dbStages]);

  const addStage = () => {
    setStages(prev => [...prev, { name: "", color: "#3B82F6", position: prev.length, is_default: false }]);
    setDirty(true);
  };

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i })));
    setDirty(true);
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= stages.length) return;
    const copy = [...stages];
    [copy[idx], copy[ni]] = [copy[ni], copy[idx]];
    setStages(copy.map((s, i) => ({ ...s, position: i })));
    setDirty(true);
  };

  const updateStage = (idx: number, field: keyof Stage, value: any) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      // Delete existing
      await (supabase as any).from("pipeline_stages").delete().eq("clinic_id", clinicId);
      // Insert all
      const toInsert = stages.filter(s => s.name.trim()).map((s, i) => ({
        clinic_id: clinicId,
        name: s.name,
        color: s.color,
        position: i,
        is_default: s.is_default,
      }));
      if (toInsert.length) {
        const { error } = await (supabase as any).from("pipeline_stages").insert(toInsert);
        if (error) throw error;
      }
      toast.success("Embudo guardado");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", clinicId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Personaliza las etapas del proceso comercial de tu clínica</p>
      </div>

      {/* Preview pills */}
      {stages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {stages.filter(s => s.name.trim()).map((s, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: s.color }}>
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Editable list */}
      <div className="space-y-2">
        {stages.map((stage, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border">
            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
            <Input value={stage.name} onChange={e => updateStage(idx, "name", e.target.value)} placeholder="Nombre de la etapa" className="flex-1 h-8" />
            <Select value={stage.color} onValueChange={v => updateStage(idx, "color", v)}>
              <SelectTrigger className="w-[120px] h-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />{c.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stage.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
            <button onClick={() => moveStage(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
            <button onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
            <button onClick={() => removeStage(idx)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
          </div>
        ))}
      </div>

      {stages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay etapas configuradas. Crea tu primera etapa del embudo.</p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addStage}><Plus className="w-4 h-4 mr-1" /> Nueva etapa</Button>
        {dirty && <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>}
      </div>
    </div>
  );
};

export default EmbudoTab;
