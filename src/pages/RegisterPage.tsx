import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) { toast.error("Completa todos los campos"); return; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Cuenta creada! Revisa tu email para confirmar tu cuenta.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex bg-card">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-20 lg:px-32">
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A3</span>
            </div>
            <div>
            <span className="text-xl font-bold text-foreground tracking-tight">A3 SYS</span>
              <span className="text-xs block text-muted-foreground -mt-1 tracking-widest">by IOMI</span>
            </div>
          </div>
        </div>

        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-foreground mb-2">Crea tu cuenta</h1>
          <p className="text-muted-foreground mb-8">Empieza a gestionar tu negocio hoy</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nombre completo *</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre completo" className="h-11 bg-card border-border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="h-11 bg-card border-border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Contraseña *</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 h-11 bg-card border-border" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground hover:opacity-90 font-medium">
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline font-medium">Iniciar sesión</Link></p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center gradient-subtle p-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-xl">A3</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">A3 SYS <span className="text-base text-muted-foreground font-normal">by IOMI</span></h2>
          <p className="text-muted-foreground mb-8">Sistema integral de gestión para negocios modernos</p>
          <div className="space-y-3 text-left">
            {["📅 Agenda y turnos inteligentes", "👥 Gestión de clientes", "💰 Control de ventas", "📊 Reportes en tiempo real", "💬 Mensajería automatizada"].map(f => (
              <p key={f} className="text-sm text-foreground">{f}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
