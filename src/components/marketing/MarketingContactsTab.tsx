import { useState } from "react";
import { Search, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/hooks/useClinic";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const stageColors: Record<string, string> = {
  nuevo: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  contactado: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  interesado: "bg-primary/10 text-primary",
  cita_agendada: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  convertido: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
};

const MarketingContactsTab = () => {
  const { clinicId } = useClinic();
  const [search, setSearch] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["marketing-contacts", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, email, source, funnel_stage, tags, updated_at")
        .eq("clinic_id", clinicId!)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
  });

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  if (isLoading) return <Skeleton className="h-64" />;

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

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay contactos{search ? " que coincidan con la búsqueda" : ""}.</p>
      ) : (
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
                  <TableCell className="text-sm">{c.source || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={stageColors[c.funnel_stage] || ""}>{c.funnel_stage}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags || []).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true, locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MarketingContactsTab;
