import { useState, useEffect } from "react";
import { Rocket, Users, Search, RefreshCw, CheckCircle2, Clock, UserCheck, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  generations_used: number;
  max_generations: number;
  created_at: string;
}

const AdminLaunchTab = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with_referrals" | "completed" | "no_referrals">("all");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("launch_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const regs = (data || []) as Registration[];
    setRegistrations(regs);

    // Count referrals for each code
    const counts: Record<string, number> = {};
    regs.forEach((r) => {
      if (r.referred_by) {
        counts[r.referred_by] = (counts[r.referred_by] || 0) + 1;
      }
    });
    setReferralCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getReferralCount = (code: string) => referralCounts[code] || 0;

  const getStatus = (reg: Registration) => {
    const count = getReferralCount(reg.referral_code);
    if (count >= 4) return "completed";
    if (count > 0) return "in_progress";
    return "pending";
  };

  const statusConfig = {
    completed: { label: "4 referidos ✅", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
    in_progress: { label: "En progreso", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    pending: { label: "Sin referidos", className: "bg-muted text-muted-foreground" },
  };

  const filtered = registrations.filter((r) => {
    const matchesSearch =
      !search ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.business_name.toLowerCase().includes(search.toLowerCase()) ||
      r.referral_code.toLowerCase().includes(search.toLowerCase());

    const status = getStatus(r);
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && status === "completed") ||
      (filter === "with_referrals" && (status === "completed" || status === "in_progress")) ||
      (filter === "no_referrals" && status === "pending");

    return matchesSearch && matchesFilter;
  });

  const totalRegistrations = registrations.length;
  const completedCount = registrations.filter((r) => getReferralCount(r.referral_code) >= 4).length;
  const withReferrals = registrations.filter((r) => getReferralCount(r.referral_code) > 0).length;
  const totalReferralLinks = Object.values(referralCounts).reduce((a, b) => a + b, 0);

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
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Con 4+ referidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{withReferrals}</p>
              <p className="text-xs text-muted-foreground">Con al menos 1 referido</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReferralLinks}</p>
              <p className="text-xs text-muted-foreground">Total referidos generados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, negocio o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">4+ referidos</SelectItem>
            <SelectItem value="with_referrals">Con referidos</SelectItem>
            <SelectItem value="no_referrals">Sin referidos</SelectItem>
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
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Negocio</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Código</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Referidos</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Referido por</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">IA usada</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Estado</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Fecha</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const status = getStatus(r);
                    const sc = statusConfig[status];
                    const refCount = getReferralCount(r.referral_code);
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
                          <span className={`text-lg font-bold ${refCount >= 4 ? "text-emerald-600" : refCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {refCount}
                          </span>
                          <span className="text-xs text-muted-foreground"> / 4</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.referred_by ? (
                            <code className="rounded bg-primary/10 px-2 py-1 text-xs font-mono text-primary">{r.referred_by}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground">Directo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm">{r.generations_used} / {r.max_generations}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={sc.className}>
                            {sc.label}
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
                              const { error } = await supabase
                                .from("launch_registrations")
                                .delete()
                                .eq("id", r.id);
                              if (error) {
                                toast.error(error.message);
                                return;
                              }
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
