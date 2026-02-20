import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useClickTracking } from '@/hooks/useClickTracking';
import { useSessionHeartbeat, markSessionAsRegistered } from '@/hooks/useSessionHeartbeat';
import {
  Rocket, Clock, Users, Gift, Copy, Check, ArrowRight, Sparkles,
  Mail, Phone, User, Briefcase, Globe, Share2, Image, FileText,
  Menu, X, MessageCircle, ChevronRight, Zap, Star,
  MessageSquare, Calendar, DollarSign, Palette, Target,
  Brain, Video, Building2, Shield, BarChart3, Headphones, Layers,
  AlertTriangle, TrendingDown, UserX, Wrench, Play, Mic, MicOff
} from 'lucide-react';
import quantumHeroImg from '@/assets/quantum-hero.jpg';
import heroImg from '@/assets/landing-hero.jpg';
import estrategaImg from '@/assets/landing-estratega.jpg';
import problemImg from '@/assets/landing-problem.jpg';
import solutionImg from '@/assets/landing-solution.jpg';

// April 1, 2025 at 7:00 PM Ecuador time (GMT-5) = midnight April 2 UTC
const LAUNCH_DATE = new Date('2025-04-02T00:00:00Z');

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

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

const COUNTRY_CODES = [
  { code: '+593', country: 'Ecuador', flag: '🇪🇨', digits: 9 },
  { code: '+57', country: 'Colombia', flag: '🇨🇴', digits: 10 },
  { code: '+52', country: 'México', flag: '🇲🇽', digits: 10 },
  { code: '+1', country: 'Estados Unidos', flag: '🇺🇸', digits: 10 },
  { code: '+34', country: 'España', flag: '🇪🇸', digits: 9 },
  { code: '+51', country: 'Perú', flag: '🇵🇪', digits: 9 },
  { code: '+56', country: 'Chile', flag: '🇨🇱', digits: 9 },
  { code: '+54', country: 'Argentina', flag: '🇦🇷', digits: 10 },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴', digits: 8 },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪', digits: 10 },
  { code: '+507', country: 'Panamá', flag: '🇵🇦', digits: 8 },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷', digits: 8 },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹', digits: 8 },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻', digits: 8 },
  { code: '+504', country: 'Honduras', flag: '🇭🇳', digits: 8 },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮', digits: 8 },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾', digits: 9 },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾', digits: 8 },
  { code: '+55', country: 'Brasil', flag: '🇧🇷', digits: 11 },
];

const NAV_LINKS = [
  { label: 'Producto', id: 'solution' },
  { label: 'Módulos', id: 'modules' },
  { label: 'Planes', id: 'plans' },
  { label: 'FAQ', id: 'faq' },
];

const PreLaunchPage = () => {
  const { toast } = useToast();
  const countdown = useCountdown(LAUNCH_DATE);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Registration form
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', business_name: '', industry: '', referral_code_input: '' });
  const [countryCode, setCountryCode] = useState('+593');
  const [phoneNumber, setPhoneNumber] = useState('');
  const registerRef = useRef<HTMLDivElement>(null);

  // Content trial
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialPrompt, setTrialPrompt] = useState('');
  const [trialType, setTrialType] = useState<'copy' | 'image'>('copy');
  const [trialResult, setTrialResult] = useState('');
  const [trialImageUrl, setTrialImageUrl] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);

  // Voice input for trial
  const { isListening, isSupported: voiceSupported, toggleListening } = useVoiceInput({
    onResult: (transcript) => {
      setTrialPrompt(prev => prev ? prev + ' ' + transcript : transcript);
    },
    language: 'es-ES',
  });

  // Page tracking
  usePageTracking();
  useClickTracking();
  useSessionHeartbeat();

  // Check localStorage for existing registration
  useEffect(() => {
    document.title = 'A3 SYS by IOMI — Lanzamiento 1° de Abril';
    const savedEmail = localStorage.getItem('a3_launch_email');
    if (savedEmail) {
      loadUserData(savedEmail);
    }
  }, []);

  const loadUserData = async (email: string) => {
    const { data } = await supabase
      .from('launch_registrations')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (data) {
      setUserData(data);
      setRegistered(true);
      // Count referrals
      const { count } = await supabase
        .from('launch_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', data.referral_code);
      setReferralCount(count || 0);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate phone number digits
    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (selectedCountry && cleanPhone.length !== selectedCountry.digits) {
      toast({ title: 'Número inválido', description: `El número para ${selectedCountry.country} debe tener ${selectedCountry.digits} dígitos.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${cleanPhone}`;
      const insertData: any = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: fullPhone,
        business_name: form.business_name.trim(),
        industry: form.industry.trim(),
      };
      if (form.referral_code_input.trim()) {
        insertData.referred_by = form.referral_code_input.trim().toUpperCase();
      }
      const { data, error } = await supabase
        .from('launch_registrations')
        .insert(insertData)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Ya estás registrado', description: 'Cargando tu dashboard...', variant: 'default' });
          await loadUserData(form.email.trim().toLowerCase());
        } else {
          throw error;
        }
      } else {
        setUserData(data);
        setRegistered(true);
        localStorage.setItem('a3_launch_email', data.email);
        markSessionAsRegistered();
        toast({ title: '¡Registro exitoso! 🚀', description: 'Tu código de referido está listo. ¡Comparte y gana!' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Intenta de nuevo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!userData) return;
    navigator.clipboard.writeText(userData.referral_code);
    setCodeCopied(true);
    toast({ title: 'Código copiado', description: userData.referral_code });
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const shareReferralLink = () => {
    if (!userData) return;
    const url = `${window.location.origin}/lanzamiento?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado', description: 'Comparte este enlace con tus contactos' });
  };

  // Extract referral code from URL and scroll to form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setForm(p => ({ ...p, referral_code_input: ref }));
      // Scroll to registration form after a short delay
      setTimeout(() => {
        registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, []);

  // Content trial generation
  const handleTrialGenerate = async () => {
    if (!userData) return;
    if (userData.generations_used >= userData.max_generations) {
      toast({ title: 'Límite alcanzado', description: 'Has usado tus 3 generaciones de prueba.', variant: 'destructive' });
      return;
    }
    setTrialLoading(true);
    setTrialResult('');
    setTrialImageUrl('');
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-generate-content', {
        body: {
          prompt: trialPrompt,
          tone: 'profesional',
          platform: 'Instagram',
          type: trialType === 'copy' ? 'copy' : 'image',
          width: trialType === 'image' ? 1080 : undefined,
          height: trialType === 'image' ? 1080 : undefined,
          imageModel: 'flash',
          action_label: 'Trial pre-lanzamiento',
        },
      });
      if (fnError) throw fnError;
      if (trialType === 'copy') {
        setTrialResult(fnData.content || 'No se generó contenido');
      } else {
        setTrialImageUrl(fnData.imageUrl || '');
        setTrialResult(fnData.content || '');
      }
      // Increment generations_used
      await supabase
        .from('launch_registrations')
        .update({ generations_used: userData.generations_used + 1 })
        .eq('id', userData.id);
      setUserData((p: any) => ({ ...p, generations_used: p.generations_used + 1 }));
    } catch (err: any) {
      toast({ title: 'Error generando', description: err.message || 'Intenta de nuevo', variant: 'destructive' });
    } finally {
      setTrialLoading(false);
    }
  };

  const generationsLeft = userData ? userData.max_generations - userData.generations_used : 3;
  const freeMonthEarned = referralCount >= 4;

  // Auto-create user when 4 referrals reached
  const handleClaimAccount = async () => {
    if (!userData || creatingUser || userCreated) return;
    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-launch-user', {
        body: {
          email: userData.email,
          full_name: userData.full_name,
          referral_code: userData.referral_code,
        },
      });

      if (error) throw error;

      // Send WhatsApp notification for manual validation
      const message = encodeURIComponent(
        `🎉 ¡NUEVO USUARIO CREADO!\n\n` +
        `Nombre: ${userData.full_name}\n` +
        `Email: ${userData.email}\n` +
        `Teléfono: ${userData.phone}\n` +
        `Negocio: ${userData.business_name}\n` +
        `Industria: ${userData.industry}\n` +
        `Código: ${userData.referral_code}\n` +
        `Referidos: ${referralCount}\n\n` +
        `⚠️ Requiere validación manual.`
      );
      window.open(`https://wa.me/14472871913?text=${message}`, '_blank');

      setUserCreated(true);
      toast({
        title: '🎉 ¡Cuenta creada exitosamente!',
        description: 'Revisa tu email para los próximos pasos. Te contactaremos por WhatsApp para activar tu cuenta.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'No se pudo crear la cuenta. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setCreatingUser(false);
    }
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
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span className="text-primary">A3</span> <span className="text-foreground">SYS</span>{' '}
            <span className="text-xs text-muted-foreground">by IOMI</span>
          </Link>
          <div className="hidden items-center gap-4 lg:flex">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </button>
            ))}
            <Link to="/login">
              <Button variant="outline" size="sm">Iniciar Sesión</Button>
            </Link>
            {!registered && (
              <Button size="sm" onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}>
                Registrarme al Lanzamiento
              </Button>
            )}
          </div>
          <button className="lg:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t bg-white px-4 py-4 lg:hidden space-y-2">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => { document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); }} className="block w-full py-2 text-left text-sm font-medium text-muted-foreground">
                {l.label}
              </button>
            ))}
            <Link to="/login"><Button variant="outline" size="sm" className="w-full">Iniciar Sesión</Button></Link>
            {!registered && (
              <Button size="sm" className="w-full" onClick={() => { document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); }}>
                Registrarme
              </Button>
            )}
          </div>
        )}
      </nav>

      {/* HERO - COUNTDOWN */}
      <section className="relative overflow-hidden min-h-screen flex items-center text-white">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={quantumHeroImg} alt="Economía Cuántica - Mente con telekinesis hacia computador" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(215,70%,8%)]/80 via-[hsl(215,70%,8%)]/60 to-[hsl(215,70%,8%)]/90" />
        </div>
        {/* Glow effects */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(160,55%,42%) 0%, transparent 40%), radial-gradient(circle at 70% 60%, hsl(215,70%,50%) 0%, transparent 40%)' }} />
        
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center lg:px-8 lg:py-32">
          {/* Big Quantum Economy Badge */}
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border-2 border-[hsl(160,55%,42%)]/40 bg-[hsl(160,55%,42%)]/10 px-8 py-3 backdrop-blur-md">
            <Zap className="h-6 w-6 text-[hsl(160,55%,55%)]" />
            <span className="text-lg font-bold tracking-wide uppercase text-[hsl(160,55%,70%)]" style={{ fontFamily: 'Sora, sans-serif' }}>
              Bienvenido a la nueva Economía Cuántica
            </span>
            <Zap className="h-6 w-6 text-[hsl(160,55%,55%)]" />
          </div>

          <h1 className="mb-4 text-5xl font-extrabold leading-none tracking-tight lg:text-7xl xl:text-8xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            Tu mente controla.{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[hsl(160,55%,50%)] via-[hsl(160,65%,65%)] to-[hsl(200,80%,70%)] bg-clip-text text-transparent">
              A3 ejecuta.
            </span>
          </h1>
          
          <p className="mx-auto mb-6 max-w-2xl text-lg text-white/60 lg:text-xl">
            El sistema todo-en-uno con IA que opera tu negocio en paralelo. 
            Tú piensas, A3 hace el resto.
          </p>

          <Badge className="mb-10 border-white/20 bg-white/10 text-white text-sm px-5 py-2">
            <Rocket className="mr-2 h-4 w-4" /> Lanzamiento Oficial — 1° de Abril 2025
          </Badge>

          {/* COUNTDOWN */}
          <div className="mb-12 flex justify-center gap-4 sm:gap-8">
            {[
              { value: countdown.days, label: 'Días' },
              { value: countdown.hours, label: 'Horas' },
              { value: countdown.minutes, label: 'Minutos' },
              { value: countdown.seconds, label: 'Segundos' },
            ].map((t, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[hsl(160,55%,42%)]/30 bg-white/5 backdrop-blur-md sm:h-28 sm:w-28 shadow-lg shadow-[hsl(160,55%,42%)]/10">
                  <span className="text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {String(t.value).padStart(2, '0')}
                  </span>
                </div>
                <span className="mt-3 text-xs font-semibold text-[hsl(160,55%,55%)] uppercase tracking-widest">{t.label}</span>
              </div>
            ))}
          </div>

          {!registered ? (
            <Button
              size="lg"
              className="bg-[hsl(160,55%,42%)] text-white hover:bg-[hsl(160,55%,38%)] text-lg px-10 py-6 shadow-xl shadow-[hsl(160,55%,42%)]/30"
              onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Reservar mi lugar <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[hsl(160,55%,42%)]/40 bg-[hsl(160,55%,42%)]/15 px-8 py-4 backdrop-blur-md">
              <Check className="h-6 w-6 text-[hsl(160,55%,55%)]" />
              <span className="text-lg font-semibold text-[hsl(160,55%,70%)]">¡Ya estás registrado!</span>
            </div>
          )}

          <p className="mt-8 text-sm text-white/30">
            Regístrate • Prueba la IA gratis • Refiere 4 personas = primer mes GRATIS
          </p>
        </div>
      </section>

      {/* BENEFITS STRIP */}
      <section className="border-b bg-white py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 lg:grid-cols-4 lg:px-8">
          {[
            { icon: Sparkles, text: '3 generaciones IA gratis' },
            { icon: Gift, text: 'Refiere 4 = 1er mes gratis' },
            { icon: Zap, text: 'Acceso anticipado' },
            { icon: Star, text: 'Estratega Cuántico incluido' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(215,70%,95%)]">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* REFERRAL PROGRAM EXPLANATION */}
      <section className="bg-[hsl(215,70%,97%)] py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              Refiere y gana tu <span className="text-[hsl(160,55%,42%)]">primer mes gratis</span>
            </h2>
            <p className="text-lg text-muted-foreground">Así de simple: comparte, registran, y tú ganas.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '1', icon: Share2, title: 'Regístrate', desc: 'Completa el formulario y recibe tu código único de referido.' },
              { step: '2', icon: Users, title: 'Comparte tu código', desc: 'Envía tu link o código a contactos que quieran probar A3 SYS.' },
              { step: '3', icon: Gift, title: '4 referidos = mes gratis', desc: 'Cuando 4 personas se registren con tu código, tu primer mes es GRATIS.' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center rounded-2xl border bg-white p-8 text-center shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {s.step}
                </div>
                <s.icon className="mb-3 h-8 w-8 text-[hsl(160,55%,42%)]" />
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REGISTRATION / DASHBOARD */}
      <section id="register" ref={registerRef} className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          {!registered ? (
            /* REGISTRATION FORM */
            <div className="mx-auto max-w-lg">
              <div className="text-center mb-8">
                <h2 className="mb-3 text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Reserva tu lugar ahora
                </h2>
                <p className="text-muted-foreground">
                  Regístrate al lanzamiento y prueba la generación de contenido con IA totalmente gratis.
                </p>
              </div>
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input placeholder="Nombre completo" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex gap-2 flex-1">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="w-[140px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map(c => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={`${COUNTRY_CODES.find(c => c.code === countryCode)?.digits || 9} dígitos`}
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          maxLength={COUNTRY_CODES.find(c => c.code === countryCode)?.digits || 11}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input placeholder="Nombre del negocio" value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input placeholder="Industria (ej: Salud, Fitness, Restaurante)" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} required />
                    </div>
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input placeholder="Código de referido (opcional)" value={form.referral_code_input} onChange={e => setForm(p => ({ ...p, referral_code_input: e.target.value }))} />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Registrando...' : 'Registrarme al Lanzamiento'} <Rocket className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Al registrarte recibes 3 generaciones gratis de contenido con IA + tu código de referidos.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* REGISTERED DASHBOARD */
            <div>
              <div className="text-center mb-8">
                <h2 className="mb-2 text-3xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                  ¡Bienvenido, {userData?.full_name?.split(' ')[0]}! 🚀
                </h2>
                <p className="text-muted-foreground">Tu lugar está reservado para el lanzamiento del 1° de Abril.</p>
              </div>

              {/* WhatsApp Confirmation Banner */}
              <Card className="mb-6 border-2 border-[hsl(142,70%,45%)]/40 bg-[hsl(142,70%,45%)]/5">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-white">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Confirma tu registro</p>
                      <p className="text-xs text-muted-foreground">Envía un mensaje de WhatsApp para validar tu participación</p>
                    </div>
                  </div>
                  <Button
                    className="bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white shrink-0"
                    onClick={() => {
                      const referralLink = `${window.location.origin}/lanzamiento?ref=${userData?.referral_code}`;
                      const dashboardLink = `${window.location.origin}/lanzamiento`;
                      const message = encodeURIComponent(
                        `¡Hola! Acabo de registrarme al lanzamiento de A3 SYS. 🚀\n\nMi código de referido: ${userData?.referral_code}\nMi link para compartir: ${referralLink}\n\nNombre: ${userData?.full_name}\nEmail: ${userData?.email}\nNegocio: ${userData?.business_name}\n\n📊 Recuerda revisar el estado de tus referidos en: ${dashboardLink}`
                      );
                      window.open(`https://wa.me/14472871913?text=${message}`, '_blank');
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Debes confirmar tu registro dando clic aquí
                  </Button>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {/* Referral Code Card */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Share2 className="h-4 w-4" /> Tu Código de Referido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="flex-1 rounded-lg bg-[hsl(215,70%,95%)] px-4 py-3 text-center text-2xl font-bold tracking-widest text-primary" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {userData?.referral_code}
                      </code>
                      <Button variant="outline" size="icon" onClick={copyReferralCode}>
                        {codeCopied ? <Check className="h-4 w-4 text-[hsl(160,55%,42%)]" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" size="sm" onClick={shareReferralLink}>
                      <Share2 className="mr-2 h-3.5 w-3.5" /> Copiar link de invitación
                    </Button>
                  </CardContent>
                </Card>

                {/* Referrals Count Card */}
                <Card className={`border-2 ${freeMonthEarned ? 'border-[hsl(160,55%,42%)] bg-[hsl(160,55%,97%)]' : 'border-muted'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Referidos Registrados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <span className="text-5xl font-bold text-primary" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {referralCount}
                      </span>
                      <span className="text-2xl text-muted-foreground"> / 4</span>
                    </div>
                    <div className="mt-3 flex gap-1.5 justify-center">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-3 flex-1 rounded-full transition-colors ${i < referralCount ? 'bg-[hsl(160,55%,42%)]' : 'bg-muted'}`}
                        />
                      ))}
                    </div>
                    {freeMonthEarned ? (
                      <div className="mt-3 space-y-2">
                        <Badge className="w-full justify-center bg-[hsl(160,55%,42%)] text-white py-1">
                          🎉 ¡Primer mes GRATIS ganado!
                        </Badge>
                        {!userCreated ? (
                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            size="sm"
                            disabled={creatingUser}
                            onClick={handleClaimAccount}
                          >
                            {creatingUser ? (
                              <>
                                <Clock className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Creando tu cuenta...
                              </>
                            ) : (
                              <>
                                <Rocket className="mr-2 h-3.5 w-3.5" />
                                Reclamar mi cuenta A3 SYS
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge className="w-full justify-center bg-primary text-primary-foreground py-1">
                            ✅ Cuenta creada — Pendiente validación
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        Te faltan {4 - referralCount} referido{4 - referralCount !== 1 ? 's' : ''} para tu mes gratis
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Trial Generations Card */}
                <Card className="border-2 border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Generaciones IA Gratis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <span className="text-5xl font-bold text-primary" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {generationsLeft}
                      </span>
                      <span className="text-2xl text-muted-foreground"> / 3</span>
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">generaciones restantes</p>
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      disabled={generationsLeft <= 0}
                      onClick={() => setTrialOpen(true)}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      {generationsLeft > 0 ? 'Probar IA' : 'Límite alcanzado'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Share section */}
              <Card className="border-2 border-dashed border-primary/30 bg-[hsl(215,70%,98%)]">
                <CardContent className="p-6 text-center">
                  <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Comparte y gana tu primer mes gratis
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Envía tu link personalizado a colegas y conocidos. Cuando 4 se registren, tu primer mes es GRATIS.
                  </p>
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <Input
                      readOnly
                      value={`${window.location.origin}/lanzamiento?ref=${userData?.referral_code}`}
                      className="text-xs bg-white"
                    />
                    <Button size="sm" onClick={shareReferralLink}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
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
              <Button className="mt-8" onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}>
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
            SYS = <span className="text-accent">el sistema que vale la pena</span>.
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
      <section className="bg-[hsl(215,70%,97%)] py-16 lg:py-24">
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
      <section className="bg-gradient-to-br from-primary to-[hsl(215,60%,22%)] py-16 text-primary-foreground lg:py-24">
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
                onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Reservar mi lugar <ArrowRight className="ml-2 h-4 w-4" />
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
                    onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
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
      <section className="bg-gradient-to-br from-[hsl(215,70%,12%)] to-[hsl(160,40%,18%)] py-16 text-white lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            No esperes al lanzamiento para empezar a ganar.
          </h2>
          <p className="mb-8 text-lg text-white/70">
            Regístrate hoy, prueba la IA y asegura tu primer mes gratis refiriendo a 4 personas.
          </p>
          {!registered ? (
            <Button
              size="lg"
              className="bg-[hsl(160,55%,42%)] text-white hover:bg-[hsl(160,55%,38%)] text-base px-8"
              onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Registrarme al Lanzamiento <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-[hsl(160,55%,42%)] text-white hover:bg-[hsl(160,55%,38%)] text-base px-8"
              onClick={() => setTrialOpen(true)}
              disabled={generationsLeft <= 0}
            >
              Probar la IA ahora <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
          <p className="mt-6 text-sm text-white/40">
            Lanzamiento 1° de Abril 2025 • Acceso anticipado • Prueba gratuita de IA
          </p>
        </div>
      </section>

      {/* FOOTER */}
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

      {/* WHATSAPP FLOATING */}
      <a
        href="https://wa.me/1234567890?text=Quiero%20A3"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg transition-transform hover:scale-110"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      {/* TRIAL MODAL */}
      <Dialog open={trialOpen} onOpenChange={(open) => { setTrialOpen(open); if (!open && isListening) toggleListening(); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <Sparkles className="h-5 w-5 text-primary" /> Prueba la IA de A3
            </DialogTitle>
            <DialogDescription>
              Describe con detalle qué tipo de contenido deseas. Puedes escribir o usar tu voz 🎙️. Te quedan {generationsLeft} generación{generationsLeft !== 1 ? 'es' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              <Button
                variant={trialType === 'copy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrialType('copy')}
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" /> Copy / Texto
              </Button>
              <Button
                variant={trialType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrialType('image')}
                className="flex-1"
              >
                <Image className="mr-2 h-4 w-4" /> Imagen + Copy
              </Button>
            </div>

            {/* Prompt area with voice */}
            <div className="relative">
              <Textarea
                placeholder={trialType === 'copy'
                  ? 'Describe qué copy deseas: para qué negocio, qué tono, qué red social, qué quieres comunicar...\n\nEj: "Necesito un post para Instagram de mi clínica dental, tono profesional pero cercano, sobre blanqueamiento dental con promoción del 20%"'
                  : 'Describe la imagen que deseas generar con su copy para redes sociales.\n\nEj: "Una imagen llamativa para promocionar mi academia de fitness, con colores vibrantes, estilo moderno, que muestre energía y motivación. El copy debe invitar a una clase gratis"'
                }
                value={trialPrompt}
                onChange={e => setTrialPrompt(e.target.value)}
                rows={5}
                className="pr-14"
              />
              {voiceSupported && (
                <Button
                  type="button"
                  variant={isListening ? 'default' : 'outline'}
                  size="icon"
                  className={`absolute right-2 bottom-2 h-10 w-10 rounded-full ${isListening ? 'bg-destructive hover:bg-destructive/90 animate-pulse' : ''}`}
                  onClick={toggleListening}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {isListening && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> Escuchando... habla y se transcribirá automáticamente
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleTrialGenerate}
              disabled={trialLoading || !trialPrompt.trim() || generationsLeft <= 0}
            >
              {trialLoading ? 'Generando...' : `Generar ${trialType === 'copy' ? 'Copy' : 'Imagen + Copy'}`}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>

            {/* Results */}
            {trialResult && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Resultado:</p>
                <p className="text-sm whitespace-pre-wrap">{trialResult}</p>
              </div>
            )}
            {trialImageUrl && (
              <div className="rounded-lg border overflow-hidden">
                <img src={trialImageUrl} alt="Imagen generada por IA" className="w-full" />
              </div>
            )}

            {/* Platform teaser */}
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Dentro de nuestra plataforma oficial</span> podrás crear varias imágenes en diferentes medidas y formatos para cada red social, generar copies y estrategias profesionales con IA avanzada.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">Esto es solo una prueba de lo que A3 SYS puede hacer por tu negocio. 🚀</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreLaunchPage;
