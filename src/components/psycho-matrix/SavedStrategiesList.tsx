import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePsychoStrategies, useUpdateStrategy, useDeleteStrategy, type PsychoStrategy } from "@/hooks/usePsychoMatrix";
import {
  arquetiposDigitales, arquetiposMarca, disparadoresPersuasion,
  codigosGeneracionales, psicologiaAvanzada,
} from "@/lib/psychoMatrixData";
import { Copy, Sparkles, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const buscar = (lista: { id: string; label: string }[], id: string) => lista.find((i) => i.id === id)?.label || id;

const SavedStrategiesList = () => {
  const { data: estrategias = [], isLoading } = usePsychoStrategies();
  const updateStrategy = useUpdateStrategy();
  const deleteStrategy = useDeleteStrategy();
  const { toast } = useToast();
  const [editingStrategy, setEditingStrategy] = useState<PsychoStrategy | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

  const copiarPrompt = (prompt: string | null) => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    toast({ title: "Prompt copiado" });
  };

  const openEdit = (s: PsychoStrategy) => {
    setEditingStrategy(s);
    setEditName(s.name);
    setEditPrompt(s.generated_prompt || "");
  };

  const handleSaveEdit = async () => {
    if (!editingStrategy) return;
    await updateStrategy.mutateAsync({
      id: editingStrategy.id,
      updates: { name: editName, generated_prompt: editPrompt },
    });
    setEditingStrategy(null);
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar estrategia
            </DialogTitle>
          </DialogHeader>
          {editingStrategy && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposDigitales, editingStrategy.archetype)}</Badge>
                <Badge variant="secondary" className="text-[10px]">{buscar(arquetiposMarca, editingStrategy.brand_voice)}</Badge>
                <Badge variant="secondary" className="text-[10px]">{buscar(disparadoresPersuasion, editingStrategy.persuasion_trigger)}</Badge>
                <Badge variant="secondary" className="text-[10px]">{buscar(codigosGeneracionales, editingStrategy.generation)}</Badge>
                {editingStrategy.advanced_tech && <Badge variant="outline" className="text-[10px]">{buscar(psicologiaAvanzada, editingStrategy.advanced_tech)}</Badge>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Prompt de la estrategia (editable)</Label>
                <Textarea
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  className="min-h-[200px] text-xs font-mono"
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedStrategiesList;
