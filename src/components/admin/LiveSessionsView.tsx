import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, Radio, Globe, Clock, Monitor, Smartphone, Tablet,
  UserCheck, UserX, Eye, MapPin, ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveSession {
  id: string;
  session_id: string;
  current_page: string;
  country: string | null;
  region: string | null;
  timezone: string | null;
  started_at: string;
  last_heartbeat: string;
  ended_at: string | null;
  duration_seconds: number;
  is_active: boolean;
  did_register: boolean;
  device_type: string;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

const formatDuration = (secs: number) => {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const timeAgo = (date: string) => {
  const diff = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
};

const DeviceIcon = ({ type }: { type: string }) => {
  if (type === 'mobile') return <Smartphone className="h-4 w-4" />;
  if (type === 'tablet') return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

const ACTIVE_THRESHOLD_SECONDS = 90; // Consider inactive after 90s without heartbeat (heartbeat interval is 30s)

const LiveSessionsView = () => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    
    // First, mark stale sessions as inactive server-side
    await supabase
      .from("live_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("is_active", true)
      .lt("last_heartbeat", new Date(Date.now() - ACTIVE_THRESHOLD_SECONDS * 1000).toISOString());
    
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .order("last_heartbeat", { ascending: false })
      .limit(200);
    if (!error && data) setSessions(data as LiveSession[]);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('live-sessions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_sessions',
      }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter(s => {
      if (!s.is_active) return false;
      const lastBeat = new Date(s.last_heartbeat).getTime();
      return (now - lastBeat) < ACTIVE_THRESHOLD_SECONDS * 1000;
    });
  }, [sessions]);

  const recentlyEnded = useMemo(() => {
    const now = Date.now();
    return sessions.filter(s => {
      if (s.is_active) {
        const lastBeat = new Date(s.last_heartbeat).getTime();
        return (now - lastBeat) >= ACTIVE_THRESHOLD_SECONDS * 1000;
      }
      return true;
    }).slice(0, 50);
  }, [sessions]);

  const countryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeSessions.forEach(s => {
      const c = s.country || 'Desconocido';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeSessions]);

  const registeredCount = useMemo(
    () => sessions.filter(s => s.did_register).length,
    [sessions]
  );

  const avgDuration = useMemo(() => {
    const ended = recentlyEnded.filter(s => s.duration_seconds > 0);
    if (!ended.length) return 0;
    return Math.round(ended.reduce((a, s) => a + s.duration_seconds, 0) / ended.length);
  }, [recentlyEnded]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            Sesiones en Vivo
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitorea visitantes en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Radio className="h-3.5 w-3.5 mr-1" />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">En vivo ahora</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{activeSessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Países</span>
            </div>
            <p className="text-2xl font-bold">{countryBreakdown.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Duración promedio</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Se registraron</span>
            </div>
            <p className="text-2xl font-bold">{registeredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total sesiones</span>
            </div>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active sessions list */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Visitantes activos ({activeSessions.length})
              </h3>
              {activeSessions.length === 0 ? (
                <div className="text-center py-10">
                  <Radio className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay visitantes activos en este momento</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {activeSessions.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-0.5">
                            <DeviceIcon type={s.device_type} />
                            <span className="text-[10px] text-muted-foreground capitalize">{s.device_type}</span>
                            <span className="text-[10px] text-muted-foreground">{s.os || '—'} · {s.browser || '—'}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{s.current_page}</span>
                              {s.did_register && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Registrado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {s.region ? `${s.region}, ` : ''}{s.country || 'Desconocido'}
                              </span>
                              {s.utm_source && (
                                <span className="flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {s.utm_source}
                                </span>
                              )}
                              {s.referrer && !s.utm_source && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {(() => { try { return new URL(s.referrer).hostname; } catch { return 'Referido'; } })()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">{formatDuration(s.duration_seconds)} en línea</p>
                          <p className="text-[10px] text-muted-foreground">
                            Último latido: {timeAgo(s.last_heartbeat)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Country breakdown */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Ubicación de visitantes
            </h3>
            {countryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin visitantes activos</p>
            ) : (
              <div className="space-y-3">
                {countryBreakdown.map(c => (
                  <div key={c.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{c.country}</span>
                    </div>
                    <Badge variant="secondary">{c.count} {c.count === 1 ? 'visitante' : 'visitantes'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently ended sessions */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Sesiones finalizadas (historial reciente)
          </h3>
          <ScrollArea className="h-[350px]">
            {recentlyEnded.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin historial</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-9 gap-2 text-xs font-semibold text-muted-foreground px-3 py-2 border-b">
                  <span>Dispositivo</span>
                  <span>SO</span>
                  <span>Navegador</span>
                  <span>País</span>
                  <span>Ciudad</span>
                  <span>Página</span>
                  <span>Duración</span>
                  <span>Fuente</span>
                  <span>¿Registrado?</span>
                </div>
                {recentlyEnded.map(s => (
                  <div
                    key={s.id}
                    className="grid grid-cols-9 gap-2 text-sm px-3 py-2.5 border-b last:border-0 items-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <DeviceIcon type={s.device_type} />
                      <span className="text-xs capitalize">{s.device_type}</span>
                    </div>
                    <span className="text-xs">{s.os || '—'}</span>
                    <span className="text-xs">{s.browser || '—'}</span>
                    <span className="text-xs">{s.country || '—'}</span>
                    <span className="text-xs">{s.region || '—'}</span>
                    <span className="text-xs font-medium truncate">{s.current_page}</span>
                    <span className="text-xs font-semibold">{formatDuration(s.duration_seconds)}</span>
                    <span className="text-xs text-muted-foreground">{s.utm_source || (s.referrer ? (() => { try { return new URL(s.referrer).hostname; } catch { return 'Referido'; } })() : 'Directo')}</span>
                    <div>
                      {s.did_register ? (
                        <Badge variant="default" className="text-[10px]">
                          <UserCheck className="h-3 w-3 mr-1" /> Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          <UserX className="h-3 w-3 mr-1" /> No
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSessionsView;
