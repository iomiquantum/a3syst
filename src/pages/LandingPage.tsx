import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useClickTracking } from '@/hooks/useClickTracking';
import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';
import {
  MessageSquare, Calendar, BarChart3, Palette, Rocket, DollarSign,
  Brain, TrendingUp, Menu, X, ArrowRight, Check, Sparkles,
  Stethoscope, Scissors, Star, Heart, Dog, SmilePlus, Users,
  Building2, ChevronRight, Zap, Shield, Headphones, Globe
} from 'lucide-react';

/* ───── animate-on-scroll hook ───── */
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const FadeIn = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ───── animated counter ───── */
const Counter = ({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) => {
  const { ref, visible } = useInView();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
};

/* ───── data ───── */
const AUTOPILOTS = [
  { icon: MessageSquare, emoji: '🤖', title: 'Autopilot de Mensajes', desc: 'Responde WhatsApp e Instagram 24/7' },
  { icon: Calendar, emoji: '📅', title: 'Autopilot de Agenda', desc: 'Citas agendadas y confirmadas automáticamente' },
  { icon: BarChart3, emoji: '📊', title: 'Autopilot de CRM', desc: 'Leads clasificados y nutridos sin que muevas un dedo' },
  { icon: Palette, emoji: '📱', title: 'Autopilot de Marketing', desc: 'Contenido creado y publicado por la IA' },
  { icon: Rocket, emoji: '🚀', title: 'Autopilot de Ads', desc: 'Campañas en paralelo. La IA encuentra la ganadora.' },
  { icon: DollarSign, emoji: '💰', title: 'Autopilot de Ventas', desc: 'Ventas registradas y oportunidades detectadas' },
  { icon: Brain, emoji: '🧠', title: 'Psycho-Matrix', desc: 'Estrategias de persuasión generadas con IA' },
  { icon: TrendingUp, emoji: '📈', title: 'Analytics Inteligente', desc: 'No solo datos, sino insights y recomendaciones' },
];

const TIMELINE = [
  { time: '8:00 AM', emoji: '☀️', title: 'Briefing matutino (20 min)', desc: 'La IA te cuenta qué hizo mientras dormías' },
  { time: '1:00 PM', emoji: '📋', title: 'Revisión rápida (10 min)', desc: 'Apruebas sugerencias con un click' },
  { time: '6:00 PM', emoji: '🌙', title: 'Cierre del día (10 min)', desc: 'Resumen y plan de mañana' },
  { time: 'Resto', emoji: '🏖️', title: 'Tú decides', desc: 'Tu negocio sigue funcionando sin ti' },
];

const BUSINESSES = [
  { icon: SmilePlus, name: 'Negocios dentales' },
  { icon: Sparkles, name: 'Negocios estéticas' },
  { icon: Heart, name: 'Spas' },
  { icon: Scissors, name: 'Salones de belleza' },
  { icon: Scissors, name: 'Barberías' },
  { icon: Stethoscope, name: 'Consultorios médicos' },
  { icon: Brain, name: 'Psicología' },
  { icon: Star, name: 'Centros de bienestar' },
  { icon: Dog, name: 'Veterinarias' },
];

const PLANS = [
  {
    name: 'FREE', price: 0, badge: '', sub: 'Prueba la revolución',
    features: ['1 autopiloto', '100 mensajes IA/mes', '1 usuario'],
    cta: 'Empezar gratis',
  },
  {
    name: 'PRO', price: 49, badge: 'Más popular', sub: 'Libera tu tiempo',
    features: ['Todos los autopilotos', '2,000 mensajes IA/mes', '5 usuarios', 'Psycho-Matrix'],
    cta: 'Elegir Pro',
  },
  {
    name: 'QUANTUM', price: 149, badge: '', sub: 'Economía cuántica total',
    features: ['Todo ilimitado', 'Motor Cuántico de Ads', 'API completa', 'Soporte prioritario'],
    cta: 'Elegir Quantum',
  },
];

const NAV_LINKS = [
  { label: 'Autopilotos', id: 'autopilots' },
  { label: 'Tu Día', id: 'day' },
  { label: 'Para quién', id: 'who' },
  { label: 'Planes', id: 'pricing' },
];

/* ───── component ───── */
const LandingPage = () => {
  const [mobileMenu, setMobileMenu] = useState(false);

  usePageTracking();
  useClickTracking();
  useSessionHeartbeat();

  useEffect(() => {
    document.title = 'A3syst — Tu negocio funciona. Tú vives.';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'A3syst es el primer sistema de economía cuántica para negocios de bienestar. La IA opera tu negocio 24/7.');
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#060611] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══════ NAVBAR ══════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060611]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <button onClick={() => scrollTo('hero')} className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">A3</span>
            <span className="text-white/90">syst</span>
          </button>
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm text-white/50 transition-colors hover:text-white">
                {l.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors">Iniciar Sesión</Link>
            <Link to="/registro">
              <button className="rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
                Comienza gratis
              </button>
            </Link>
          </div>
          <button className="lg:hidden text-white/70" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t border-white/5 bg-[#060611] px-4 py-4 lg:hidden">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full py-2 text-left text-sm text-white/60">
                {l.label}
              </button>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/login" className="text-sm text-white/60 py-2">Iniciar Sesión</Link>
              <Link to="/registro">
                <button className="w-full rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white">
                  Comienza gratis
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══════ HERO ══════ */}
      <section id="hero" className="relative overflow-hidden">
        {/* gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#060611] via-[#0c1445] to-[#1a0a2e]" />
        {/* glow orbs */}
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#3B82F6]/10 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center lg:py-36">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-4 py-1.5 text-sm text-[#A78BFA]">
              <Zap className="h-3.5 w-3.5" /> Economía Cuántica
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Tu negocio funciona.{' '}
              <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#3B82F6] bg-clip-text text-transparent">
                Tú vives.
              </span>
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-white/50 md:text-xl">
              A3syst es el primer sistema de economía cuántica para negocios de bienestar. La IA opera tu negocio 24/7. Tú solo supervisas 3 horas al día.
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <Link to="/registro">
              <button className="group relative rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-8 py-4 text-lg font-bold text-white shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-[1.02]">
                Comienza tu libertad <ArrowRight className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
          </FadeIn>
          <FadeIn delay={400}>
            <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-sm">
              <span className="text-white/40 line-through text-lg">12 horas/día</span>
              <ArrowRight className="h-4 w-4 text-[#8B5CF6]" />
              <span className="text-2xl font-bold text-[#8B5CF6]">3 horas/día</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ 8 AUTOPILOTS ══════ */}
      <section id="autopilots" className="relative py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
                8 autopilotos de IA{' '}
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                  trabajando por ti
                </span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUTOPILOTS.map((a, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-[#8B5CF6]/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#3B82F6]/20 text-2xl">
                    {a.emoji}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{a.title}</h3>
                  <p className="text-sm text-white/40">{a.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ YOUR DAY ══════ */}
      <section id="day" className="relative py-24 lg:py-32 bg-gradient-to-b from-transparent via-[#0c1445]/30 to-transparent">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
                Así se ve tu día con la{' '}
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                  Economía Cuántica
                </span>
              </h2>
            </div>
          </FadeIn>

          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#8B5CF6]/50 via-[#3B82F6]/30 to-transparent md:left-1/2" />

            {TIMELINE.map((t, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className={`relative mb-12 flex flex-col md:flex-row md:items-center ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  {/* dot */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#8B5CF6]/50 bg-[#060611] text-xl">
                    {t.emoji}
                  </div>
                  {/* card */}
                  <div className={`ml-16 md:ml-0 md:w-[45%] ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider">{t.time}</span>
                      <h3 className="mt-1 text-lg font-semibold text-white">{t.title}</h3>
                      <p className="mt-1 text-sm text-white/40">{t.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ THE PROMISE ══════ */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <FadeIn>
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold md:text-4xl">La promesa</h2>
            </div>
          </FadeIn>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { end: 3, suffix: 'h', sub: 'Máximo de trabajo diario' },
              { end: 24, suffix: '/7', sub: 'Tu negocio nunca se detiene' },
              { end: 90, suffix: '%', sub: 'De tareas automatizadas por IA' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                  <div className="text-5xl font-extrabold bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent md:text-6xl">
                    <Counter end={s.end} suffix={s.suffix} />
                  </div>
                  <p className="mt-3 text-sm text-white/40">{s.sub}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FOR WHO ══════ */}
      <section id="who" className="py-24 lg:py-32 bg-gradient-to-b from-transparent via-[#0c1445]/20 to-transparent">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">
                Para todo negocio de{' '}
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                  bienestar y wellness
                </span>
              </h2>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {BUSINESSES.map((b, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition-all hover:border-[#8B5CF6]/30 hover:bg-white/[0.07]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#3B82F6]/20">
                    <b.icon className="h-6 w-6 text-[#A78BFA]" />
                  </div>
                  <span className="text-sm font-semibold text-white">{b.name}</span>
                  <span className="text-xs text-white/30">La IA entiende tu negocio</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ PRICING ══════ */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold md:text-4xl lg:text-5xl">Elige tu plan</h2>
            </div>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map((p, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className={`relative flex flex-col rounded-2xl border p-8 backdrop-blur-sm transition-all ${
                  p.badge
                    ? 'border-[#8B5CF6]/50 bg-gradient-to-b from-[#8B5CF6]/10 to-transparent shadow-[0_0_40px_rgba(139,92,246,0.15)]'
                    : 'border-white/10 bg-white/5'
                }`}>
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] px-4 py-1 text-xs font-bold text-white">
                      {p.badge}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="mt-1 text-sm text-white/40">{p.sub}</p>
                  <div className="mt-6 mb-6">
                    <span className="text-4xl font-extrabold text-white">${p.price}</span>
                    {p.price > 0 && <span className="text-white/40 text-sm">/mes</span>}
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/registro">
                    <button className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      p.badge
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]'
                        : 'border border-white/20 text-white hover:bg-white/10'
                    }`}>
                      {p.cta}
                    </button>
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-white/5 bg-[#060611] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-lg font-bold">
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">A3</span>
                <span className="text-white/90">syst</span>
              </span>
              <p className="mt-3 text-sm text-white/30">La Economía Cuántica para negocios de bienestar.</p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white/60">Producto</h4>
              <ul className="space-y-2">
                {['Autopilotos', 'Planes', 'FAQ'].map(l => (
                  <li key={l}>
                    <button onClick={() => scrollTo(l.toLowerCase() === 'autopilotos' ? 'autopilots' : l.toLowerCase() === 'planes' ? 'pricing' : 'pricing')} className="text-sm text-white/30 hover:text-white transition-colors">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white/60">Legal</h4>
              <ul className="space-y-2">
                {['Términos', 'Privacidad'].map(l => (
                  <li key={l}><span className="text-sm text-white/30">{l}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white/60">Contacto</h4>
              <p className="text-sm text-white/30">hola@a3syst.com</p>
            </div>
          </div>
          <div className="mt-12 border-t border-white/5 pt-8 text-center text-sm text-white/20">
            © 2026 A3syst — La Economía Cuántica
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
