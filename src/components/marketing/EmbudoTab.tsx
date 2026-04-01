import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { EMBUDO_STAGES, useClinicPipelineTabs } from "@/hooks/useClinicPipelineTabs";

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
  const { tabs: pipelineTabs, loading: tabsLoading } = useClinicPipelineTabs();

  const { data: customStages = [], isLoading: customLoading } = useQuery({
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

  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#3B82F6");

  const allStages = useMemo(() => {
    const hardcoded = EMBUDO_STAGES.filter(s => s.key !== "todos").map(s => {
      const tab = pipelineTabs.find(t => t.key === s.key);
      return { key: s.key, label: s.label, color: s.color, count: tab?.count || 0, isHardcoded: true, id: undefined as string | undefined };
    });
    const custom = (customStages as Stage[])
      .filter(cs => !hardcoded.some(h => h.label.toLowerCase() === cs.name.toLowerCase()))
      .map(cs => ({ key: cs.name.toLowerCase().replace(/\s+/g, "_"), label: cs.name, color: "bg-muted text-muted-foreground", count: 0, isHardcoded: false, id: cs.id }));
    return [...hardcoded, ...custom];
  }, [pipelineTabs, customStages]);

  const addCustomStage = useMutation({
    mutationFn: async () => {
      if (!clinicId || !newStageName.trim()) return;
      const { error } = await (supabase as any).from("pipeline_stages").insert({ clinic_id: clinicId, name: newStageName.trim(), color: newStageColor, position: (customStages as Stage[]).length, is_default: false });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipeline-stages", clinicId] }); setNewStageName(""); toast.success("Etapa personalizada añadida"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCustomStage = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("pipeline_stages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipeline-stages", clinicId] }); toast.success("Etapa eliminada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (tabsLoading || customLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

  const totalConversations = pipelineTabs.find(t => t.key === "todos")?.count || 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Etapas del embudo comercial — {totalConversations} conversaciones activas</p>
      </div>

      {/* Preview pills */}
      {allStages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {allStages.map(s => (
            <Badge key={s.key} variant="secondary" className={`text-xs gap-1 ${s.color}`}>
              {s.label} {s.count > 0 && <span className="font-bold">({s.count})</span>}
            </Badge>
          ))}
        </div>
      )}

      {/* Stage list */}
      <div className="space-y-2">
        {allStages.map((stage, idx) => (
          <div key={stage.key} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
            <span className="text-xs text-muted-foreground w-6 shrink-0">#{idx + 1}</span>
            <Badge variant="secondary" className={`text-[10px] shrink-0 ${stage.color}`}>{stage.label}</Badge>
            <span className="flex-1" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="w-3 h-3" /><span>{stage.count}</span></div>
            {!stage.isHardcoded && stage.id && (
              <button onClick={() => deleteCustomStage.mutate(stage.id!)} className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
            )}
            {stage.isHardcoded && <Badge variant="outline" className="text-[9px] opacity-50">Sistema</Badge>}
          </div>
        ))}
      </div>

      {/* Add custom stage */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Nueva etapa personalizada..." className="flex-1 h-8" onKeyDown={e => e.key === "Enter" && newStageName.trim() && addCustomStage.mutate()} />
        <Select value={newStageColor} onValueChange={setNewStageColor}>
          <SelectTrigger className="w-[100px] h-8">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: newStageColor }} /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map(c => (<SelectItem key={c.value} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />{c.label}</div></SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => addCustomStage.mutate()} disabled={!newStageName.trim() || addCustomStage.isPending}><Plus className="w-4 h-4 mr-1" /> Añadir</Button>
      </div>
    </div>
  );
};

export default EmbudoTab;
