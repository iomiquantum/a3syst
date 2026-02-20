import { useState, useEffect } from "react";
import { Rocket, Users, Search, RefreshCw, CheckCircle2, Clock, UserCheck, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  industry: string;
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  previous_position: number | null;
  is_fictional: boolean;
  generations_used: number;
  max_generations: number;
  created_at: string;
}

const AdminLaunchTab = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "real" | "fictional" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("launch_registrations")
      .select("*")
      .order("referral_count", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setRegistrations((data || []) as Registration[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveReferralCount = async (id: string) => {
    const newCount = parseInt(editValue);
    if (isNaN(newCount) || newCount < 0) {
      toast.error("Ingresa un número válido");
      return;
    }
    const { error } = await supabase
      .from("launch_registrations")
      .update({ referral_count: newCount })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Referidos actualizado");
    setEditingId(null);
    fetchData();
  };

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      !search ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.business_name.toLowerCase().includes(search.toLowerCase()) ||
      r.referral_code.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "real" && !r.is_fictional) ||
      (filter === "fictional" && r.is_fictional) ||
      (filter === "completed" && r.referral_count >= 4);

    return matchesSearch && matchesFilter;
  });

  const totalRegistrations = registrations.length;
  const realCount = registrations.filter((r) => !r.is_fictional).length;
  const completedCount = registrations.filter((r) => r.referral_count >= 4).length;
  const totalReferrals = registrations.reduce((a, b) => a + b.referral_count, 0);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRegistrations}</p>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{realCount}</p>
              <p className="text-xs text-muted-foreground">Registros reales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Con 4+ referidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Total referidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email, negocio o código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="real">Solo reales</SelectItem>
            <SelectItem value="fictional">Solo ficticios</SelectItem>
            <SelectItem value="completed">4+ referidos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground">Cargando registros...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No se encontraron registros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">#</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-3 w-10"></th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Negocio</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Código</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Referidos</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Tipo</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Fecha</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const rank = idx + 1;
                    const posChange = r.previous_position ? r.previous_position - rank : 0;
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-muted-foreground">{rank}</td>
                        <td className="px-2 py-3 text-center">
                          {posChange > 0 ? (
                            <ArrowUp className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          ) : posChange < 0 ? (
                            <ArrowDown className="h-3.5 w-3.5 text-red-500 mx-auto" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{r.full_name}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                            <p className="text-xs text-muted-foreground">{r.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{r.business_name}</p>
                          {r.industry && <p className="text-xs text-muted-foreground">{r.industry}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs font-mono font-bold">{r.referral_code}</code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === r.id ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                min={0}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-16 h-8 text-center text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveReferralCount(r.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveReferralCount(r.id)}>
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 justify-center">
                              <span className={`text-lg font-bold ${r.referral_count >= 4 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {r.referral_count}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { setEditingId(r.id); setEditValue(String(r.referral_count)); }}
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={r.is_fictional ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"}>
                            {r.is_fictional ? "Ficticio" : "Real"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10"
                            onClick={async () => {
                              const { error } = await supabase.from("launch_registrations").delete().eq("id", r.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success(`Registro de ${r.full_name} eliminado`);
                              fetchData();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLaunchTab;
