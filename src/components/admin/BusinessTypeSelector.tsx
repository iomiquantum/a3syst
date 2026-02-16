import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const BUSINESS_CATEGORIES = [
  { value: "clinica_medica", label: "Clínica Médica", icon: "🏥" },
  { value: "clinica_dental", label: "Clínica Dental", icon: "🦷" },
  { value: "clinica_estetica", label: "Clínica Estética", icon: "💆" },
  { value: "salon_belleza", label: "Salón de Belleza / Spa", icon: "💅" },
  { value: "gimnasio", label: "Gimnasio / Centro Fitness", icon: "🏋️" },
  { value: "consultoria", label: "Consultoría / Asesoría", icon: "📋" },
  { value: "agencia_marketing", label: "Agencia de Marketing", icon: "📢" },
  { value: "agencia_publicidad", label: "Agencia de Publicidad", icon: "🎯" },
  { value: "agencia_diseno", label: "Agencia de Diseño", icon: "🎨" },
  { value: "desarrollo_software", label: "Desarrollo de Software", icon: "💻" },
  { value: "ecommerce", label: "E-commerce / Tienda Online", icon: "🛒" },
  { value: "tienda_retail", label: "Tienda / Retail", icon: "🏪" },
  { value: "restaurante", label: "Restaurante / Cafetería", icon: "🍽️" },
  { value: "hotel_turismo", label: "Hotel / Turismo", icon: "🏨" },
  { value: "inmobiliaria", label: "Inmobiliaria", icon: "🏠" },
  { value: "educacion", label: "Educación / Academia", icon: "📚" },
  { value: "coaching", label: "Coaching / Mentoring", icon: "🎓" },
  { value: "veterinaria", label: "Veterinaria", icon: "🐾" },
  { value: "despacho_legal", label: "Despacho Legal / Abogados", icon: "⚖️" },
  { value: "contabilidad", label: "Contabilidad / Finanzas", icon: "📊" },
  { value: "arquitectura", label: "Arquitectura / Construcción", icon: "🏗️" },
  { value: "fotografia", label: "Fotografía / Video", icon: "📸" },
  { value: "eventos", label: "Eventos / Producción", icon: "🎪" },
  { value: "logistica", label: "Logística / Transporte", icon: "🚚" },
  { value: "seguros", label: "Seguros", icon: "🛡️" },
  { value: "recursos_humanos", label: "Recursos Humanos", icon: "👥" },
  { value: "emprendimiento", label: "Emprendimiento / Startup", icon: "🚀" },
  { value: "freelance", label: "Freelance / Profesional Independiente", icon: "👤" },
  { value: "ong", label: "ONG / Sin fines de lucro", icon: "🤝" },
  { value: "otro", label: "Otro", icon: "🏢" },
];

interface BusinessTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const BusinessTypeSelector = ({ value, onChange, className }: BusinessTypeSelectorProps) => {
  return (
    <div className={className}>
      <Label>Tipo de negocio *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar tipo de negocio" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {BUSINESS_CATEGORIES.map(cat => (
            <SelectItem key={cat.value} value={cat.value}>
              <span className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BusinessTypeSelector;
