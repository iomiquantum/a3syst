import { useState } from "react";
import { Rocket, Search, DollarSign, Eye, Users, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ActiveStrategy {
  id: string;
  name: string;
  status: "Activa" | "Pausada" | "Finalizada";
  platform: string;
  dailyBudget: string;
  creatives: number;
  createdAt: string;
}

const mockStrategies: ActiveStrategy[] = [
  { id: "1", name: "IOMI | VENTAS WhatsApp | +Advantage 10 | IMG | FECHA - 30/12/2025", status: "Activa", platform: "Meta", dailyBudget: "$3.00 USD", creatives: 10, createdAt: "30/12/2025" },
  { id: "2", name: "IOMI | VENTAS WhatsApp | +Advantage Prompt | VID | FECHA - 10/12/2025", status: "Activa", platform: "Meta", dailyBudget: "$3.00 USD", creatives: 5, createdAt: "10/12/2025" },
  { id: "3", name: "IOMI | VENTAS WhatsApp | +Advantage 10 | IMG | FECHA - 10/12/2025", status: "Activa", platform: "Meta", dailyBudget: "$8.00 USD", creatives: 10, createdAt: "10/12/2025" },
];

const AdsActiveStrategiesTab = () => {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? mockStrategies.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : mockStrategies;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide">Estrategias Activas</h2>
          <p className="text-sm text-muted-foreground">Gestiona y monitorea todas tus estrategias publicitarias en un solo lugar.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Por cada 1 dólar invertido generas:
            </div>
            <p className="text-2xl font-bold text-foreground">$0 <span className="text-sm font-normal text-muted-foreground">en Ventas</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Importe invertido
            </div>
            <p className="text-2xl font-bold text-foreground">$0</p>
            <p className="text-xs text-muted-foreground">Dinero invertido en campañas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Conversiones
            </div>
            <p className="text-2xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">Ventas</span></p>
            <p className="text-xs text-muted-foreground">Conversiones generadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" /> Cuentas alcanzadas
            </div>
            <p className="text-2xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">Personas</span></p>
            <p className="text-xs text-muted-foreground">Alcance de tus campañas</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategies list */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Estrategias lanzadas</p>
                <p className="text-sm text-muted-foreground">Arrastra, elige o genera con IA las imágenes restantes.</p>
              </div>
            </div>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-1.5" /> Nueva estrategia
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar estrategias..."
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {filtered.map((s) => (
              <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Rocket className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={s.status === "Activa" ? "default" : "secondary"} className="text-xs">{s.status}</Badge>
                      <Badge variant="outline" className="text-xs">{s.platform}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Presupuesto Diario <span className="font-semibold text-foreground">{s.dailyBudget}</span></span>
                      <span>Creativos <span className="font-semibold text-foreground">{s.creatives}</span></span>
                      <span>Creada <span className="font-semibold text-foreground">{s.createdAt}</span></span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" /> Ver Detalles
                  </Button>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No se encontraron estrategias.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdsActiveStrategiesTab;
