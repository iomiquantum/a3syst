import { useState, useEffect } from "react";
import { User, Mail, Shield, Save, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SocialMediaSection from "@/components/social/SocialMediaSection";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MiCuentaPage = () => {
  const { user } = useAuth();
  const { clinicName, clinicId } = useClinic();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name || "");
        setLoading(false);
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Perfil actualizado");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Contraseña actualizada");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">👤 Mi cuenta</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra tu perfil y seguridad</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Profile */}
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Información personal</p>
                    <p className="text-xs text-muted-foreground">Negocio: {clinicName}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="mt-1 bg-white/5 border-white/10" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{email}</span>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Seguridad</p>
                    <p className="text-xs text-muted-foreground">Cambiar contraseña</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" className="mt-1 bg-white/5 border-white/10" />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline"
                  className="border-white/10 hover:bg-white/5 gap-2">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Cambiar contraseña
                </Button>
              </CardContent>
            </Card>

            {/* Social Media Connections */}
            <SocialMediaSection />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default MiCuentaPage;
