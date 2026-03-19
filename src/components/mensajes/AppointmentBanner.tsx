import { useState } from "react";
import { CalendarCheck, CheckCircle, XCircle, DollarSign, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { PipelineConversation } from "@/hooks/useConversationsByPipeline";

interface Props {
  conversation: PipelineConversation;
  onActionComplete?: () => void;
}

const PROGRESS_STEPS = [
  { key: "agendado", label: "Agendado" },
  { key: "reminder_1_sent", label: "R1" },
  { key: "reminder_2_sent", label: "R2" },
  { key: "confirmado", label: "Confirmado" },
  { key: "asistio", label: "Asistió" },
  { key: "show_con_venta", label: "Venta" },
];

const AppointmentBanner = ({ conversation: c, onActionComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"attendance" | "sale" | null>(null);

  if (c.pipeline_tab !== "agendados" || !c.appointment_date) return null;

  const appointmentPassed = new Date(c.appointment_date) < new Date();
  const showAttendanceBanner = appointmentPassed && c.appointment_attended === null;
  const currentStepIdx = PROGRESS_STEPS.findIndex(s => s.key === c.appointment_status);

  const handleAttended = async (attended: boolean) => {
    if (attended) {
      await (supabase as any).from("conversations").update({
        appointment_attended: true,
        appointment_attended_marked_by: user?.id,
        appointment_attended_at: new Date().toISOString(),
        appointment_status: "asistio",
      }).eq("id", c.id);
      setStep("sale");
      toast.success("Asistencia registrada");
    } else {
      await (supabase as any).from("conversations").update({
        appointment_attended: false,
        appointment_attended_marked_by: user?.id,
        appointment_attended_at: new Date().toISOString(),
        appointment_status: "no_show",
        pipeline_tab: "no_show",
      }).eq("id", c.id);

      await supabase.from("conversation_pipeline_history").insert({
        conversation_id: c.id,
        clinic_id: "",
        from_tab: "agendados",
        to_tab: "no_show",
        moved_by: "manual",
        reason: "No-show marcado por agente",
      });

      toast.success("Marcado como No-show");
      setStep(null);
      onActionComplete?.();
    }
  };

  const handleSale = async (hadSale: boolean) => {
    if (hadSale) {
      await (supabase as any).from("conversations").update({
        appointment_had_sale: true,
        appointment_sale_marked_by: user?.id,
        appointment_sale_marked_at: new Date().toISOString(),
        appointment_status: "show_con_venta",
        pipeline_tab: "pacientes",
      }).eq("id", c.id);
      toast.success("¡Venta registrada! Movido a Pacientes");
    } else {
      await (supabase as any).from("conversations").update({
        appointment_had_sale: false,
        appointment_status: "show_sin_venta",
        pipeline_tab: "show_sin_venta",
      }).eq("id", c.id);
      toast.success("Movido a Show sin venta");
    }
    setStep(null);
    onActionComplete?.();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" }); }
    catch { return d; }
  };

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30 space-y-2">
      {/* Appointment info card */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="flex items-center gap-1">
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
          <strong>Cita:</strong> {formatDate(c.appointment_date)} {c.appointment_time && `a las ${c.appointment_time}`}
        </span>
        {c.appointment_service && (
          <span className="text-muted-foreground">🏥 {c.appointment_service}</span>
        )}
        <span className="text-muted-foreground capitalize">
          Estado: {c.appointment_status?.replace(/_/g, " ") || "agendado"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0.5">
        {PROGRESS_STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-0.5">
            <div className={cn(
              "h-1.5 rounded-full flex-1 min-w-[20px]",
              i <= currentStepIdx ? "bg-emerald-500" : "bg-border"
            )} />
            <span className={cn(
              "text-[8px]",
              i <= currentStepIdx ? "text-emerald-600 font-medium" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Attendance banner */}
      {showAttendanceBanner && step !== "sale" && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <span className="text-xs text-amber-700 dark:text-amber-300 flex-1">
            La cita de <strong>{c.contactName}</strong> era {formatDate(c.appointment_date)} {c.appointment_time && `a las ${c.appointment_time}`}. ¿Asistió?
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200" onClick={() => handleAttended(true)}>
            <CheckCircle className="w-3 h-3" /> Sí, asistió
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-200" onClick={() => handleAttended(false)}>
            <XCircle className="w-3 h-3" /> No asistió
          </Button>
        </div>
      )}

      {/* Sale banner */}
      {step === "sale" && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <span className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
            <strong>{c.contactName}</strong> asistió a su cita. ¿Hubo venta?
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200" onClick={() => handleSale(true)}>
            <DollarSign className="w-3 h-3" /> Sí, con venta
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-orange-600 border-orange-200" onClick={() => handleSale(false)}>
            <UserX className="w-3 h-3" /> No, sin venta
          </Button>
        </div>
      )}
    </div>
  );
};

export default AppointmentBanner;
