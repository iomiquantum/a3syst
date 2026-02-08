import { useState } from "react";
import { Phone, PhoneOutgoing, PhoneIncoming, Mail, MapPin, Tag, UserCheck, Clock, MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CRMContact, CallLog, FUNNEL_STAGES, CALL_OUTCOMES } from "@/hooks/useCRM";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  contact: CRMContact;
  callLogs: CallLog[];
  onUpdate: (id: string, data: Partial<CRMContact>) => void;
  onLogCall: (contactId: string, data: { call_type: string; outcome: string; notes: string; duration_seconds: number }) => void;
  onConvert: (contact: CRMContact) => void;
}

const ContactDetail = ({ contact, callLogs, onUpdate, onLogCall, onConvert }: Props) => {
  const [newTag, setNewTag] = useState("");
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callForm, setCallForm] = useState({ call_type: "outbound", outcome: "contestada", notes: "", duration_seconds: 0 });

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const current = contact.tags || [];
    if (!current.includes(newTag.trim())) {
      onUpdate(contact.id, { tags: [...current, newTag.trim()] });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    onUpdate(contact.id, { tags: (contact.tags || []).filter(t => t !== tag) });
  };

  const handleLogCall = () => {
    onLogCall(contact.id, callForm);
    setCallForm({ call_type: "outbound", outcome: "contestada", notes: "", duration_seconds: 0 });
    setCallDialogOpen(false);
  };

  const stageInfo = FUNNEL_STAGES.find(s => s.value === contact.funnel_stage);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">{contact.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4" /> {contact.phone}
          </div>
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" /> {contact.email}
            </div>
          )}
          {contact.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" /> {contact.location}
            </div>
          )}
        </div>

        <Separator />

        {/* Funnel Stage */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Etapa del embudo</Label>
          <Select value={contact.funnel_stage} onValueChange={v => onUpdate(contact.id, { funnel_stage: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUNNEL_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", s.color)} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Tag className="w-3 h-3" /> Etiquetas
          </Label>
          <div className="flex flex-wrap gap-1">
            {(contact.tags || []).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              placeholder="Nueva etiqueta"
              className="h-7 text-xs"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTag()}
            />
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddTag}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
          <Textarea
            className="text-sm min-h-[80px]"
            value={contact.notes || ""}
            onChange={e => onUpdate(contact.id, { notes: e.target.value })}
            placeholder="Agregar notas sobre el contacto..."
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <PhoneOutgoing className="w-4 h-4 mr-2" /> Registrar llamada
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar llamada - {contact.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Tipo</Label>
                    <Select value={callForm.call_type} onValueChange={v => setCallForm(p => ({ ...p, call_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Saliente</SelectItem>
                        <SelectItem value="inbound">Entrante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Resultado</Label>
                    <Select value={callForm.outcome} onValueChange={v => setCallForm(p => ({ ...p, outcome: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CALL_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Duración (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={Math.round(callForm.duration_seconds / 60)}
                    onChange={e => setCallForm(p => ({ ...p, duration_seconds: parseInt(e.target.value || "0") * 60 }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Notas de la llamada</Label>
                  <Textarea
                    value={callForm.notes}
                    onChange={e => setCallForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Resumen de la conversación..."
                  />
                </div>
                <Button className="w-full" onClick={handleLogCall}>Guardar llamada</Button>
              </div>
            </DialogContent>
          </Dialog>

          {!contact.patient_id && (
            <Button className="w-full" variant="default" onClick={() => onConvert(contact)}>
              <UserCheck className="w-4 h-4 mr-2" /> Convertir a paciente
            </Button>
          )}
          {contact.patient_id && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Ya es paciente</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Call History */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Historial de llamadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {callLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin llamadas registradas</p>
            ) : (
              <div className="space-y-2">
                {callLogs.map(log => {
                  const outcome = CALL_OUTCOMES.find(o => o.value === log.outcome);
                  return (
                    <div key={log.id} className="border border-border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          {log.call_type === "outbound" ? <PhoneOutgoing className="w-3 h-3 text-blue-500" /> : <PhoneIncoming className="w-3 h-3 text-green-500" />}
                          <span className="font-medium">{log.call_type === "outbound" ? "Saliente" : "Entrante"}</span>
                          <Badge variant="outline" className="text-[10px] px-1">{outcome?.label}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM HH:mm", { locale: es })}
                        </span>
                      </div>
                      {log.duration_seconds > 0 && (
                        <p className="text-[10px] text-muted-foreground">{Math.round(log.duration_seconds / 60)} min</p>
                      )}
                      {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default ContactDetail;
