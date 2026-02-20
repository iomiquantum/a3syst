/**
 * Bot & artificial traffic detection for analytics accuracy.
 * Filters out: crawlers, headless browsers, Lovable preview iframe,
 * health checks, and other non-human traffic.
 */

const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /headless/i, /phantom/i, /puppeteer/i, /playwright/i, /selenium/i,
  /lighthouse/i, /pagespeed/i, /gtmetrix/i, /pingdom/i, /uptimerobot/i,
  /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i, /bingbot/i,
  /googlebot/i, /yandexbot/i, /baiduspider/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /whatsapp/i, /telegrambot/i,
  /applebot/i, /duckduckbot/i, /ia_archiver/i, /archive\.org/i,
  /wget/i, /curl/i, /httpie/i, /python-requests/i, /axios/i,
  /node-fetch/i, /go-http-client/i, /java\//i, /okhttp/i,
];

// Chrome 119 with screen_width 800 + Windows is a known health-check pattern
const HEALTH_CHECK_PATTERN = /Chrome\/119\.0\.0\.0/;

const PREVIEW_REFERRERS = [
  'lovable.dev',
  'lovableproject.com',
  'localhost',
  '127.0.0.1',
  'preview--',
];

/**
 * Returns true if the current browsing context appears to be a bot,
 * crawler, health check, or preview iframe — not a real user.
 */
export const isBot = (): boolean => {
  const ua = navigator.userAgent;

  // 1. Known bot user-agents
  if (BOT_UA_PATTERNS.some(p => p.test(ua))) return true;

  // 2. Health-check pattern: Chrome 119 + screen 800
  if (HEALTH_CHECK_PATTERN.test(ua) && window.screen.width === 800) return true;

  // 3. WebDriver / automation flags
  if ((navigator as any).webdriver) return true;

  // 4. Lovable preview iframe detection
  const ref = document.referrer;
  if (ref && PREVIEW_REFERRERS.some(p => ref.includes(p))) return true;

  // 5. If running inside an iframe from lovable/preview origins
  try {
    if (window.self !== window.top) {
      const parentOrigin = document.referrer;
      if (parentOrigin && PREVIEW_REFERRERS.some(p => parentOrigin.includes(p))) return true;
    }
  } catch {
    // cross-origin iframe — can't check, assume ok
  }

  // 6. Timezone UTC + screen 800 is suspicious (headless environments)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === 'UTC' && window.screen.width === 800) return true;

  return false;
};
