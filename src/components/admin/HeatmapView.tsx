import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Flame, MousePointer, Monitor, Smartphone, Tablet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

interface ClickEvent {
  id: string;
  page_path: string;
  x_percent: number;
  y_percent: number;
  viewport_width: number | null;
  viewport_height: number | null;
  element_tag: string | null;
  zone_name: string | null;
  session_id: string;
  created_at: string;
}

const HEATMAP_COLORS = [
  "rgba(0, 0, 255, 0.15)",
  "rgba(0, 255, 255, 0.25)",
  "rgba(0, 255, 0, 0.35)",
  "rgba(255, 255, 0, 0.5)",
  "rgba(255, 165, 0, 0.65)",
  "rgba(255, 0, 0, 0.8)",
];

const HeatmapView = () => {
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");
  const [selectedPage, setSelectedPage] = useState("/");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "mobile" | "tablet" | "desktop">("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchClicks = async () => {
    setLoading(true);
    const cutoff = subDays(new Date(), parseInt(period)).toISOString();
    const { data, error } = await supabase
      .from("click_events")
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setClicks(data as ClickEvent[]);
    setLoading(false);
  };

  useEffect(() => { fetchClicks(); }, [period]);

  const pages = useMemo(() => {
    const paths = new Set(clicks.map(c => c.page_path));
    return Array.from(paths).sort();
  }, [clicks]);

  useEffect(() => {
    if (pages.length > 0 && !pages.includes(selectedPage)) {
      setSelectedPage(pages[0]);
    }
  }, [pages]);

  const filteredClicks = useMemo(() => {
    return clicks.filter(c => {
      if (c.page_path !== selectedPage) return false;
      if (deviceFilter === "all") return true;
      const w = c.viewport_width || 0;
      if (deviceFilter === "mobile") return w <= 768;
      if (deviceFilter === "tablet") return w > 768 && w <= 1024;
      return w > 1024;
    });
  }, [clicks, selectedPage, deviceFilter]);

  const zoneStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredClicks.forEach(c => {
      const zone = c.zone_name || c.element_tag || "desconocido";
      counts[zone] = (counts[zone] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredClicks]);

  // Draw heatmap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw page background
    ctx.fillStyle = "hsl(220, 15%, 97%)";
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines for reference
    ctx.strokeStyle = "hsl(220, 10%, 90%)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (filteredClicks.length === 0) {
      ctx.fillStyle = "hsl(220, 10%, 50%)";
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Sin datos de clics para esta página", width / 2, height / 2);
      return;
    }

    // Create density grid
    const gridSize = 20;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    const grid = new Float32Array(cols * rows);

    let maxDensity = 0;

    filteredClicks.forEach(c => {
      const px = (c.x_percent / 100) * width;
      const py = (c.y_percent / 100) * height;
      const col = Math.floor(px / gridSize);
      const row = Math.floor(py / gridSize);

      // Apply gaussian spread
      const radius = 3;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const r = Math.floor(row + dy);
          const cc = Math.floor(col + dx);
          if (r >= 0 && r < rows && cc >= 0 && cc < cols) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const weight = Math.max(0, 1 - dist / (radius + 1));
            const idx = r * cols + cc;
            grid[idx] += weight;
            if (grid[idx] > maxDensity) maxDensity = grid[idx];
          }
        }
      }
    });

    // Render heatmap
    if (maxDensity > 0) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const density = grid[row * cols + col];
          if (density <= 0) continue;

          const intensity = density / maxDensity;
          const colorIdx = Math.min(
            HEATMAP_COLORS.length - 1,
            Math.floor(intensity * HEATMAP_COLORS.length)
          );

          ctx.fillStyle = HEATMAP_COLORS[colorIdx];
          ctx.beginPath();
          ctx.arc(
            col * gridSize + gridSize / 2,
            row * gridSize + gridSize / 2,
            gridSize * (0.8 + intensity * 0.6),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Draw individual click dots for low-density areas
    if (filteredClicks.length < 200) {
      filteredClicks.forEach(c => {
        const px = (c.x_percent / 100) * width;
        const py = (c.y_percent / 100) * height;
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [filteredClicks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Mapa de Calor
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualiza dónde hacen clic tus visitantes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoy</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
          {pages.length > 0 && (
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pages.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex border rounded-lg overflow-hidden">
            {([
              { value: "all", icon: Monitor, label: "Todos" },
              { value: "desktop", icon: Monitor, label: "PC" },
              { value: "tablet", icon: Tablet, label: "Tablet" },
              { value: "mobile", icon: Smartphone, label: "Móvil" },
            ] as const).map(d => (
              <button
                key={d.value}
                onClick={() => setDeviceFilter(d.value)}
                className={`px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  deviceFilter === d.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                <d.icon className="h-3.5 w-3.5" />
                {d.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={fetchClicks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total clics</span>
            </div>
            <p className="text-2xl font-bold">{filteredClicks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Páginas rastreadas</span>
            </div>
            <p className="text-2xl font-bold">{pages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Sesiones únicas</span>
            </div>
            <p className="text-2xl font-bold">
              {new Set(filteredClicks.map(c => c.session_id)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Zona más clicada</span>
            </div>
            <p className="text-lg font-bold truncate">
              {zoneStats[0]?.zone || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Canvas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Mapa de calor — <span className="text-primary">{selectedPage}</span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Frío</span>
              <div className="flex h-3 rounded overflow-hidden">
                {HEATMAP_COLORS.map((color, i) => (
                  <div key={i} className="w-5 h-3" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span>Caliente</span>
            </div>
          </div>
          <div
            ref={containerRef}
            className="relative w-full rounded-lg overflow-hidden border"
            style={{ height: 800 }}
          >
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>
        </CardContent>
      </Card>

      {/* Zone breakdown */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4">Zonas más clicadas</h3>
          {zoneStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {zoneStats.map((e, i) => {
                const pct = filteredClicks.length > 0
                  ? Math.round((e.count / filteredClicks.length) * 100)
                  : 0;
                return (
                  <div key={e.zone} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-[300px]">{e.zone}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{e.count} clics ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HeatmapView;
