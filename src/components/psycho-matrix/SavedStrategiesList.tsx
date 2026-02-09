import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePsychoStrategies, usePsychoServices, useUpdateStrategy, useDeleteStrategy, useDuplicateStrategy, type PsychoStrategy } from "@/hooks/usePsychoMatrix";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada, canalsPNL, construirPrompt,
} from "@/lib/psychoMatrixData";
import { Copy, Sparkles, Pencil, Trash2, CopyPlus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const buscar = (lista: { id: string; label: string }[], id: string) => lista.find((i) => i.id === id)?.label || id;

const SavedStrategiesList = () => {
  const { data: estrategias = [], isLoading } = usePsychoStrategies();
  const { data: servicios = [] } = usePsychoServices();
  const updateStrategy = useUpdateStrategy();
  const deleteStrategy = useDeleteStrategy();
  const duplicateStrategy = useDuplicateStrategy();
  const { toast } = useToast();

  const serviciosMap = useMemo(() => {
    const map: Record<string, { name: string; core_benefit: string; price: number; observations: string }> = {};
    servicios.forEach(s => { map[s.id] = { name: s.name, core_benefit: s.core_benefit, price: s.price, observations: s.observations }; });
    return map;
  }, [servicios]);
  const [editingStrategy, setEditingStrategy] = useState<PsychoStrategy | null>(null);
  const [editFields, setEditFields] = useState({
    name: "",
    archetype: "",
    brand_voice: "",
    persuasion_trigger: "",
    generation: "",
    advanced_tech: "",
    generated_prompt: "",
  });

  const copiarPrompt = (prompt: string | null) => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    toast({ title: "Prompt copiado" });
  };

  const openEdit = (s: PsychoStrategy) => {
    setEditingStrategy(s);
    setEditFields({
      name: s.name,
      archetype: s.archetype,
      brand_voice: s.brand_voice,
      persuasion_trigger: s.persuasion_trigger,
      generation: s.generation,
      advanced_tech: s.advanced_tech || "",
      generated_prompt: s.generated_prompt || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStrategy) return;
    await updateStrategy.mutateAsync({
      id: editingStrategy.id,
      updates: {
        name: editFields.name,
        archetype: editFields.archetype,
        brand_voice: editFields.brand_voice,
        persuasion_trigger: editFields.persuasion_trigger,
        generation: editFields.generation,
        advanced_tech: editFields.advanced_tech || null,
        generated_prompt: editFields.generated_prompt,
      },
    });
    setEditingStrategy(null);
  };

  const handleDuplicate = async (s: PsychoStrategy) => {
    await duplicateStrategy.mutateAsync(s);
  };

  const handleDelete = async (id: string) => {
    await deleteStrategy.mutateAsync(id);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-8">Cargando estrategias...</p>;
  if (estrategias.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No hay estrategias guardadas aún.</p>;

  return (
    <>
      <div className="grid gap-3">
        {estrategias.map((s) => (
          <Card key={s.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <p className="font-medium text-foreground truncate">{s.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposDigitales, s.archetype)}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposMarca, s.brand_voice)}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{buscar(disparadoresPersuasion, s.persuasion_trigger)}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{buscar(codigosGeneracionales, s.generation)}</Badge>
                    {s.advanced_tech && <Badge variant="outline" className="text-[10px]">{buscar(psicologiaAvanzada, s.advanced_tech)}</Badge>}
                  </div>
                  {s.generated_prompt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{s.generated_prompt}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Editar estrategia">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(s)} title="Duplicar estrategia" disabled={duplicateStrategy.isPending}>
                    <CopyPlus className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copiarPrompt(s.generated_prompt)} title="Copiar prompt">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Eliminar" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingStrategy} onOpenChange={(open) => { if (!open) setEditingStrategy(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar estrategia
            </DialogTitle>
          </DialogHeader>
          {editingStrategy && (
            <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-80px)]">
              <div className="space-y-4 pr-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre</Label>
                  <Input value={editFields.name} onChange={e => setEditFields({ ...editFields, name: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Arquetipo Objetivo</Label>
                    <Select value={editFields.archetype} onValueChange={v => setEditFields({ ...editFields, archetype: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {arquetiposDigitales.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Voz de Marca</Label>
                    <Select value={editFields.brand_voice} onValueChange={v => setEditFields({ ...editFields, brand_voice: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {arquetiposMarca.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Disparador</Label>
                    <Select value={editFields.persuasion_trigger} onValueChange={v => setEditFields({ ...editFields, persuasion_trigger: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {disparadoresPersuasion.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Generación</Label>
                    <Select value={editFields.generation} onValueChange={v => setEditFields({ ...editFields, generation: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {codigosGeneracionales.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Técnica Avanzada (opcional)</Label>
                  <Select value={editFields.advanced_tech || "none"} onValueChange={v => setEditFields({ ...editFields, advanced_tech: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin técnica avanzada</SelectItem>
                      {psicologiaAvanzada.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Prompt de la estrategia</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        const svc = serviciosMap[editingStrategy.service_id];
                        if (!svc) {
                          toast({ title: "Servicio no encontrado", description: "No se pudo regenerar el prompt.", variant: "destructive" });
                          return;
                        }
                        const arqLabel = buscar(arquetiposDigitales, editFields.archetype);
                        const marcaLabel = buscar(arquetiposMarca, editFields.brand_voice);
                        const dispLabel = buscar(disparadoresPersuasion, editFields.persuasion_trigger);
                        const genLabel = buscar(codigosGeneracionales, editFields.generation);
                        const avzLabel = editFields.advanced_tech ? buscar(psicologiaAvanzada, editFields.advanced_tech) : undefined;
                        const newPrompt = construirPrompt(svc, arqLabel, marcaLabel, dispLabel, genLabel, avzLabel);
                        setEditFields(prev => ({ ...prev, generated_prompt: newPrompt }));
                        toast({ title: "Prompt regenerado" });
                      }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerar
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.generated_prompt}
                    onChange={e => setEditFields({ ...editFields, generated_prompt: e.target.value })}
                    className="min-h-[180px] text-xs font-mono"
                    placeholder="El prompt generado para esta estrategia..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Este prompt se usa al generar contenido con esta estrategia en el generador de contenido.
                  </p>
                </div>

                <Button
                  onClick={handleSaveEdit}
                  disabled={updateStrategy.isPending}
                  className="w-full gradient-primary text-primary-foreground gap-2"
                >
                  Guardar cambios
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedStrategiesList;
