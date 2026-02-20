import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isBot } from '@/lib/botDetection';

const getSessionId = () => {
  let sid = sessionStorage.getItem('a3_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('a3_session_id', sid);
  }
  return sid;
};

export const usePageTracking = () => {
  const startTime = useRef(Date.now());
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Skip bots, crawlers, and preview iframes
    if (isBot()) return;

    const params = new URLSearchParams(window.location.search);
    const sessionId = getSessionId();

    const visitData = {
      page_path: window.location.pathname,
      referrer: document.referrer || null,
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_content: params.get('utm_content') || null,
      utm_term: params.get('utm_term') || null,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      session_id: sessionId,
    };

    supabase.from('page_visits').insert(visitData).then(() => {});

    // Track duration on unload
    const handleUnload = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      const blob = new Blob(
        [JSON.stringify({ duration_seconds: duration, session_id: sessionId, page_path: window.location.pathname })],
        { type: 'application/json' }
      );
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_visits?session_id=eq.${sessionId}&page_path=eq.${encodeURIComponent(window.location.pathname)}`,
        blob
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
};
