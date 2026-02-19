import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Rocket, Clock, Users, Gift, Copy, Check, ArrowRight, Sparkles,
  Mail, Phone, User, Briefcase, Globe, Share2, Image, FileText,
  Menu, X, MessageCircle, ChevronRight, Zap, Star
} from 'lucide-react';
import quantumHeroImg from '@/assets/quantum-hero.jpg';

const LAUNCH_DATE = new Date('2025-04-01T00:00:00');

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

const PreLaunchPage = () => {
  const { toast } = useToast();
  const countdown = useCountdown(LAUNCH_DATE);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Registration form
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', business_name: '', industry: '', referral_code_input: '' });

  // Content trial
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialPrompt, setTrialPrompt] = useState('');
  const [trialType, setTrialType] = useState<'copy' | 'image'>('copy');
  const [trialResult, setTrialResult] = useState('');
  const [trialImageUrl, setTrialImageUrl] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);

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
    setLoading(true);
    try {
      const insertData: any = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
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

  // Extract referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setForm(p => ({ ...p, referral_code_input: ref }));
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
            <Link to="/">
              <Button variant="ghost" size="sm">Inicio</Button>
            </Link>
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
            <Link to="/"><Button variant="ghost" size="sm" className="w-full justify-start">Inicio</Button></Link>
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
      <section id="register" className="bg-white py-16 lg:py-20">
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
                      <Input placeholder="WhatsApp / Teléfono" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
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
                      <Badge className="mt-3 w-full justify-center bg-[hsl(160,55%,42%)] text-white py-1">
                        🎉 ¡Primer mes GRATIS ganado!
                      </Badge>
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

      {/* WHAT YOU GET */}
      <section className="bg-[hsl(215,70%,97%)] py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center lg:px-8">
          <h2 className="mb-3 text-3xl font-bold tracking-tight lg:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
            ¿Qué es A3 SYS?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Un sistema todo-en-uno con IA que opera tu negocio: atención, ventas, contenido, marketing y estrategia. 
            Todo integrado. Todo automatizado.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: MessageCircle, title: 'Atención al Cliente', desc: 'Inbox centralizado con IA conversacional' },
              { icon: Users, title: 'CRM & Call Center', desc: 'Pipeline de ventas y seguimiento ordenado' },
              { icon: Sparkles, title: 'Contenido con IA', desc: 'Imágenes, copies y videos listos para publicar' },
              { icon: Zap, title: 'Automatización', desc: 'Tareas que se ejecutan solas, en paralelo' },
              { icon: Globe, title: 'Marketing', desc: 'Segmentación y campañas inteligentes' },
              { icon: Star, title: 'Estratega Cuántico', desc: 'Sesión semanal en vivo + estrategia aplicada' },
            ].map((item, i) => (
              <Card key={i} className="transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <item.icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-1 font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
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
      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <Sparkles className="h-5 w-5 text-primary" /> Prueba la IA de A3
            </DialogTitle>
            <DialogDescription>
              Genera contenido profesional para tu negocio. Te quedan {generationsLeft} generación{generationsLeft !== 1 ? 'es' : ''}.
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
                <Image className="mr-2 h-4 w-4" /> Imagen
              </Button>
            </div>
            <Textarea
              placeholder={trialType === 'copy'
                ? 'Ej: Escribe un post para Instagram sobre los beneficios de mi clínica dental...'
                : 'Ej: Imagen promocional para una academia de fitness, estilo moderno y profesional...'
              }
              value={trialPrompt}
              onChange={e => setTrialPrompt(e.target.value)}
              rows={3}
            />
            <Button
              className="w-full"
              onClick={handleTrialGenerate}
              disabled={trialLoading || !trialPrompt.trim() || generationsLeft <= 0}
            >
              {trialLoading ? 'Generando...' : `Generar ${trialType === 'copy' ? 'Copy' : 'Imagen'}`}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreLaunchPage;
