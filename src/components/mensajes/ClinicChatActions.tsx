import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, CalendarPlus, RotateCcw, Sparkles, Archive, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pipelineTab: string;
  templateSlug: string | null;
  onMove: (tab: string, reason?: string, metadata?: Record<string, any>) => void;
  onGenerateAI?: () => void;
  appointmentDate?: string | null;
  hasBeenAgendado?: boolean;
}

const ClinicChatActions = ({ pipelineTab, templateSlug, onMove, onGenerateAI, appointmentDate, hasBeenAgendado }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [hadSale, setHadSale] = useState(false);
  const [showAgendadoModal, setShowAgendadoModal] = useState(false);
  const [showConfirmPaciente, setShowConfirmPaciente] = useState(false);
  const [showConfirmRegressSeg, setShowConfirmRegressSeg] = useState(false);
  const [pendingRegressTab, setPendingRegressTab] = useState("");

  // Agendado form state
  const [appointmentFormDate, setAppointmentFormDate] = useState("");
  const [appointmentFormTime, setAppointmentFormTime] = useState("");
  const [appointmentFormService, setAppointmentFormService] = useState("");

  if (templateSlug !== "clinicas") return null;

  const handleMoveToAgendados = () => {
    if (appointmentDate) {
      onMove("agendados", "Movido a agendados manualmente");
    } else {
      setShowAgendadoModal(true);
    }
  };

  const handleAgendadoConfirm = () => {
    if (!appointmentFormDate || !appointmentFormTime) {
      toast.error("Completa al menos fecha y hora");
      return;
    }
    onMove("agendados", "Agendado manualmente", {
      appointment_date: appointmentFormDate,
      appointment_time: appointmentFormTime,
      appointment_service: appointmentFormService || undefined,
    });
    setShowAgendadoModal(false);
    setAppointmentFormDate("");
    setAppointmentFormTime("");
    setAppointmentFormService("");
  };

  const handleMoveToPacientes = () => {
    if (!hasBeenAgendado) {
      setShowConfirmPaciente(true);
    } else {
      onMove("pacientes", "Convertido a paciente");
    }
  };

  const handleMoveFromPacientesToSeguimiento = (tab: string) => {
    setPendingRegressTab(tab);
    setShowConfirmRegressSeg(true);
  };

  // Agendado modal (shared)
  const AgendadoModal = (
    <Dialog open={showAgendadoModal} onOpenChange={setShowAgendadoModal}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agendar cita</DialogTitle>
          <DialogDescription>Completa los datos de la cita para mover a Agendados</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-sm">Fecha *</Label>
            <Input type="date" value={appointmentFormDate} onChange={e => setAppointmentFormDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Hora *</Label>
            <Input type="time" value={appointmentFormTime} onChange={e => setAppointmentFormTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Servicio</Label>
            <Input placeholder="Ej: Consulta general" value={appointmentFormService} onChange={e => setAppointmentFormService(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAgendadoModal(false)}>Cancelar</Button>
          <Button onClick={handleAgendadoConfirm}>Confirmar y agendar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Confirm paciente without agendado
  const ConfirmPacienteModal = (
    <Dialog open={showConfirmPaciente} onOpenChange={setShowConfirmPaciente}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirmar
          </DialogTitle>
          <DialogDescription>
            Este contacto no tiene cita registrada. ¿Confirmas que es paciente?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmPaciente(false)}>Cancelar</Button>
          <Button onClick={() => {
            onMove("pacientes", "Marcado como paciente sin cita previa");
            setShowConfirmPaciente(false);
          }}>Sí, es paciente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Confirm regress from pacientes to seguimiento
  const ConfirmRegressModal = (
    <Dialog open={showConfirmRegressSeg} onOpenChange={setShowConfirmRegressSeg}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Confirmar
          </DialogTitle>
          <DialogDescription>
            Este contacto ya es paciente. ¿Estás seguro de regresarlo a seguimiento?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmRegressSeg(false)}>Cancelar</Button>
          <Button onClick={() => {
            onMove(pendingRegressTab, "Regresado a seguimiento desde pacientes");
            setShowConfirmRegressSeg(false);
          }}>Sí, regresar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (pipelineTab === "agendados") {
    const handleShowConfirm = () => {
      if (hadSale) {
        onMove("pacientes", "Show con venta", { venta: true, show_result: "show" });
      } else {
        onMove("show_sin_venta", "Show sin venta", { venta: false, show_result: "show" });
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

  if (pipelineTab === "pacientes") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleMoveToAgendados}>
          <CalendarPlus className="w-3 h-3" /> Próxima cita
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMoveFromPacientesToSeguimiento("seguimiento_s1")}>
          <RotateCcw className="w-3 h-3" /> Seguimiento
        </Button>
        {AgendadoModal}
        {ConfirmRegressModal}
      </div>
    );
  }

  if (pipelineTab === "no_show") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("seguimiento_s1", "Reagendar desde no-show");
        }}>
          <RotateCcw className="w-3 h-3" /> Reagendar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
          onMove("perdidos", "Marcado como perdido desde no-show");
        }}>
          <Archive className="w-3 h-3" /> Marcar perdido
        </Button>
      </div>
    );
  }

  if (pipelineTab === "show_sin_venta") {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] gap-1">
          <Sparkles className="w-2.5 h-2.5" /> Flujo reconversión
        </Badge>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMoveToPacientes()}>
          <CheckCircle className="w-3 h-3" /> Convertir a paciente
        </Button>
        {ConfirmPacienteModal}
      </div>
    );
  }

  // S9 & S10: Manual stages
  if (pipelineTab === "seguimiento_s9" || pipelineTab === "seguimiento_s10") {
    return (
      <div className="flex items-center gap-1.5">
        {onGenerateAI && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onGenerateAI}>
            <Sparkles className="w-3 h-3" /> Generar con IA
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleMoveToAgendados}>
          <CalendarPlus className="w-3 h-3" /> Agendar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
          onMove("perdidos", `Marcado como perdido desde ${pipelineTab}`);
        }}>
          <Archive className="w-3 h-3" /> Marcar perdido
        </Button>
        {AgendadoModal}
      </div>
    );
  }

  if (pipelineTab === "perdidos") {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toast.info("Campañas de reactivación (próximamente)")}>
          <Send className="w-3 h-3" /> Campaña reactivación
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
          onMove("resueltos_ia", "Reingreso desde perdidos");
        }}>
          <RotateCcw className="w-3 h-3" /> Reingresar
        </Button>
      </div>
    );
  }

  // Default: allow moving to agendados from any seguimiento tab
  if (pipelineTab?.startsWith("seguimiento_s")) {
    return (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleMoveToAgendados}>
          <CalendarPlus className="w-3 h-3" /> Agendar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleMoveToPacientes()}>
          <CheckCircle className="w-3 h-3" /> Paciente
        </Button>
        {AgendadoModal}
        {ConfirmPacienteModal}
      </div>
    );
  }

  return null;
};

export default ClinicChatActions;
