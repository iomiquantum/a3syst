import { useState } from "react";
import { Search, Download, Upload, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MarketingContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  tags: string[];
  lastActivity: string;
}

const mockContacts: MarketingContact[] = [
  { id: "1", name: "Ana García", phone: "+54 11 1234-5678", email: "ana@email.com", source: "WhatsApp", stage: "Interesado", tags: ["ortodoncia"], lastActivity: "Hace 2h" },
  { id: "2", name: "Carlos Pérez", phone: "+54 11 9876-5432", email: "carlos@email.com", source: "Web Widget", stage: "Nuevo", tags: ["implantes", "urgente"], lastActivity: "Hace 1d" },
  { id: "3", name: "María López", phone: "+54 11 5555-1234", email: "maria@email.com", source: "Instagram", stage: "Contactado", tags: ["blanqueamiento"], lastActivity: "Hace 3d" },
  { id: "4", name: "Juan Rodríguez", phone: "+54 11 4444-9876", email: "juan@email.com", source: "Referido", stage: "Cita agendada", tags: [], lastActivity: "Hace 5h" },
  { id: "5", name: "Laura Fernández", phone: "+54 11 3333-6789", email: "laura@email.com", source: "WhatsApp", stage: "Convertido", tags: ["ortodoncia", "vip"], lastActivity: "Hace 1h" },
];

const stageColors: Record<string, string> = {
  Nuevo: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  Contactado: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  Interesado: "bg-primary/10 text-primary",
  "Cita agendada": "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  Convertido: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
};

const MarketingContactsTab = () => {
  const [search, setSearch] = useState("");

  const filtered = mockContacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar contactos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"><Upload className="w-4 h-4 mr-1" /> Importar</Button>
          <Button size="sm" variant="outline"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Última actividad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.phone}</TableCell>
                <TableCell className="text-sm">{c.source}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={stageColors[c.stage] || ""}>{c.stage}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.lastActivity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MarketingContactsTab;
