import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex bg-card">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-20 lg:px-32">
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">IO</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground tracking-tight">IOMI</span>
              <span className="text-xs block text-muted-foreground -mt-1 tracking-widest">CLÍNICAS</span>
            </div>
          </div>
        </div>

        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido de vuelta</h1>
          <p className="text-muted-foreground mb-8">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Usuario</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Usuario"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 h-11 bg-card border-border"
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 h-11 bg-card border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Recordarme
                </label>
              </div>
              <button type="button" className="text-sm text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">¿No tienes cuenta aún?</p>
            <Button
              variant="outline"
              className="w-full h-11 border-primary text-primary hover:bg-sidebar-accent font-medium"
            >
              Regístrate y accede a una prueba gratuita
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center gradient-subtle p-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevated p-6 space-y-4">
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-muted flex-1" />
              ))}
            </div>
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-muted flex-1" />
              ))}
            </div>
            <div className="space-y-3 pt-4">
              <div>
                <div className="bg-muted rounded-xl rounded-bl-sm p-3 max-w-[80%]">
                  <p className="text-sm text-foreground">Hola, ¿te gustaría confirmar tu cita para mañana?</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">10:28</span>
              </div>
              <div className="flex justify-end">
                <div>
                  <div className="gradient-primary rounded-xl rounded-br-sm p-3">
                    <p className="text-sm text-primary-foreground">Sí, 10:30 está perfecto.</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block text-right">10:30 ✓✓</span>
                </div>
              </div>
              <div>
                <div className="bg-muted rounded-xl rounded-bl-sm p-3 max-w-[80%]">
                  <p className="text-sm text-foreground">Listo. Envié el recordatorio por WhatsApp 📅</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">10:31</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-primary/20" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
