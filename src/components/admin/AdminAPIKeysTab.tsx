import { useState } from "react";
import { Key, Save, Eye, EyeOff, ExternalLink, Video, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminAPIKeysTabProps {
  clinics: any[];
  onRefresh: () => void;
}

interface APIKeyConfig {
  key: string;
  label: string;
  description: string;
  icon: typeof Key;
  helpUrl: string;
  helpLabel: string;
  placeholder: string;
  secretName: string;
}

const API_KEYS: APIKeyConfig[] = [
  {
    key: "recall_ai",
    label: "Recall.ai API Key",
    description: "Necesaria para enviar bots de grabación a reuniones de Google Meet y Zoom. El bot se une automáticamente a la videollamada, graba audio/video y envía la grabación al sistema.",
    icon: Video,
    helpUrl: "https://www.recall.ai/",
    helpLabel: "Ir a Recall.ai → Dashboard → API Keys",
    placeholder: "recall_xxxxxxxxxxxxxxxxxxxxxxxx",
    secretName: "RECALL_AI_API_KEY",
  },
  {
    key: "gemini",
    label: "Google Gemini API Key",
    description: "Usada por el motor de IA para transcribir reuniones y generar resúmenes automáticos con items de acción. Utiliza Gemini 1.5 Flash en modo multimodal.",
    icon: Brain,
    helpUrl: "https://aistudio.google.com/apikey",
    helpLabel: "Ir a Google AI Studio → Get API Key",
    placeholder: "AIzaSy...",
    secretName: "GEMINI_API_KEY",
  },
];

const AdminAPIKeysTab = ({ clinics, onRefresh }: AdminAPIKeysTabProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (config: APIKeyConfig) => {
    const value = values[config.key]?.trim();
    if (!value) {
      toast.error("Ingresa una API Key válida");
      return;
    }

    setSaving(prev => ({ ...prev, [config.key]: true }));

    try {
      // Store the key in a global config table or use Supabase secrets
      // For now, we'll store in a simple key-value approach via edge function
      const { error } = await supabase.functions.invoke("save-api-key", {
        body: { key_name: config.secretName, key_value: value },
      });

      if (error) throw error;

      setSaved(prev => ({ ...prev, [config.key]: true }));
      setValues(prev => ({ ...prev, [config.key]: "" }));
      toast.success(`${config.label} guardada correctamente`);
    } catch (err: any) {
      toast.error(`Error al guardar: ${err.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [config.key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Configuración de API Keys para el módulo Reuniones</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estas claves son necesarias para que el sistema de grabación y transcripción de reuniones funcione.
                Se almacenan de forma segura y encriptada. Solo el Super Admin puede configurarlas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {API_KEYS.map(config => {
        const Icon = config.icon;
        const isVisible = visibility[config.key] || false;
        const isSaving = saving[config.key] || false;
        const isSaved = saved[config.key] || false;

        return (
          <Card key={config.key} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  {config.label}
                </CardTitle>
                {isSaved && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Configurada
                  </Badge>
                )}
              </div>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">API Key</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      placeholder={config.placeholder}
                      value={values[config.key] || ""}
                      onChange={e => setValues(prev => ({ ...prev, [config.key]: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVisibility(prev => ({ ...prev, [config.key]: !isVisible }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(config)}
                    disabled={isSaving || !values[config.key]?.trim()}
                    className="shrink-0"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                <a
                  href={config.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {config.helpLabel}
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminAPIKeysTab;
