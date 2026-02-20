import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, Radio, Globe, Clock, Monitor, Smartphone, Tablet,
  UserCheck, UserX, Eye, MapPin, ArrowUpRight, ChevronDown, ChevronRight, Hash, MousePointer
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LiveSession {
  id: string;
  session_id: string;
  device_id: string | null;
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
  device_model: string | null;
  os: string | null;
  browser: string | null;
  device_number: number | null;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

interface DeviceGroup {
  device_id: string;
  device_number: number;
  device_type: string;
  device_model: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  sessions: LiveSession[];
  activeSessions: LiveSession[];
  totalDuration: number;
  lastSeen: string;
  didRegister: boolean;
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

const ACTIVE_THRESHOLD_SECONDS = 90;

const LiveSessionsView = () => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [sessionZones, setSessionZones] = useState<Record<string, string[]>>({});

  const fetchSessions = async () => {
    setLoading(true);
    
    await supabase
      .from("live_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() } as any)
      .eq("is_active", true)
      .lt("last_heartbeat", new Date(Date.now() - ACTIVE_THRESHOLD_SECONDS * 1000).toISOString());
    
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .not("device_id", "is", null)
      .gt("device_number", 0)
      .not("browser", "ilike", "%bot%")
      .neq("country", "Desconocido")
      .order("last_heartbeat", { ascending: false })
      .limit(500);
    // Additional client-side filtering for edge cases
    const filtered = (data || []).filter((s: any) => {
      // Filter UTC timezone with 0 duration (health checks)
      if (s.timezone === 'UTC' && s.duration_seconds === 0) return false;
      // Filter browser = 'Otro' with no model (crawlers)
      if (s.browser === 'Otro' && !s.device_model) return false;
      return true;
    });
    if (!error) setSessions(filtered as unknown as LiveSession[]);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    const channel = supabase
      .channel('live-sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {
        fetchSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const deviceGroups = useMemo(() => {
    const now = Date.now();
    const groups: Record<string, DeviceGroup> = {};

    sessions.forEach(s => {
      // Group by physical device fingerprint (model+os+browser+region) to merge same device across origins
      const fingerprint = `${s.device_model || 'unknown'}_${s.os || 'unknown'}_${s.browser || 'unknown'}_${s.region || ''}_${s.country || ''}`;
      const key = fingerprint;
      if (!groups[key]) {
        groups[key] = {
          device_id: key,
          device_number: s.device_number || 0,
          device_type: s.device_type,
          device_model: s.device_model,
          os: s.os,
          browser: s.browser,
          country: s.country,
          region: s.region,
          sessions: [],
          activeSessions: [],
          totalDuration: 0,
          lastSeen: s.last_heartbeat,
          didRegister: false,
        };
      }
      groups[key].sessions.push(s);
      groups[key].totalDuration += s.duration_seconds || 0;
      if (s.did_register) groups[key].didRegister = true;

      const isActive = s.is_active && (now - new Date(s.last_heartbeat).getTime()) < ACTIVE_THRESHOLD_SECONDS * 1000;
      if (isActive) groups[key].activeSessions.push(s);

      if (new Date(s.last_heartbeat) > new Date(groups[key].lastSeen)) {
        groups[key].lastSeen = s.last_heartbeat;
        groups[key].country = s.country;
        groups[key].region = s.region;
        groups[key].device_type = s.device_type;
        groups[key].device_model = s.device_model;
        groups[key].os = s.os;
        groups[key].browser = s.browser;
      }
    });

    return Object.values(groups).sort((a, b) => {
      // Active devices first
      if (a.activeSessions.length > 0 && b.activeSessions.length === 0) return -1;
      if (a.activeSessions.length === 0 && b.activeSessions.length > 0) return 1;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
  }, [sessions]);

  const activeDevices = useMemo(() => deviceGroups.filter(d => d.activeSessions.length > 0), [deviceGroups]);

  const countryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeDevices.forEach(d => {
      const c = d.country || 'Desconocido';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeDevices]);

  const registeredCount = useMemo(() => deviceGroups.filter(d => d.didRegister).length, [deviceGroups]);

  const avgDuration = useMemo(() => {
    const withDuration = deviceGroups.filter(d => d.totalDuration > 0);
    if (!withDuration.length) return 0;
    return Math.round(withDuration.reduce((a, d) => a + d.totalDuration, 0) / withDuration.length);
  }, [deviceGroups]);

  const toggleDevice = (deviceId: string) => {
    setExpandedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  // Fetch zones for sessions when a device is expanded
  const fetchZonesForDevice = useCallback(async (deviceId: string) => {
    const device = deviceGroups.find(d => d.device_id === deviceId);
    if (!device) return;
    const sessionIds = device.sessions.map(s => s.session_id);
    // Skip already fetched
    const missing = sessionIds.filter(sid => !sessionZones[sid]);
    if (missing.length === 0) return;

    const { data } = await supabase
      .from('click_events')
      .select('session_id, zone_name')
      .in('session_id', missing)
      .not('zone_name', 'is', null);

    if (data) {
      const zonesMap: Record<string, Set<string>> = {};
      data.forEach((row: any) => {
        if (!zonesMap[row.session_id]) zonesMap[row.session_id] = new Set();
        if (row.zone_name) zonesMap[row.session_id].add(row.zone_name);
      });
      setSessionZones(prev => {
        const updated = { ...prev };
        missing.forEach(sid => {
          updated[sid] = zonesMap[sid] ? Array.from(zonesMap[sid]) : [];
        });
        return updated;
      });
    }
  }, [deviceGroups, sessionZones]);

  // Fetch zones when device is expanded
  useEffect(() => {
    expandedDevices.forEach(deviceId => {
      fetchZonesForDevice(deviceId);
    });
  }, [expandedDevices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            Sesiones en Vivo
          </h2>
          <p className="text-sm text-muted-foreground">Monitorea visitantes en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Radio className="h-3.5 w-3.5 mr-1" />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Dispositivos en vivo</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{activeDevices.length}</p>
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
              <Hash className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Dispositivos únicos</span>
            </div>
            <p className="text-2xl font-bold">{deviceGroups.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Device list */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                Dispositivos ({deviceGroups.length})
              </h3>
              {deviceGroups.length === 0 ? (
                <div className="text-center py-10">
                  <Radio className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay dispositivos registrados</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {deviceGroups.map(device => {
                      const isActive = device.activeSessions.length > 0;
                      const isExpanded = expandedDevices.has(device.device_id);

                      return (
                        <Collapsible key={device.device_id} open={isExpanded} onOpenChange={() => toggleDevice(device.device_id)}>
                          <div className={`rounded-lg border transition-colors ${isActive ? 'border-green-500/40 bg-green-500/5' : 'bg-card hover:bg-muted/50'}`}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                                    <Badge variant={isActive ? "default" : "outline"} className="text-[10px] px-1.5 py-0 mb-0.5">
                                      #{device.device_number}
                                    </Badge>
                                    <DeviceIcon type={device.device_type} />
                                    <span className="text-[10px] text-muted-foreground font-medium">{device.device_model || device.device_type}</span>
                                    <span className="text-[10px] text-muted-foreground">{device.os || '—'} · {device.browser || '—'}</span>
                                  </div>
                                  <div className="text-left">
                                    <div className="flex items-center gap-2">
                                      {isActive && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                                      <span className="text-sm font-medium">
                                        {device.activeSessions.length > 0 ? device.activeSessions[0].current_page : device.sessions[0]?.current_page || '/'}
                                      </span>
                                      {device.didRegister && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">Registrado</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {device.region ? `${device.region}, ` : ''}{device.country || 'Desconocido'}
                                      </span>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {device.sessions.length} {device.sessions.length === 1 ? 'sesión' : 'sesiones'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className={`text-sm font-semibold ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                                      {isActive ? `${formatDuration(device.activeSessions[0]?.duration_seconds || 0)} en línea` : timeAgo(device.lastSeen)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Total: {formatDuration(device.totalDuration)}
                                    </p>
                                  </div>
                                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t px-3 pb-3">
                                <p className="text-xs font-semibold text-muted-foreground py-2">Historial de sesiones</p>
                                <div className="space-y-1">
                                  {device.sessions.map(s => {
                                    const sActive = s.is_active && (Date.now() - new Date(s.last_heartbeat).getTime()) < ACTIVE_THRESHOLD_SECONDS * 1000;
                                    return (
                                      <div key={s.id} className={`text-xs p-2 rounded ${sActive ? 'bg-green-500/10' : 'bg-muted/30'}`}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {sActive && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                                            <span className="font-medium">{s.current_page}</span>
                                            <span className="text-muted-foreground">
                                              {new Date(s.started_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                              {' '}
                                              {new Date(s.started_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {s.ended_at && (
                                              <span className="text-muted-foreground">
                                                → {new Date(s.ended_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{formatDuration(s.duration_seconds)}</span>
                                            {s.utm_source && (
                                              <span className="flex items-center gap-0.5 text-muted-foreground">
                                                <ArrowUpRight className="h-3 w-3" />{s.utm_source}
                                              </span>
                                            )}
                                            {s.did_register && <UserCheck className="h-3 w-3 text-emerald-500" />}
                                          </div>
                                        </div>
                                        {sessionZones[s.session_id] && sessionZones[s.session_id].length > 0 && (
                                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                            <MousePointer className="h-3 w-3 text-muted-foreground" />
                                            {sessionZones[s.session_id].slice(0, 5).map(zone => (
                                              <Badge key={zone} variant="outline" className="text-[10px] px-1.5 py-0">
                                                {zone}
                                              </Badge>
                                            ))}
                                            {sessionZones[s.session_id].length > 5 && (
                                              <span className="text-[10px] text-muted-foreground">+{sessionZones[s.session_id].length - 5}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
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
                    <Badge variant="secondary">{c.count} {c.count === 1 ? 'dispositivo' : 'dispositivos'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveSessionsView;
