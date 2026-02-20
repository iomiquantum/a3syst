import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isBot } from '@/lib/botDetection';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

const getSessionId = () => {
  let sid = sessionStorage.getItem('a3_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('a3_session_id', sid);
  }
  return sid;
};

const getDeviceId = () => {
  let did = localStorage.getItem('a3_device_id');
  if (!did) {
    did = crypto.randomUUID();
    localStorage.setItem('a3_device_id', did);
  }
  return did;
};

const getDeviceType = () => {
  const w = window.innerWidth;
  if (w <= 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
};

const getOS = (): string => {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) {
    if (/iPad|iPhone/.test(ua) || (navigator.maxTouchPoints > 1)) return 'iOS';
    return 'macOS';
  }
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  return 'Otro';
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (/OPR|Opera/.test(ua)) return 'Opera';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Otro';
};

const getDeviceModel = (): string => {
  const ua = navigator.userAgent;
  // iOS devices
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPod/.test(ua)) return 'iPod';
  // Mac with touch (iPad in desktop mode)
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'iPad';
  // Samsung
  const samsung = ua.match(/SM-[A-Z0-9]+/);
  if (samsung) return `Samsung ${samsung[0]}`;
  // Huawei
  if (/HUAWEI|huawei/.test(ua)) {
    const hw = ua.match(/HUAWEI\s([A-Za-z0-9-]+)/i);
    return hw ? `Huawei ${hw[1]}` : 'Huawei';
  }
  // Xiaomi / Redmi / POCO
  if (/Redmi|POCO|Mi\s/.test(ua)) {
    const xi = ua.match(/(Redmi[^\s;)]+|POCO[^\s;)]+|Mi\s[^\s;)]+)/);
    return xi ? xi[1] : 'Xiaomi';
  }
  // Generic Android model
  const android = ua.match(/;\s*([^;)]+)\s*Build\//);
  if (android) return android[1].trim();
  // Desktop
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  if (/CrOS/.test(ua)) return 'Chromebook';
  if (/Linux/.test(ua)) return 'PC Linux';
  return '';
};

// Map common timezones to country names
const timezoneToCountry: Record<string, string> = {
  'America/Guayaquil': 'Ecuador',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Perú',
  'America/Mexico_City': 'México',
  'America/Cancun': 'México',
  'America/Monterrey': 'México',
  'America/Buenos_Aires': 'Argentina',
  'America/Santiago': 'Chile',
  'America/Caracas': 'Venezuela',
  'America/La_Paz': 'Bolivia',
  'America/Asuncion': 'Paraguay',
  'America/Montevideo': 'Uruguay',
  'America/Panama': 'Panamá',
  'America/Costa_Rica': 'Costa Rica',
  'America/Guatemala': 'Guatemala',
  'America/El_Salvador': 'El Salvador',
  'America/Tegucigalpa': 'Honduras',
  'America/Managua': 'Nicaragua',
  'America/Santo_Domingo': 'Rep. Dominicana',
  'America/Havana': 'Cuba',
  'America/Puerto_Rico': 'Puerto Rico',
  'America/New_York': 'Estados Unidos',
  'America/Chicago': 'Estados Unidos',
  'America/Denver': 'Estados Unidos',
  'America/Los_Angeles': 'Estados Unidos',
  'America/Toronto': 'Canadá',
  'America/Sao_Paulo': 'Brasil',
  'Europe/Madrid': 'España',
  'Europe/London': 'Reino Unido',
  'Europe/Paris': 'Francia',
  'Europe/Berlin': 'Alemania',
  'Europe/Rome': 'Italia',
};

const getCountryFromTimezone = (tz: string): string => {
  if (timezoneToCountry[tz]) return timezoneToCountry[tz];
  const parts = tz.split('/');
  if (parts[0] === 'America') return 'América';
  if (parts[0] === 'Europe') return 'Europa';
  if (parts[0] === 'Asia') return 'Asia';
  if (parts[0] === 'Africa') return 'África';
  if (parts[0] === 'Australia') return 'Oceanía';
  return 'Desconocido';
};

const getCityFromTimezone = (tz: string): string => {
  const parts = tz.split('/');
  const city = parts[parts.length - 1];
  return city ? city.replace(/_/g, ' ') : '';
};

export const useSessionHeartbeat = () => {
  const startTime = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Skip bots, crawlers, and preview iframes
    if (isBot()) return;

    const sessionId = getSessionId();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const country = getCountryFromTimezone(tz);
    const params = new URLSearchParams(window.location.search);

    const deviceId = getDeviceId();

    const sendHeartbeat = async (isFirst = false) => {
      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);

      const sessionData: Record<string, unknown> = {
        session_id: sessionId,
        device_id: deviceId,
        current_page: window.location.pathname,
        last_heartbeat: new Date().toISOString(),
        is_active: true,
        duration_seconds: durationSeconds,
        device_type: getDeviceType(),
        device_model: getDeviceModel(),
        os: getOS(),
        browser: getBrowser(),
        timezone: tz,
        country: country,
        region: getCityFromTimezone(tz),
        ...(isFirst ? {
          started_at: new Date().toISOString(),
          referrer: document.referrer || null,
          utm_source: params.get('utm_source') || null,
          utm_campaign: params.get('utm_campaign') || null,
        } : {}),
      };

      await supabase
        .from('live_sessions')
        .upsert(sessionData as any, { onConflict: 'session_id' });
    };

    // Initial heartbeat
    sendHeartbeat(true);

    // Early heartbeat after 5s to capture short sessions
    const earlyTimeout = setTimeout(() => sendHeartbeat(), 5000);

    // Periodic heartbeat
    intervalRef.current = setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL);

    // Mark session as inactive on unload
    const handleUnload = () => {
      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/live_sessions?session_id=eq.${sessionId}`;
      const body = JSON.stringify({
        is_active: false,
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        last_heartbeat: new Date().toISOString(),
      });
      // sendBeacon doesn't support custom headers, use fetch with keepalive instead
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    // Update page on visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        sendHeartbeat(); // One last heartbeat before going to background
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(earlyTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
};

// Call this when a user registers to flag their session
export const markSessionAsRegistered = async () => {
  const sessionId = sessionStorage.getItem('a3_session_id');
  if (!sessionId) return;
  await supabase
    .from('live_sessions')
    .update({ did_register: true })
    .eq('session_id', sessionId);
};
