import { useState, useRef } from "react";
import { Upload, Trash2, Loader2, Plus, Palette, Eye, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useBrandStyles, type BrandStyle } from "@/hooks/useBrandStyles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  selectedStyleId: string | null;
  onSelectStyle: (style: BrandStyle | null) => void;
}

const MAX_IMAGES = 10;

const BrandStyleManager = ({ selectedStyleId, onSelectStyle }: Props) => {
  const { styles, loading, createStyle, updateStyle, deleteStyle, uploadImage, canCreate } = useBrandStyles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("Estilo 1");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Escribe un nombre para el estilo"); return; }
    if (pendingFiles.length === 0) { toast.error("Sube al menos una imagen de referencia"); return; }

    setUploading(true);
    const urls: string[] = [];
    for (const file of pendingFiles) {
      const url = await uploadImage(file);
      if (url) urls.push(url);
    }

    if (urls.length === 0) { setUploading(false); return; }

    const style = await createStyle(newName, urls);
    setUploading(false);

    if (!style) return;

    // Now analyze the images with AI
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-brand-style", {
        body: { styleId: style.id, imageUrls: urls },
      });
      if (error) throw error;
      if (data?.palette && data?.description) {
        await updateStyle(style.id, {
          palette: data.palette,
          style_description: data.description,
        });
        toast.success("Estilo creado y analizado con IA");
      }
    } catch (err) {
      console.error(err);
      toast.error("Estilo guardado, pero falló el análisis de IA");
    } finally {
      setAnalyzing(false);
      setDialogOpen(false);
      setPendingFiles([]);
      setPendingPreviews([]);
      setNewName(`Estilo ${styles.length + 2}`);
    }
  };

  const selectedStyle = styles.find(s => s.id === selectedStyleId) || null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-primary" />
          Estilo de marca (opcional)
        </Label>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  Sube logos, anuncios o imágenes de tus redes sociales. La IA extraerá paleta de colores y estilo visual.
                </p>

                {pendingPreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
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

              <Button
                onClick={handleCreate}
                disabled={uploading || analyzing || pendingFiles.length === 0}
                className="w-full gap-2 gradient-primary text-primary-foreground"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo imágenes…</>
                ) : analyzing ? (
                  <><Sparkles className="w-4 h-4 animate-pulse" /> Analizando estilo con IA…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Crear y analizar estilo</>
                )}
              </Button>
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
                {/* Color dots preview */}
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
          Aún no tienes estilos. Crea uno subiendo imágenes de tus redes sociales.
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
        </div>
      )}
    </div>
  );
};

export default BrandStyleManager;
