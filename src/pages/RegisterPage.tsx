import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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
      toast.success("¡Cuenta creada! Revisa tu email para confirmar.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#060611]">
      {/* Left — form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
        <div className="mb-10">
          <span className="text-xl font-bold">
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">A3</span>
            <span className="text-white/90">syst</span>
          </span>
        </div>

        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-white mb-2">Crea tu cuenta</h1>
          <p className="text-white/40 mb-8">Empieza tu revolución cuántica hoy</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Nombre completo</label>
              <Input
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#8B5CF6]/50 focus:ring-[#8B5CF6]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#8B5CF6]/50 focus:ring-[#8B5CF6]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 pr-10 focus:border-[#8B5CF6]/50 focus:ring-[#8B5CF6]/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-white/30">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-[#A78BFA] hover:text-[#8B5CF6] font-medium transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right — branding panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1445] via-[#1a0a2e] to-[#060611]" />
        <div className="absolute top-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-[#3B82F6]/10 blur-[100px]" />

        <div className="relative text-center max-w-md px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-1.5 text-sm text-[#A78BFA]">
            <Zap className="h-3.5 w-3.5" /> Economía Cuántica
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Tu negocio funciona.{" "}
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">Tú vives.</span>
          </h2>
          <p className="text-white/30 text-lg mb-8">
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
              <p key={f} className="text-sm text-white/40">{f}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
