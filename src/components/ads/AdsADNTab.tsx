import { useState } from "react";
import { Dna, Mic, Upload, MapPin, Building2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const businessQuestions = [
  "¿Qué productos o servicios ofrece tu negocio?",
  "¿Quién es tu cliente ideal? (edad, intereses, ubicación)",
  "¿Qué problema principal resuelves para tus clientes?",
  "¿Qué hace único a tu negocio frente a la competencia?",
];

const AdsADNTab = () => {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [briefAnswers, setBriefAnswers] = useState<Record<number, string>>({});

  const handleSaveBrief = () => {
    toast.success("Business Brief guardado correctamente");
  };

  const addLocation = (loc: string) => {
    if (loc && !selectedLocations.includes(loc)) {
      setSelectedLocations([...selectedLocations, loc]);
      setLocationSearch("");
    }
  };

  const removeLocation = (loc: string) => {
    setSelectedLocations(selectedLocations.filter(l => l !== loc));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Dna className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Configura tu Negocio</h2>
          <p className="text-sm text-muted-foreground">Completa estos pasos para personalizar tu experiencia y comenzar a usar la plataforma.</p>
        </div>
      </div>

      {/* Business Brief */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dna className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Tu Business Brief</p>
                <p className="text-sm text-muted-foreground">Perfil de negocio configurado. Haz clic en "Editar" para modificar.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">+ Crear Nuevo</Button>
              <Button variant="outline" size="sm">✏️ Editar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preguntas */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Preguntas que debes responder:</p>
          </div>
          <div className="space-y-3">
            {businessQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{q}</p>
                  <Textarea
                    placeholder="Tu respuesta..."
                    value={briefAnswers[i] || ""}
                    onChange={(e) => setBriefAnswers({ ...briefAnswers, [i]: e.target.value })}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <Button className="gradient-primary text-primary-foreground">
              <Mic className="w-4 h-4 mr-1.5" /> Grabar Audio
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-1.5" /> Subir Audio
            </Button>
          </div>

          <div className="flex justify-center py-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="lg">
              <Mic className="w-4 h-4 mr-1.5" /> Comenzar a Grabar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación de Audiencia */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Ubicación de tu Audiencia</p>
              <p className="text-sm text-muted-foreground">Selecciona dónde quieres mostrar tus anuncios. Esta ubicación se usará para generar intereses más relevantes en tu brief.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Buscar ubicación</Label>
            <Input
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addLocation(locationSearch); }}
              placeholder="Buscar ciudad o país..."
            />
          </div>

          {selectedLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Ubicaciones seleccionadas</p>
              <p className="text-xs text-muted-foreground">Ciudades</p>
              <div className="flex flex-wrap gap-2">
                {selectedLocations.map(loc => (
                  <Badge key={loc} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeLocation(loc)}>
                    📍 {loc} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Negocio */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Información del Negocio</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Negocio</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Mi Clínica" />
            </div>
            <div className="space-y-2">
              <Label>Industria</Label>
              <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Salud y bienestar" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe brevemente tu negocio..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveBrief} className="gradient-primary text-primary-foreground" size="lg">
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default AdsADNTab;
