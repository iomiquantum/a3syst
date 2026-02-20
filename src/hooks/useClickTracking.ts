import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const getSessionId = () => {
  let sid = sessionStorage.getItem('a3_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('a3_session_id', sid);
  }
  return sid;
};

// Detect the meaningful zone name from the DOM hierarchy
const getZoneName = (el: HTMLElement): string => {
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    // Check data-zone attribute first (explicit zone labeling)
    const zone = current.getAttribute('data-zone');
    if (zone) return zone;

    // Check aria-label
    const ariaLabel = current.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check section/nav/header/footer/main/aside with id or class hint
    const tag = current.tagName.toLowerCase();
    if (['section', 'nav', 'header', 'footer', 'main', 'aside', 'form'].includes(tag)) {
      const id = current.id;
      if (id) return `${tag}#${id}`;
      const heading = current.querySelector('h1, h2, h3');
      if (heading?.textContent) {
        const text = heading.textContent.trim().slice(0, 40);
        return text;
      }
      return tag;
    }

    // Check meaningful id
    if (current.id && !/^:r|^radix-/.test(current.id)) {
      return `#${current.id}`;
    }

    current = current.parentElement;
  }
  return el.tagName.toLowerCase();
};

// Batch clicks and flush periodically to reduce DB writes
let clickBuffer: {
  page_path: string;
  x_percent: number;
  y_percent: number;
  viewport_width: number;
  viewport_height: number;
  element_tag: string;
  zone_name: string;
  session_id: string;
}[] = [];

let flushTimer: ReturnType<typeof setTimeout> | null = null;

const flushClicks = async () => {
  if (clickBuffer.length === 0) return;
  const batch = [...clickBuffer];
  clickBuffer = [];
  await supabase.from('click_events').insert(batch);
};

export const useClickTracking = () => {
  useEffect(() => {
    const sessionId = getSessionId();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const docWidth = document.documentElement.clientWidth;

      const xPercent = Math.round(((e.pageX) / docWidth) * 10000) / 100;
      const yPercent = Math.round(((e.pageY) / docHeight) * 10000) / 100;

      clickBuffer.push({
        page_path: window.location.pathname,
        x_percent: xPercent,
        y_percent: yPercent,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        element_tag: target.tagName?.toLowerCase() || 'unknown',
        zone_name: getZoneName(target),
        session_id: sessionId,
      });

      // Flush every 5 seconds or when buffer reaches 10
      if (clickBuffer.length >= 10) {
        flushClicks();
      } else if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushClicks();
          flushTimer = null;
        }, 5000);
      }
    };

    document.addEventListener('click', handleClick, true);

    // Flush remaining on unload
    const handleUnload = () => {
      if (clickBuffer.length > 0) {
        const blob = new Blob([JSON.stringify(clickBuffer)], { type: 'application/json' });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/click_events`,
          blob
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('beforeunload', handleUnload);
      if (flushTimer) clearTimeout(flushTimer);
      flushClicks();
    };
  }, []);
};
