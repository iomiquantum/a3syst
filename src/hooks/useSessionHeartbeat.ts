import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

const getSessionId = () => {
  let sid = sessionStorage.getItem('a3_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('a3_session_id', sid);
  }
  return sid;
};

const getDeviceType = () => {
  const w = window.innerWidth;
  if (w <= 768) return 'mobile';
  if (w <= 1024) return 'tablet';
  return 'desktop';
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
  // Check direct match
  if (timezoneToCountry[tz]) return timezoneToCountry[tz];

  // Try partial match on major region
  const parts = tz.split('/');
  if (parts[0] === 'America') return 'América';
  if (parts[0] === 'Europe') return 'Europa';
  if (parts[0] === 'Asia') return 'Asia';
  if (parts[0] === 'Africa') return 'África';
  if (parts[0] === 'Australia') return 'Oceanía';

  return 'Desconocido';
};

export const useSessionHeartbeat = () => {
  const startTime = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const country = getCountryFromTimezone(tz);
    const params = new URLSearchParams(window.location.search);

    const sendHeartbeat = async (isFirst = false) => {
      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);

      const sessionData = {
        session_id: sessionId,
        current_page: window.location.pathname,
        last_heartbeat: new Date().toISOString(),
        is_active: true,
        duration_seconds: durationSeconds,
        device_type: getDeviceType(),
        timezone: tz,
        country: country,
        ...(isFirst ? {
          started_at: new Date().toISOString(),
          referrer: document.referrer || null,
          utm_source: params.get('utm_source') || null,
          utm_campaign: params.get('utm_campaign') || null,
        } : {}),
      };

      await supabase
        .from('live_sessions')
        .upsert(sessionData, { onConflict: 'session_id' });
    };

    // Initial heartbeat
    sendHeartbeat(true);

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
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleUnload);
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
