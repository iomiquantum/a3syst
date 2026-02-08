import { useState } from "react";
import { Dna, Mic, Upload, MapPin, Building2, Info, Save, Plus, Pencil, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { useAds } from "@/hooks/useAds";

interface Props { ads: ReturnType<typeof useAds>; }

const businessQuestions = [
  "¿Qué productos o servicios ofrece tu negocio?",
  "¿Quién es tu cliente ideal? (edad, intereses, ubicación)",
  "¿Qué problema principal resuelves para tus clientes?",
  "¿Qué hace único a tu negocio frente a la competencia?",
];

const AdsADNTab = ({ ads }: Props) => {
  const activeBrief = ads.briefs.find(b => b.is_active);

  const [businessName, setBusinessName] = useState(activeBrief?.business_name || "");
  const [industry, setIndustry] = useState(activeBrief?.industry || "");
  const [description, setDescription] = useState(activeBrief?.description || "");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>((activeBrief?.locations as string[]) || []);
  const [briefAnswers, setBriefAnswers] = useState<Record<number, string>>(
    (activeBrief?.answers as any[])?.reduce((acc: any, a: any, i: number) => ({ ...acc, [i]: a }), {}) || {}
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await ads.saveBrief({
      name: businessName || "Mi Brief",
      answers: Object.values(briefAnswers),
      business_name: businessName,
      industry,
      description,
      locations: selectedLocations as any,
    }, activeBrief?.id);
    setSaving(false);
  };

  const addLocation = (loc: string) => {
    if (loc.trim() && !selectedLocations.includes(loc.trim())) {
      setSelectedLocations([...selectedLocations, loc.trim()]);
      setLocationSearch("");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Dna className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">Configura tu Negocio</h2>
          <p className="text-sm text-muted-foreground">Completa estos pasos para personalizar tu experiencia y comenzar a usar la plataforma.</p>
        </div>
      </div>

      {/* Business Brief Header */}
      <Card className="shadow-card bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Dna className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-bold text-foreground text-lg">Tu Business Brief</p>
                <p className="text-sm text-muted-foreground">
                  {activeBrief ? "Perfil de negocio configurado. Haz clic en \"Editar\" para modificar." : "Crea tu primer perfil de negocio."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Crear Nuevo</Button>
              {activeBrief && <Button variant="outline" size="sm"><Pencil className="w-4 h-4 mr-1" /> Editar</Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Info className="w-4 h-4 text-primary" /></div>
            <p className="font-bold text-foreground">Preguntas que debes responder:</p>
          </div>
          <div className="space-y-4">
            {businessQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-1 shadow-sm">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1.5 font-medium">{q}</p>
                  <Textarea
                    placeholder="Tu respuesta..."
                    value={briefAnswers[i] || ""}
                    onChange={(e) => setBriefAnswers({ ...briefAnswers, [i]: e.target.value })}
                    className="min-h-[70px] text-sm resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <Button className="gradient-primary text-primary-foreground shadow-md" size="lg">
              <Mic className="w-5 h-5 mr-2" /> Grabar Audio
            </Button>
            <Button variant="outline" size="lg">
              <Upload className="w-5 h-5 mr-2" /> Subir Audio
            </Button>
          </div>

          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
              <Mic className="w-10 h-10 text-primary" />
            </div>
            <Button variant="outline" size="lg" className="shadow-sm">
              <Mic className="w-4 h-4 mr-2" /> Comenzar a Grabar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="font-bold text-foreground">Ubicación de tu Audiencia</p>
              <p className="text-sm text-muted-foreground">Selecciona dónde quieres mostrar tus anuncios.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Buscar ubicación</Label>
            <Input
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addLocation(locationSearch); }}
              placeholder="Buscar ciudad o país..."
              className="h-11"
            />
          </div>
          {selectedLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicaciones seleccionadas</p>
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map(loc => (
                  <Badge key={loc} variant="secondary" className="gap-1.5 py-1.5 px-3 text-sm cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => setSelectedLocations(selectedLocations.filter(l => l !== loc))}>
                    📍 {loc} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Negocio */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary" /></div>
            <p className="font-bold text-foreground">Información del Negocio</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre del Negocio</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Mi Clínica" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industria</Label>
              <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Salud y bienestar" className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe brevemente tu negocio..." className="min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground shadow-md" size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar y Continuar"}
        </Button>
      </div>
    </div>
  );
};

export default AdsADNTab;
