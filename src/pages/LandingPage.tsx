import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare, Users, Calendar, DollarSign, Palette, Target,
  Brain, Sparkles, Video, Building2, Shield, Zap, Check, Menu, X,
  ArrowRight, Star, Phone, Mail, User, Briefcase,
  BarChart3, Clock, Headphones, Layers, Globe, ChevronRight,
  AlertTriangle, TrendingDown, UserX, Wrench, Play, MessageCircle
} from 'lucide-react';
import heroImg from '@/assets/landing-hero.jpg';
import estrategaImg from '@/assets/landing-estratega.jpg';
import problemImg from '@/assets/landing-problem.jpg';
import solutionImg from '@/assets/landing-solution.jpg';

const NAV_LINKS = [
  { label: 'Producto', id: 'solution' },
  { label: 'Cómo funciona', id: 'how' },
  { label: 'Módulos', id: 'modules' },
  { label: 'Planes', id: 'plans' },
  { label: 'Estratega Cuántico', id: 'estratega' },
  { label: 'FAQ', id: 'faq' },
];

const PROBLEM_CARDS = [
  { icon: MessageSquare, text: 'Mensajes perdidos = ventas perdidas' },
  { icon: Clock, text: 'Respuestas tarde = clientes fríos' },
  { icon: TrendingDown, text: 'Seguimiento irregular = cero cierres' },
  { icon: Wrench, text: 'Muchas herramientas = doble trabajo' },
];

const MODULES = [
  { icon: MessageSquare, title: 'Inbox Web', subtitle: 'Atención al Cliente', bullets: ['Bandeja tipo CRM', 'Estados: abierta/cerrada/archivada', 'Ficha del cliente e historial'] },
  { icon: Headphones, title: 'Call Center CRM', subtitle: 'Seguimiento Comercial', bullets: ['Etapas de seguimiento', 'Gestión comercial ordenada', 'Métricas y control'] },
  { icon: Users, title: 'CRM de Clientes', subtitle: 'Base de Datos', bullets: ['Datos + historial', 'Estados y organización', 'Búsqueda y filtros'] },
  { icon: Calendar, title: 'Agenda / Citas', subtitle: 'Calendario', bullets: ['Calendario interactivo', 'Estados de cita', 'Duración y asignación'] },
  { icon: DollarSign, title: 'Control Contable', subtitle: 'Ventas', bullets: ['Pagos, descuentos', 'Estados y origen', 'Registro claro de ingresos'] },
  { icon: Palette, title: 'Contenido con IA', subtitle: 'Copy + Imágenes + Videos', bullets: ['Crea piezas listas para publicar', 'Prompts y guiones', 'Consistencia de marca'] },
  { icon: Target, title: 'Marketing', subtitle: 'Segmentación', bullets: ['Audiencias y segmentación', 'Organiza contactos', 'Mejor conversión'] },
  { icon: Brain, title: 'PSYCHO-MATRIX', subtitle: 'Estrategias Cuánticas', bullets: ['Estrategias listas para convertir', 'Triggers, arquetipos y enfoque', 'Duplicar / regenerar estrategias'], badge: 'FULL' },
  { icon: Sparkles, title: 'Estrategia Cuántica', subtitle: 'Framework', bullets: ['Framework de crecimiento', 'Plantillas estratégicas', 'Acción semanal dentro del sistema'], badge: 'FULL' },
  { icon: MessageCircle, title: 'Agente Guía Conversacional', subtitle: 'IA Conversacional', bullets: ['IA que guía conversaciones', 'Objetivos, tono, idioma', 'On/Off por conversación'], badge: 'FULL' },
  { icon: Video, title: 'AI Meeting Assistant', subtitle: 'Reuniones', bullets: ['Transcripción y resumen', 'Acciones y decisiones', 'Reuniones más rápidas'], badge: 'FULL' },
  { icon: Building2, title: 'Multi-sucursal y Roles', subtitle: 'Escalabilidad', bullets: ['Control por equipo', 'Permisos', 'Escala sin perder orden'] },
];

const PLANS = [
  {
    name: 'START', price: 44, sub: 'Para empezar a operar con orden y velocidad.', recommended: false,
    features: ['Inbox Web (widget)', 'Bandeja tipo CRM (Esencial)', 'Asignación de agente (Esencial)', 'Dashboard KPIs (Esencial)', 'Contenido con IA (copy + imágenes + videos)', 'Estratega Cuántico (incluido)'],
    cta: 'Empezar con Start'
  },
  {
    name: 'GROW', price: 99, sub: 'Para vender con seguimiento y control.', recommended: true,
    features: ['Todo de Start +', 'CRM de clientes', 'Call Center CRM', 'Registro de llamadas + métricas', 'Agenda / Citas', 'Control Contable de Ventas', 'Marketing (Segmentación)', 'Calendario de contenido + analíticas', 'Multi-sucursal/roles (limitado)', 'Estratega Cuántico (incluido)'],
    cta: 'Elegir Grow'
  },
  {
    name: 'FULL', price: 199, sub: 'Autonomía real + estrategias cuánticas.', recommended: false,
    features: ['Todo de Grow +', 'Agente Guía Conversacional (IA)', 'PSYCHO-MATRIX — Estrategias Cuánticas', 'Estrategia Cuántica (framework + plantillas)', 'AI Meeting Assistant', 'Multi-sucursal/roles (ampliado)', 'Estratega Cuántico (incluido)'],
    cta: 'Elegir Full'
  },
];

const FAQ_ITEMS = [
  { q: '¿Necesito conocimientos técnicos?', a: 'No. Es simple y guiado. Si sabes usar WhatsApp, sabes usar A3.' },
  { q: '¿Sirve para cualquier negocio?', a: 'Sí, es modular. Se adapta a salud, educación, belleza, fitness, gastronomía, inmobiliaria, legal, tecnología y más.' },
  { q: '¿Qué logro con A3?', a: 'Orden, velocidad, control y ventas. Todo medido y automatizado.' },
  { q: '¿Qué es Economía Cuántica?', a: 'Es nuestro concepto: A3 ejecuta tareas en paralelo sin cansarse. Atiende, vende, crea contenido y organiza al mismo tiempo.' },
  { q: '¿Incluye acompañamiento?', a: 'Sí: Estratega Cuántico semanal en todos los planes. Sesión en vivo + replays + estrategia de la semana.' },
  { q: '¿Puedo empezar pequeño?', a: 'Sí, con el plan Start a $44/mes. Creces cuando estés listo.' },
];

const TESTIMONIALS = [
  { name: 'Clínica Dental Sonrisa', result: 'Más orden, más cierres', text: 'Antes perdíamos el 40% de los leads por responder tarde. Con A3 todo queda registrado y organizado.' },
  { name: 'Academia FitPro', result: 'Menos tiempo respondiendo', text: 'Pasamos de 4 horas al día contestando mensajes a tener todo centralizado y controlado.' },
  { name: 'Restaurante La Terraza', result: 'Operación más ligera', text: 'Un solo sistema para reservas, clientes y seguimiento. Dejamos de usar 5 herramientas diferentes.' },
];

const INDUSTRIES = ['Salud', 'Educación', 'Belleza', 'Fitness', 'Gastronomía', 'Inmobiliaria', 'Legal', 'Tecnología', 'Coaching', 'Retail', 'Consultoría', 'Servicios'];

const LandingPage = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [formData, setFormData] = useState({ name: '', business: '', industry: '', whatsapp: '', email: '' });

  useEffect(() => {
    document.title = 'A3 SYS by IOMI | Operaciones Autónomas con IA para Vender Más';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Bienvenido a la Economía Cuántica. Ahorra sueldos y duplica ventas con un sistema todo-en-uno: atención al cliente, call center CRM, agenda, ventas, contenido con IA y estrategias cuánticas.');
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  const handleSubmitDemo = (e: React.FormEvent) => {
    e.preventDefault();
    // Track conversion
    window.dispatchEvent(new CustomEvent('demo-requested', { detail: formData }));
    setDemoOpen(false);
    setFormData({ name: '', business: '', industry: '', whatsapp: '', email: '' });
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        '--primary': '215 70% 30%',
        '--primary-foreground': '0 0% 100%',
        '--accent': '160 55% 42%',
        '--accent-foreground': '0 0% 100%',
        '--ring': '215 70% 30%',
      } as React.CSSProperties}
    >
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <button onClick={() => scrollTo('hero')} className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span className="text-primary">A3</span> <span className="text-foreground">SYS</span> <span className="text-xs text-muted-foreground">by IOMI</span>
          </button>
          <div className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/login">
              <Button variant="ghost" size="sm">Iniciar Sesión</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => scrollTo('how')}>
              <Play className="mr-1 h-3 w-3" /> Ver Tour 2 min
            </Button>
            <Button size="sm" onClick={() => setDemoOpen(true)}>Agendar Demo</Button>
          </div>
          <button className="lg:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t bg-white px-4 py-4 lg:hidden">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full py-2 text-left text-sm font-medium text-muted-foreground">
                {l.label}
              </button>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="w-full">Iniciar Sesión</Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { scrollTo('how'); }}>Ver Tour</Button>
                <Button size="sm" className="flex-1" onClick={() => { setDemoOpen(true); setMobileMenu(false); }}>Agendar Demo</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-[hsl(215,70%,97%)] via-white to-[hsl(160,40%,96%)]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4 bg-[hsl(215,70%,92%)] text-primary">
                Bienvenido a la nueva Economía Cuántica
              </Badge>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight lg:text-5xl xl:text-6xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                Todo tu negocio en un solo sistema con{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Inteligencia Artificial.
                </span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
                Ahorra sueldos, ahorra tiempo y duplica ventas con operaciones autónomas: atención al cliente, call center CRM, ventas, contenido, marketing y estrategias… todo integrado.
              </p>
              <ul className="mb-8 space-y-3">
                {[
                  'Lo que antes hacía un equipo completo, ahora lo hace A3.',
                  'Atiende en paralelo: 1 o 1,000,000 clientes, sin cansarse.',
                  'Fácil de usar, sin conocimientos técnicos.',
                  'Empieza hoy: orden + velocidad + control.',
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" /> {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => setDemoOpen(true)} className="text-base">
                  Quiero ahorrar sueldos y vender más <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollTo('how')} className="text-base">
                  Ver cómo funciona
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Plataforma todo-en-uno • Operación + crecimiento • Para cualquier industria • Sin humo: resultados medibles
              </p>
            </div>
            <div className="relative">
              <img src={heroImg} alt="Dashboard A3 SYS by IOMI - Sistema de gestión empresarial con IA" className="w-full rounded-xl shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEM ===== */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                Tu negocio crece… y el caos también.
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Más mensajes, más leads, más tareas. Y el mismo tiempo. Cuando dependes de personas y herramientas separadas, pierdes ventas y te quemas.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {PROBLEM_CARDS.map((c, i) => (
                  <Card key={i} className="border-destructive/20 bg-destructive/5">
                    <CardContent className="flex items-start gap-3 p-4">
                      <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      <span className="text-sm font-medium">{c.text}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mt-8 text-lg font-semibold text-foreground">
                El caos es caro. <span className="text-accent">La automatización es rentable.</span>
              </p>
            </div>
            <div>
              <img src={problemImg} alt="Dueño de negocio abrumado por múltiples tareas" className="w-full rounded-xl shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOLUTION ===== */}
      <section id="solution" className="bg-[hsl(215,70%,97%)] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <img src={solutionImg} alt="Dueño de negocio confiado usando A3 SYS by IOMI" className="w-full rounded-xl shadow-lg" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                A3 SYS trabaja por ti. Tú solo decides.
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Centraliza, automatiza y controla. A3 ejecuta en paralelo lo que antes requería varios roles.
              </p>
              <div className="space-y-4">
                {[
                  'Ahorra sueldos automatizando tareas repetitivas.',
                  'Responde más rápido. Vende más rápido.',
                  'Todo queda registrado y bajo control.',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-base font-medium">{t}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8" onClick={() => scrollTo('modules')}>
                Ver plataforma <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT IS A3 ===== */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            A3 = tu <span className="text-primary">AI Automation Agency</span>.<br />
            NETWORTH = <span className="text-accent">red que vale la pena</span>.
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            No es una agencia tradicional. Es un sistema end-to-end de operaciones autónomas. Un solo lugar para atención, ventas y crecimiento. Valor real, medible y escalable.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Layers, text: 'Todo en uno: Operación + Ventas + Marketing' },
              { icon: Zap, text: 'Economía Cuántica: tareas en paralelo' },
              { icon: Globe, text: 'Escalabilidad infinita: el software no se cansa' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-xl border bg-[hsl(215,70%,97%)] p-6">
                <item.icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-center">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="bg-[hsl(215,70%,97%)] py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center lg:px-8">
          <h2 className="mb-2 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Si sabes usar WhatsApp, sabes usar A3.
          </h2>
          <p className="mb-12 text-lg text-muted-foreground">3 pasos y estás operando.</p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', icon: MessageSquare, title: 'Instala el Web Inbox', desc: 'Widget en tu web para centralizar conversaciones.' },
              { step: '2', icon: Users, title: 'Organiza con Call Center CRM', desc: 'Clientes, agenda y ventas ordenados y controlados.' },
              { step: '3', icon: Sparkles, title: 'Produce con IA', desc: 'Contenido y estrategia semanal con IA + Estratega Cuántico.' },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col items-center rounded-2xl border bg-white p-8 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {s.step}
                </div>
                <s.icon className="mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <Button className="mt-10" size="lg" onClick={() => setDemoOpen(true)}>
            Agendar Demo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ===== MODULES ===== */}
      <section id="modules" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              Todo lo que un negocio necesita para empezar a facturar ya.
            </h2>
            <p className="text-lg text-muted-foreground">Operación y crecimiento en un solo sistema.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MODULES.map((m, i) => (
              <Card key={i} className="relative overflow-hidden transition-shadow hover:shadow-lg">
                {m.badge && (
                  <Badge className="absolute right-3 top-3 bg-primary text-[10px]">{m.badge}</Badge>
                )}
                <CardContent className="p-5">
                  <m.icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="text-base font-semibold">{m.title}</h3>
                  <p className="mb-3 text-xs text-muted-foreground">{m.subtitle}</p>
                  <ul className="space-y-1.5">
                    {m.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ESTRATEGA CUÁNTICO ===== */}
      <section id="estratega" className="bg-gradient-to-br from-primary to-[hsl(215,60%,22%)] py-16 text-primary-foreground lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">
                Incluido en TODOS los planes
              </Badge>
              <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                Estratega Cuántico.
              </h2>
              <p className="mb-8 text-lg text-primary-foreground/80">
                Una sesión semanal en vivo para actualizarte en IA, tecnología y estrategias. Tu plataforma ejecuta; el Estratega Cuántico te guía.
              </p>
              <div className="space-y-4">
                {[
                  'Sesión semanal en vivo',
                  'Replays (biblioteca)',
                  'Estrategia de la semana para aplicar en A3',
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-accent" /> <span className="font-medium">{t}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setDemoOpen(true)}
              >
                Quiero entrar al programa <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div>
              <img src={estrategaImg} alt="Estratega Cuántico presentando estrategia en vivo" className="w-full rounded-xl shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOR WHOM ===== */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center lg:px-8">
          <h2 className="mb-2 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Funciona para cualquier negocio.
          </h2>
          <p className="mb-10 text-lg text-muted-foreground">
            Salud, educación, belleza, fitness, gastronomía, inmobiliaria, legal, tecnología y más.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {INDUSTRIES.map((ind, i) => (
              <Badge key={i} variant="secondary" className="px-4 py-2 text-sm font-medium">
                {ind}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANS ===== */}
      <section id="plans" className="bg-[hsl(215,70%,97%)] py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              Elige tu plan. Crece sin contratar más gente.
            </h2>
            <p className="text-lg text-muted-foreground">Pagas un sistema. Ahorras un equipo.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Card key={i} className={`relative flex flex-col overflow-hidden transition-shadow hover:shadow-xl ${p.recommended ? 'border-2 border-primary ring-2 ring-primary/20' : ''}`}>
                {p.recommended && (
                  <div className="bg-primary py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                    Recomendado
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{p.name}</h3>
                  <div className="my-4">
                    <span className="text-4xl font-bold">${p.price}</span>
                    <span className="text-muted-foreground"> / mes</span>
                  </div>
                  <p className="mb-6 text-sm text-muted-foreground">{p.sub}</p>
                  <ul className="mb-8 flex-1 space-y-2.5">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${p.recommended ? '' : 'bg-primary/90 hover:bg-primary'}`}
                    size="lg"
                    onClick={() => setDemoOpen(true)}
                  >
                    {p.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Negocios que decidieron simplificar y crecer.
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-1">
                    {Array(5).fill(0).map((_, j) => <Star key={j} className="h-4 w-4 fill-[hsl(38,92%,55%)] text-[hsl(38,92%,55%)]" />)}
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground italic">"{t.text}"</p>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">{t.result}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="bg-[hsl(215,70%,97%)] py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Preguntas frecuentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-gradient-to-br from-primary to-[hsl(215,60%,22%)] py-16 text-primary-foreground lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Deja de pagar caos. Empieza a pagar resultados.
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/80">
            Bienvenido a la Economía Cuántica: operaciones autónomas con IA para ahorrar sueldos y vender más.
          </p>
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 text-base"
            onClick={() => setDemoOpen(true)}
          >
            Agendar Demo Ahora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-6 text-sm text-primary-foreground/60">
            Sin compromiso • Enfocado a facturación • Fácil de implementar
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span className="text-primary">A3</span> SYS <span className="text-sm text-muted-foreground font-normal">by IOMI</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            © {new Date().getFullYear()} A3 SYS by IOMI. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* ===== WHATSAPP FLOATING ===== */}
      <a
        href="https://wa.me/1234567890?text=Quiero%20A3"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg transition-transform hover:scale-110"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      {/* ===== DEMO MODAL ===== */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Sora, sans-serif' }}>Agendar Demo</DialogTitle>
            <DialogDescription>Completa tus datos y te contactamos en menos de 24 horas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDemo} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tu nombre" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nombre del negocio" value={formData.business} onChange={e => setFormData(p => ({ ...p, business: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Industria" value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="WhatsApp" value={formData.whatsapp} onChange={e => setFormData(p => ({ ...p, whatsapp: e.target.value }))} required />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Agendar mi Demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
