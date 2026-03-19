import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, CalendarPlus, RotateCcw, Sparkles, Archive, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pipelineTab: string;
  templateSlug: string | null;
  onMove: (tab: string, reason?: string, metadata?: Record<string, any>) => void;
  onGenerateAI?: () => void;
}

const ClinicChatActions = ({ pipelineTab, templateSlug, onMove, onGenerateAI }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [hadSale, setHadSale] = useState(false);

  if (templateSlug !== "clinicas") return null;

  // agendados: Show/No-show buttons (replaces seguimiento_venta)
  if (pipelineTab === "agendados") {
    const handleShowConfirm = () => {
      if (hadSale) {
        onMove("pacientes", "Show con venta", { venta: true, show_result: "show" });
        toast.success("Movido a Pacientes (con venta)");
      } else {
        onMove("show_sin_venta", "Show sin venta", { venta: false, show_result: "show" });
        toast.success("Movido a Show sin venta");
      }
      setShowModal(false);
    };

    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setShowModal(true)}>
          <CheckCircle className="w-3 h-3" /> Show
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
          onMove("no_show", "No-show", { show_result: "no_show" });
          toast.success("No-show → Marcado");
        }}>
          <XCircle className="w-3 h-3" /> No-show
        </Button>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar asistencia (Show)</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between py-4">
              <Label>¿Hubo venta?</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{hadSale ? "Sí" : "No"}</span>
                <Switch checked={hadSale} onCheckedChange={setHadSale} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleShowConfirm}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // pacientes: Next appointment + history
  if (pipelineTab === "pacientes") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("agendados", "Próxima cita programada", { proxima_cita_scheduled: true });
          toast.success("Programar próxima cita → Agendados");
        }}>
          <CalendarPlus className="w-3 h-3" /> Próxima cita
        </Button>
      </div>
    );
  }

  // no_show: Reagendar
  if (pipelineTab === "no_show") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("seguimiento_c1", "Reagendar desde no-show");
          toast.success("Reagendando → Seguimiento C1");
        }}>
          <RotateCcw className="w-3 h-3" /> Reagendar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
          onMove("perdidos", "Marcado como perdido desde no-show");
          toast.success("Movido a Perdidos");
        }}>
          <Archive className="w-3 h-3" /> Marcar perdido
        </Button>
      </div>
    );
  }

  // show_sin_venta: Flow badges + manual actions
  if (pipelineTab === "show_sin_venta") {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] gap-1">
          <Sparkles className="w-2.5 h-2.5" /> Flujo reconversión
        </Badge>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("pacientes", "Convertido a paciente post-show");
          toast.success("Convertido a paciente");
        }}>
          <CheckCircle className="w-3 h-3" /> Convertir a paciente
        </Button>
      </div>
    );
  }

  // seguimiento_c4, c5: Manual input + AI generate + mark as lost
  if (pipelineTab === "seguimiento_c4" || pipelineTab === "seguimiento_c5") {
    return (
      <div className="flex items-center gap-1.5">
        {onGenerateAI && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onGenerateAI}>
            <Sparkles className="w-3 h-3" /> Generar con IA
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
          onMove("perdidos", `Marcado como perdido desde ${pipelineTab}`);
          toast.success("Movido a Perdidos");
        }}>
          <Archive className="w-3 h-3" /> Marcar perdido
        </Button>
      </div>
    );
  }

  // perdidos: Reactivation
  if (pipelineTab === "perdidos") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toast.info("Campañas de reactivación (próximamente)")}>
          <Send className="w-3 h-3" /> Campaña reactivación
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("resueltos_ia", "Reingreso desde perdidos");
          toast.success("Reingresado al pipeline");
        }}>
          <RotateCcw className="w-3 h-3" /> Reingresar
        </Button>
      </div>
    );
  }

  return null;
};

export default ClinicChatActions;
