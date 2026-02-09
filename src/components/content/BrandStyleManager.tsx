import { useState, useRef } from "react";
import { Upload, Loader2, Plus, Palette, Eye, X, Sparkles, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBrandStyles, type BrandStyle } from "@/hooks/useBrandStyles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  selectedStyleId: string | null;
  onSelectStyle: (style: BrandStyle | null) => void;
}

const MAX_IMAGES = 4;

const BrandStyleManager = ({ selectedStyleId, onSelectStyle }: Props) => {
  const { styles, loading, createStyle, updateStyle, deleteStyle, uploadImage, canCreate } = useBrandStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("Estilo 1");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ palette: any[]; description: string } | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - pendingFiles.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) toast.info(`Solo se pueden agregar ${MAX_IMAGES} imágenes`);

    setPendingFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setPendingPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const removePending = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
    // Reset analysis if images change
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (pendingFiles.length === 0) { toast.error("Sube al menos una imagen"); return; }

    setUploading(true);
    const urls: string[] = [];
    for (const file of pendingFiles) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }
    setUploading(false);

    if (urls.length === 0) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-brand-style", {
        body: { imageUrls: urls },
      });
      if (error) throw error;
      if (data?.palette && data?.description) {
        setAnalysisResult({ palette: data.palette, description: data.description });
        setEditingDescription(data.description);
        // Store uploaded URLs for later save
        (window as any).__brandPendingUrls = urls;
        toast.success("Análisis completado — revisa y edita el resultado");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al analizar las imágenes con IA");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) { toast.error("Escribe un nombre para el estilo"); return; }
    const urls = (window as any).__brandPendingUrls as string[] | undefined;
    if (!urls?.length) { toast.error("Primero analiza las imágenes"); return; }

    const style = await createStyle(newName, urls);
    if (!style) return;

    await updateStyle(style.id, {
      palette: analysisResult?.palette || [],
      style_description: editingDescription,
    });

    toast.success("Estilo guardado");
    setDialogOpen(false);
    setPendingFiles([]);
    setPendingPreviews([]);
    setAnalysisResult(null);
    setEditingDescription("");
    setNewName(`Estilo ${styles.length + 2}`);
    delete (window as any).__brandPendingUrls;
  };

  const selectedStyle = styles.find(s => s.id === selectedStyleId) || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-primary" />
          Estilo de marca para imágenes (opcional)
        </Label>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { setAnalysisResult(null); setEditingDescription(""); setPendingFiles([]); setPendingPreviews([]); }
        }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" disabled={!canCreate}>
              <Plus className="w-3 h-3" /> Crear estilo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Crear estilo de marca
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre del estilo</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Estilo principal" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Imágenes de referencia ({pendingFiles.length}/{MAX_IMAGES})</Label>
                <p className="text-xs text-muted-foreground">
                  Sube logos, anuncios o imágenes de tus redes. La IA analizará colores y estilo visual.
                </p>

                {pendingPreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {pendingPreviews.map((preview, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePending(i)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pendingFiles.length < MAX_IMAGES && (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5" /> Subir imágenes
                    </Button>
                  </div>
                )}
              </div>

              {/* Analyze button */}
              {!analysisResult && (
                <Button
                  onClick={handleAnalyze}
                  disabled={uploading || analyzing || pendingFiles.length === 0}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo imágenes…</>
                  ) : analyzing ? (
                    <><Sparkles className="w-4 h-4 animate-pulse" /> Analizando con IA…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Analizar imágenes con IA</>
                  )}
                </Button>
              )}

              {/* Analysis result — editable */}
              {analysisResult && (
                <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resultado del análisis</p>
                  
                  {analysisResult.palette?.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Paleta extraída</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {analysisResult.palette.map((c: any, i: number) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <div className="w-7 h-7 rounded-md border border-border" style={{ backgroundColor: c.hex }} />
                            <span className="text-[8px] text-muted-foreground">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Prompt de estilo visual (editable)
                    </Label>
                    <Textarea
                      value={editingDescription}
                      onChange={e => setEditingDescription(e.target.value)}
                      className="min-h-[80px] text-xs"
                      placeholder="Describe el estilo visual que la IA debe seguir…"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Este texto se inyectará como instrucción en cada imagen generada con este estilo.
                    </p>
                  </div>

                  <Button
                    onClick={handleSave}
                    className="w-full gap-2 gradient-primary text-primary-foreground"
                  >
                    <Palette className="w-4 h-4" /> Guardar estilo
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Style chips */}
      {styles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectStyle(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              !selectedStyleId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            Sin estilo
          </button>
          {styles.map(style => (
            <div key={style.id} className="relative group">
              <button
                onClick={() => onSelectStyle(style.id === selectedStyleId ? null : style)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2",
                  style.id === selectedStyleId
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                {style.palette && (style.palette as any[]).length > 0 && (
                  <div className="flex -space-x-1">
                    {(style.palette as any[]).slice(0, 4).map((c: any, i: number) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-background"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                )}
                {style.name}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteStyle(style.id); if (style.id === selectedStyleId) onSelectStyle(null); }}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Crea un estilo subiendo imágenes de referencia de tus redes sociales.
        </p>
      )}

      {/* Selected style details */}
      {selectedStyle && selectedStyle.style_description && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{selectedStyle.name}</span>
          </div>
          {(selectedStyle.palette as any[])?.length > 0 && (
            <div className="flex gap-1.5">
              {(selectedStyle.palette as any[]).map((c: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: c.hex }} />
                  <span className="text-[8px] text-muted-foreground">{c.name}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">{selectedStyle.style_description}</p>
          {selectedStyle.reference_images?.length > 0 && (
            <div className="flex gap-1.5 pt-1">
              {selectedStyle.reference_images.slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="" className="w-10 h-10 rounded-md object-cover border border-border" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandStyleManager;
