import { useState, useEffect } from "react";
import { DollarSign, Building2, Users, Infinity, Save, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminTokenBudgetsProps {
  clinics: any[];
  profiles: any[];
  roles: any[];
  onRefresh: () => void;
}

interface UserLimit {
  id?: string;
  user_id: string;
  clinic_id: string;
  monthly_budget_usd: number | null;
}

const AdminTokenBudgets = ({ clinics, profiles, roles, onRefresh }: AdminTokenBudgetsProps) => {
  const [clinicBudgets, setClinicBudgets] = useState<Record<string, number | null>>({});
  const [userLimits, setUserLimits] = useState<UserLimit[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Initialize clinic budgets from props
  useEffect(() => {
    const budgets: Record<string, number | null> = {};
    clinics.forEach(c => {
      budgets[c.id] = c.monthly_token_budget_usd ?? null;
    });
    setClinicBudgets(budgets);
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id);
    }
  }, [clinics]);

  // Fetch user limits for selected clinic
  useEffect(() => {
    if (!selectedClinic) return;
    supabase
      .from("user_token_limits")
      .select("*")
      .eq("clinic_id", selectedClinic)
      .then(({ data }) => {
        setUserLimits((data as UserLimit[]) || []);
      });
  }, [selectedClinic]);

  const clinicUsers = roles.filter(r => r.clinic_id === selectedClinic);

  const getUserLimit = (userId: string): number | null => {
    const found = userLimits.find(l => l.user_id === userId);
    return found ? found.monthly_budget_usd : null;
  };

  const handleSaveClinicBudget = async (clinicId: string) => {
    setSaving(true);
    const budget = clinicBudgets[clinicId];
    const { error } = await supabase
      .from("clinics")
      .update({ monthly_token_budget_usd: budget } as any)
      .eq("id", clinicId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Presupuesto de clínica actualizado");
    onRefresh();
  };

  const handleSaveUserLimit = async (userId: string, budgetValue: number | null) => {
    setSaving(true);
    const existing = userLimits.find(l => l.user_id === userId && l.clinic_id === selectedClinic);
    
    if (existing?.id) {
      const { error } = await supabase
        .from("user_token_limits")
        .update({ monthly_budget_usd: budgetValue } as any)
        .eq("id", existing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from("user_token_limits")
        .insert({ user_id: userId, clinic_id: selectedClinic, monthly_budget_usd: budgetValue } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    
    // Refresh limits
    const { data } = await supabase
      .from("user_token_limits")
      .select("*")
      .eq("clinic_id", selectedClinic);
    setUserLimits((data as UserLimit[]) || []);
    setSaving(false);
    toast.success("Límite de usuario actualizado");
  };

  return (
    <div className="space-y-6">
      {/* Clinic budgets */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Presupuesto mensual por clínica
          </CardTitle>
          <CardDescription>Define el límite de gasto mensual en USD para cada clínica. Deja en "Abierto" para sin límite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clinics.map(c => {
            const budget = clinicBudgets[c.id];
            const isOpen = budget === null || budget === undefined;
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.address || "Sin dirección"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Abierto</Label>
                    <Switch
                      checked={isOpen}
                      onCheckedChange={(checked) => {
                        setClinicBudgets(prev => ({
                          ...prev,
                          [c.id]: checked ? null : 50,
                        }));
                      }}
                    />
                  </div>
                  {!isOpen && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={budget ?? ""}
                        onChange={e => setClinicBudgets(prev => ({
                          ...prev,
                          [c.id]: e.target.value ? Number(e.target.value) : null,
                        }))}
                        className="w-24 h-8 text-sm"
                        placeholder="USD"
                      />
                    </div>
                  )}
                  {isOpen && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Infinity className="w-3 h-3" /> Sin límite
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveClinicBudget(c.id)}
                    disabled={saving}
                    className="h-8"
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* User limits per clinic */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Límite mensual por usuario
          </CardTitle>
          <CardDescription>Configura límites individuales de gasto por usuario dentro de cada clínica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Seleccionar clínica</Label>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Seleccionar clínica" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clinicUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay usuarios asignados a esta clínica.</p>
          ) : (
            <div className="space-y-2">
              {clinicUsers.map(r => {
                const profile = r.profiles || { full_name: "Sin nombre", email: "" };
                const currentLimit = getUserLimit(r.user_id);
                const isOpen = currentLimit === null || currentLimit === undefined;
                return (
                  <UserLimitRow
                    key={r.id}
                    userName={profile.full_name || profile.email}
                    email={profile.email}
                    userId={r.user_id}
                    currentLimit={currentLimit}
                    isOpen={isOpen}
                    saving={saving}
                    onSave={handleSaveUserLimit}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface UserLimitRowProps {
  userName: string;
  email: string;
  userId: string;
  currentLimit: number | null;
  isOpen: boolean;
  saving: boolean;
  onSave: (userId: string, budget: number | null) => void;
}

const UserLimitRow = ({ userName, email, userId, currentLimit, isOpen, saving, onSave }: UserLimitRowProps) => {
  const [localOpen, setLocalOpen] = useState(isOpen);
  const [localBudget, setLocalBudget] = useState<number>(currentLimit ?? 25);

  useEffect(() => {
    setLocalOpen(currentLimit === null || currentLimit === undefined);
    setLocalBudget(currentLimit ?? 25);
  }, [currentLimit]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{userName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Abierto</Label>
          <Switch
            checked={localOpen}
            onCheckedChange={(checked) => setLocalOpen(checked)}
          />
        </div>
        {!localOpen && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={localBudget}
              onChange={e => setLocalBudget(Number(e.target.value))}
              className="w-24 h-8 text-sm"
              placeholder="USD"
            />
          </div>
        )}
        {localOpen && (
          <Badge variant="outline" className="text-xs gap-1">
            <Infinity className="w-3 h-3" /> Sin límite
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSave(userId, localOpen ? null : localBudget)}
          disabled={saving}
          className="h-8"
        >
          <Save className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default AdminTokenBudgets;
