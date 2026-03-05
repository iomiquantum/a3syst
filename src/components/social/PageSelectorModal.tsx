import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Instagram, Loader2 } from "lucide-react";
import type { FacebookPage } from "@/hooks/useFacebookAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: FacebookPage[];
  onSelect: (page: FacebookPage) => Promise<void>;
  saving: boolean;
}

const PageSelectorModal = ({ open, onOpenChange, pages, onSelect, saving }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    const page = pages.find((p) => p.page_id === selectedId);
    if (page) onSelect(page);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecciona tu página de Facebook</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Elige la página que quieres vincular a tu negocio para publicar contenido.
        </p>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {pages.map((page) => (
            <button
              key={page.page_id}
              type="button"
              onClick={() => setSelectedId(page.page_id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                selectedId === page.page_id
                  ? "border-[#1877F2] bg-[#1877F2]/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              {page.page_picture ? (
                <img
                  src={page.page_picture}
                  alt={page.page_name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0 text-lg">
                  📘
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{page.page_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">ID: {page.page_id}</span>
                  {page.instagram && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-600"
                    >
                      <Instagram className="w-2.5 h-2.5" />
                      @{page.instagram.username}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedId === page.page_id && (
                <CheckCircle2 className="w-5 h-5 text-[#1877F2] shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
            disabled={!selectedId || saving}
            onClick={handleConfirm}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Conectar página
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PageSelectorModal;
