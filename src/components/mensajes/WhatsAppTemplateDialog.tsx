import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
  conversationId: string;
  toNumber: string;
  contactName: string;
}

interface MetaTemplateComponent {
  type: string;
  text: string;
  format: string | null;
  variableIndexes: number[];
}

interface MetaTemplateItem {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  preview: string;
  variableIndexes: number[];
  components: MetaTemplateComponent[];
}

const WhatsAppTemplateDialog = ({
  open,
  onOpenChange,
  clinicId,
  conversationId,
  toNumber,
  contactName,
}: Props) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MetaTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const loadTemplates = async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-templates", {
        body: {
          clinic_id: clinicId,
          approved_only: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const nextTemplates = (data?.templates || []) as MetaTemplateItem[];
      setTemplates(nextTemplates);
      setBusinessName(data?.business_name || null);

      if (nextTemplates.length > 0) {
        setSelectedTemplateId((current) =>
          current && nextTemplates.some((template) => template.id === current)
            ? current
            : nextTemplates[0].id,
        );
      } else {
        setSelectedTemplateId("");
      }
    } catch (error: any) {
      toast.error(error.message || "No se pudieron cargar los templates aprobados");
      setTemplates([]);
      setSelectedTemplateId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  useEffect(() => {
    if (!selectedTemplate) {
      setVariableValues({});
      return;
    }

    setVariableValues((current) => {
      const nextValues: Record<string, string> = {};
      selectedTemplate.variableIndexes.forEach((index) => {
        nextValues[String(index)] = current[String(index)] ?? "";
      });
      return nextValues;
    });
  }, [selectedTemplate]);

  const handleVariableChange = (index: number, value: string) => {
    setVariableValues((current) => ({
      ...current,
      [String(index)]: value,
    }));
  };

  const buildTemplateComponents = (template: MetaTemplateItem) =>
    template.components
      .filter((component) => ["HEADER", "BODY"].includes(component.type) && component.variableIndexes.length > 0)
      .map((component) => ({
        type: component.type.toLowerCase(),
        parameters: component.variableIndexes.map((index) => ({
          type: "text",
          text: (variableValues[String(index)] || "").trim(),
        })),
      }))
      .filter((component) => component.parameters.length > 0);

  const canSend = Boolean(
    selectedTemplate &&
      toNumber &&
      selectedTemplate.variableIndexes.every((index) => (variableValues[String(index)] || "").trim()),
  );

  const handleSendTemplate = async () => {
    if (!selectedTemplate) {
      toast.error("Selecciona un template");
      return;
    }

    if (!toNumber) {
      toast.error("Esta conversación no tiene un número válido");
      return;
    }

    if (!canSend) {
      toast.error("Completa todas las variables antes de enviarlo");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          clinic_id: clinicId,
          to_number: toNumber,
          message_type: "template",
          type: "template",
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
          template_components: buildTemplateComponents(selectedTemplate),
          conversation_id: conversationId,
          sent_by: user?.id || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Template enviado correctamente");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "No se pudo enviar el template");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Templates aprobados de WhatsApp</DialogTitle>
          <DialogDescription>
            {businessName
              ? `Mostrando los templates aprobados de ${businessName}.`
              : "Consulta y envía los templates aprobados del negocio activo."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Enviar template a {contactName}</p>
              <p className="text-xs text-muted-foreground">
                Usa esta sección cuando la ventana de 24 horas esté cerrada o quieras responder con un template aprobado.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadTemplates} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">Templates disponibles</p>
                <p className="text-xs text-muted-foreground">Solo se muestran templates aprobados.</p>
              </div>

              <ScrollArea className="h-[360px]">
                <div className="p-2 space-y-2">
                  {loading && Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-md border border-border p-3 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ))}

                  {!loading && templates.length === 0 && (
                    <div className="px-3 py-8 text-center space-y-2">
                      <MessageSquareText className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">No encontramos templates aprobados</p>
                      <p className="text-xs text-muted-foreground">Revisa en Meta y vuelve a sincronizar.</p>
                    </div>
                  )}

                  {!loading && templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-3 text-left transition-colors",
                        selectedTemplateId === template.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.preview}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 uppercase">{template.language}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="capitalize">{template.category.toLowerCase()}</Badge>
                        {template.variableIndexes.length > 0 && (
                          <Badge variant="outline">{template.variableIndexes.length} variable(s)</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-lg border border-border">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium">Detalle del template</p>
                <p className="text-xs text-muted-foreground">Previsualiza el mensaje y completa sus variables.</p>
              </div>

              <div className="p-4 space-y-4">
                {!selectedTemplate ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">Selecciona un template</p>
                    <p className="text-xs text-muted-foreground">Aquí verás la vista previa y los campos necesarios.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedTemplate.status}</Badge>
                      <Badge variant="outline">{selectedTemplate.language}</Badge>
                      <Badge variant="outline" className="capitalize">{selectedTemplate.category.toLowerCase()}</Badge>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{selectedTemplate.preview}</p>
                    </div>

                    {selectedTemplate.variableIndexes.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Variables del template</p>
                            <p className="text-xs text-muted-foreground">Completa cada placeholder antes de enviar.</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {selectedTemplate.variableIndexes.map((index) => (
                              <div key={index} className="space-y-2">
                                <Label htmlFor={`template-variable-${index}`}>Variable {`{{${index}}}`}</Label>
                                <Input
                                  id={`template-variable-${index}`}
                                  value={variableValues[String(index)] || ""}
                                  onChange={(event) => handleVariableChange(index, event.target.value)}
                                  placeholder={`Valor para {{${index}}}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={handleSendTemplate} disabled={!canSend || sending || loading}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppTemplateDialog;