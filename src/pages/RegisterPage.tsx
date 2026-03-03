import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Zap, ArrowRight, Sun, Moon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) { toast.error("Completa todos los campos"); return; }
    if (!acceptedTerms) { toast.error("Debes aceptar los Términos y la Política de Privacidad"); return; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Cuenta creada! Revisa tu email para confirmar.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all shadow-md"
        aria-label="Cambiar tema"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="mb-10">
          <span className="text-xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">A3</span>
            <span className="text-foreground/90">syst</span>
          </span>
        </div>

        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-foreground mb-2">Crea tu cuenta</h1>
          <p className="text-muted-foreground mb-8">Empieza tu revolución cuántica hoy</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nombre completo</label>
              <Input
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 pr-10 focus:border-primary/50 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(!!c)} className="mt-1" />
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                He leído y acepto los{" "}
                <a href="/terms" target="_blank" className="text-primary hover:underline">Términos y Condiciones</a> y la{" "}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">Política de Privacidad</a> de a3syst.
              </label>
            </div>
            <button
              type="submit" disabled={loading || !acceptedTerms}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground/60">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right — branding panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="absolute top-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[100px]" />

        <div className="relative text-center max-w-md px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" /> Economía Cuántica
          </div>
          <h2 className="text-4xl font-extrabold text-foreground mb-4 leading-tight">
            Tu negocio funciona.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Tú vives.</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            La IA opera tu negocio 24/7. Tú solo supervisas 3 horas al día.
          </p>
          <div className="space-y-3 text-left">
            {[
              "🤖 8 autopilotos de IA",
              "📅 Agenda automática",
              "🧠 Psycho-Matrix de persuasión",
              "📈 Analytics inteligente",
              "🚀 Motor cuántico de Ads",
            ].map(f => (
              <p key={f} className="text-sm text-muted-foreground">{f}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
