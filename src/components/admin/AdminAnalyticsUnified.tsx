import { useState } from "react";
import { BarChart3, Flame, Radio } from "lucide-react";
import AdminAnalyticsTab from "./AdminAnalyticsTab";
import HeatmapView from "./HeatmapView";
import LiveSessionsView from "./LiveSessionsView";

const sections = [
  { id: "analytics", label: "Analítica Web", icon: BarChart3 },
  { id: "heatmap", label: "Mapa de Calor", icon: Flame },
  { id: "live", label: "En Vivo", icon: Radio },
] as const;

type Section = typeof sections[number]["id"];

const AdminAnalyticsUnified = () => {
  const [active, setActive] = useState<Section>("analytics");

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              active === s.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "analytics" && <AdminAnalyticsTab />}
      {active === "heatmap" && <HeatmapView />}
      {active === "live" && <LiveSessionsView />}
    </div>
  );
};

export default AdminAnalyticsUnified;
