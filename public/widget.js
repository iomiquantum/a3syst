(function() {
  const WIDGET_ID = 'iomi-chat-widget';
  if (document.getElementById(WIDGET_ID)) return;

  const config = window.IOMI_WIDGET || {};
  const CLINIC_ID = config.clinicId || '';
  const API_URL = config.apiUrl || '';
  const PRIMARY_COLOR = config.primaryColor || '#6366f1';
  const TITLE = config.title || 'Chat con nosotros';
  const SUBTITLE = config.subtitle || 'Te responderemos lo antes posible';

  if (!CLINIC_ID || !API_URL) {
    console.error('IOMI Widget: clinicId and apiUrl are required');
    return;
  }

  let conversationId = localStorage.getItem('iomi_conv_id') || '';
  let isOpen = false;
  let polling = null;
  let renderedMsgIds = new Set(); // track rendered message IDs to avoid duplicates
  let msgCount = 0; // rate limiting
  let lastMsgTime = 0;
  let captchaAnswer = null;
  let captchaQuestion = '';

  // Country codes with ISO mapping for geo-detection
  const COUNTRY_CODES = [
    { code: '+54', country: '🇦🇷 AR', name: 'Argentina', iso: 'AR' },
    { code: '+56', country: '🇨🇱 CL', name: 'Chile', iso: 'CL' },
    { code: '+57', country: '🇨🇴 CO', name: 'Colombia', iso: 'CO' },
    { code: '+52', country: '🇲🇽 MX', name: 'México', iso: 'MX' },
    { code: '+51', country: '🇵🇪 PE', name: 'Perú', iso: 'PE' },
    { code: '+598', country: '🇺🇾 UY', name: 'Uruguay', iso: 'UY' },
    { code: '+58', country: '🇻🇪 VE', name: 'Venezuela', iso: 'VE' },
    { code: '+1', country: '🇺🇸 US', name: 'Estados Unidos', iso: 'US' },
    { code: '+34', country: '🇪🇸 ES', name: 'España', iso: 'ES' },
    { code: '+55', country: '🇧🇷 BR', name: 'Brasil', iso: 'BR' },
    { code: '+593', country: '🇪🇨 EC', name: 'Ecuador', iso: 'EC' },
    { code: '+591', country: '🇧🇴 BO', name: 'Bolivia', iso: 'BO' },
    { code: '+595', country: '🇵🇾 PY', name: 'Paraguay', iso: 'PY' },
    { code: '+506', country: '🇨🇷 CR', name: 'Costa Rica', iso: 'CR' },
    { code: '+507', country: '🇵🇦 PA', name: 'Panamá', iso: 'PA' },
  ];

  // Auto-detect country by IP
  function autoSelectCountry() {
    fetch('https://ipapi.co/json/', { mode: 'cors' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.country_code) {
          var sel = document.getElementById('iomi-country-code');
          if (!sel) return;
          var match = COUNTRY_CODES.find(function(c) { return c.iso === data.country_code; });
          if (match) { sel.value = match.code; }
        }
      })
      .catch(function() { /* silent - keep default */ });
  }

  function generateCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    captchaAnswer = a + b;
    captchaQuestion = '¿Cuánto es ' + a + ' + ' + b + '?';
  }

  // Rate limit: max 5 messages per 30 seconds
  function checkRateLimit() {
    const now = Date.now();
    if (now - lastMsgTime > 30000) { msgCount = 0; }
    if (msgCount >= 5) return false;
    msgCount++;
    lastMsgTime = now;
    return true;
  }

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #${WIDGET_ID} * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #${WIDGET_ID} .iomi-fab { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: ${PRIMARY_COLOR}; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 99999; transition: transform 0.2s; }
    #${WIDGET_ID} .iomi-fab:hover { transform: scale(1.08); }
    #${WIDGET_ID} .iomi-fab svg { width: 28px; height: 28px; fill: white; }
    #${WIDGET_ID} .iomi-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-height: 650px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); z-index: 99999; display: none; flex-direction: column; overflow: hidden; animation: iomi-slide-up 0.25s ease; }
    #${WIDGET_ID} .iomi-panel.open { display: flex; }
    @keyframes iomi-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    #${WIDGET_ID} .iomi-header { background: ${PRIMARY_COLOR}; color: white; padding: 20px; position: relative; }
    #${WIDGET_ID} .iomi-header h3 { font-size: 16px; font-weight: 600; padding-right: 28px; }
    #${WIDGET_ID} .iomi-close-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; color: white; cursor: pointer; opacity: 0.8; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    #${WIDGET_ID} .iomi-close-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }
    #${WIDGET_ID} .iomi-header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    #${WIDGET_ID} .iomi-messages { flex: 1; overflow-y: auto; padding: 16px; min-height: 120px; max-height: 260px; background: #f9fafb; }
    #${WIDGET_ID} .iomi-msg { margin-bottom: 8px; display: flex; }
    #${WIDGET_ID} .iomi-msg.out { justify-content: flex-end; }
    #${WIDGET_ID} .iomi-msg .bubble { max-width: 75%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-break: break-word; }
    #${WIDGET_ID} .iomi-msg.in .bubble { background: white; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; color: #1f2937; }
    #${WIDGET_ID} .iomi-msg.out .bubble { background: ${PRIMARY_COLOR}; color: white; border-bottom-right-radius: 4px; }
    #${WIDGET_ID} .iomi-form { padding: 12px 16px; border-top: 1px solid #e5e7eb; background: white; }
    #${WIDGET_ID} .iomi-form input, #${WIDGET_ID} .iomi-form textarea, #${WIDGET_ID} .iomi-form select { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; margin-bottom: 8px; resize: none; background: white; color: #1f2937; }
    #${WIDGET_ID} .iomi-form input:focus, #${WIDGET_ID} .iomi-form textarea:focus, #${WIDGET_ID} .iomi-form select:focus { border-color: ${PRIMARY_COLOR}; }
    #${WIDGET_ID} .iomi-form button { width: 100%; background: ${PRIMARY_COLOR}; color: white; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    #${WIDGET_ID} .iomi-form button:hover { opacity: 0.9; }
    #${WIDGET_ID} .iomi-form button:disabled { opacity: 0.5; cursor: not-allowed; }
    #${WIDGET_ID} .iomi-phone-row { display: flex; gap: 6px; margin-bottom: 8px; }
    #${WIDGET_ID} .iomi-phone-row select { width: 110px; flex-shrink: 0; margin-bottom: 0; font-size: 13px; }
    #${WIDGET_ID} .iomi-phone-row input { flex: 1; margin-bottom: 0; }
    #${WIDGET_ID} .iomi-captcha { background: #f3f4f6; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 13px; color: #374151; display: flex; align-items: center; gap: 8px; }
    #${WIDGET_ID} .iomi-captcha span { font-weight: 600; flex-shrink: 0; }
    #${WIDGET_ID} .iomi-captcha input { flex: 1; margin-bottom: 0; width: auto; text-align: center; font-size: 16px; font-weight: 600; padding: 6px 8px; }
    #${WIDGET_ID} .iomi-error { color: #dc2626; font-size: 12px; margin-bottom: 8px; }
    #${WIDGET_ID} .iomi-hp { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; }
    #${WIDGET_ID} .iomi-composer { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: white; }
    #${WIDGET_ID} .iomi-composer input { flex: 1; border: 1px solid #d1d5db; border-radius: 20px; padding: 8px 16px; font-size: 14px; outline: none; }
    #${WIDGET_ID} .iomi-composer button { width: 40px; height: 40px; border-radius: 50%; background: ${PRIMARY_COLOR}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    #${WIDGET_ID} .iomi-composer button svg { width: 18px; height: 18px; fill: white; }
    #${WIDGET_ID} .iomi-powered { text-align: center; padding: 6px; font-size: 10px; color: #9ca3af; background: white; }
    @media (max-width: 420px) { #${WIDGET_ID} .iomi-panel { right: 8px; left: 8px; width: auto; bottom: 88px; } }
  `;
  document.head.appendChild(style);

  // Container
  const container = document.createElement('div');
  container.id = WIDGET_ID;

  // FAB
  const fab = document.createElement('button');
  fab.className = 'iomi-fab';
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h11zm4 0h2v2h-2z"/></svg>';
  fab.onclick = () => togglePanel();

  // Panel
  const panel = document.createElement('div');
  panel.className = 'iomi-panel';

  // Header
  panel.innerHTML = `
    <div class="iomi-header">
      <h3>${TITLE}</h3>
      <p>${SUBTITLE}</p>
      <button class="iomi-close-btn" aria-label="Cerrar" id="iomi-close-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `;

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'iomi-messages';
  messagesArea.innerHTML = '<div class="iomi-msg in"><div class="bubble">¡Hola! 👋 ¿En qué podemos ayudarte?</div></div>';
  panel.appendChild(messagesArea);

  // Generate initial captcha
  generateCaptcha();

  // Build country code options
  const countryOptions = COUNTRY_CODES.map(c => 
    '<option value="' + c.code + '">' + c.country + ' (' + c.code + ')</option>'
  ).join('');

  // Initial form (name, email, phone with country code, message, captcha, honeypot)
  const initForm = document.createElement('div');
  initForm.className = 'iomi-form';
  initForm.id = 'iomi-init-form';
  initForm.innerHTML = `
    <input type="text" id="iomi-name" placeholder="Tu nombre *" required />
    <input type="email" id="iomi-email" placeholder="Tu email (opcional)" />
    <div class="iomi-phone-row">
      <select id="iomi-country-code">${countryOptions}</select>
      <input type="tel" id="iomi-phone" placeholder="Tu teléfono (opcional)" />
    </div>
    <textarea id="iomi-message" rows="2" placeholder="Escribe tu mensaje... *"></textarea>
    <div class="iomi-captcha">
      <span id="iomi-captcha-q">🔒 ${captchaQuestion}</span>
      <input type="text" id="iomi-captcha-input" placeholder="?" maxlength="3" />
    </div>
    <div id="iomi-error" class="iomi-error" style="display:none"></div>
    <input type="text" id="iomi-hp-field" class="iomi-hp" tabindex="-1" autocomplete="off" />
    <button id="iomi-send-btn">Enviar mensaje</button>
  `;
  panel.appendChild(initForm);

  // Composer (after first message)
  const composer = document.createElement('div');
  composer.className = 'iomi-composer';
  composer.style.display = 'none';
  composer.innerHTML = `
    <input type="text" id="iomi-reply-input" placeholder="Escribe un mensaje..." />
    <button id="iomi-reply-btn"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
  `;
  panel.appendChild(composer);

  // Powered by
  const powered = document.createElement('div');
  powered.className = 'iomi-powered';
  powered.textContent = 'Powered by IOMI Clínicas';
  panel.appendChild(powered);

  container.appendChild(panel);
  container.appendChild(fab);
  document.body.appendChild(container);

  // Close button handler
  document.getElementById('iomi-close-btn').onclick = () => togglePanel();

  // Auto-detect country code by IP
  autoSelectCountry();

  function showError(msg) {
    const el = document.getElementById('iomi-error');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hideError() {
    document.getElementById('iomi-error').style.display = 'none';
  }

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && conversationId) startPolling();
    else stopPolling();
  }

  // Send initial message
  document.getElementById('iomi-send-btn').onclick = async () => {
    hideError();

    const name = document.getElementById('iomi-name').value.trim();
    const email = document.getElementById('iomi-email').value.trim();
    const countryCode = document.getElementById('iomi-country-code').value;
    const phoneRaw = document.getElementById('iomi-phone').value.trim();
    const message = document.getElementById('iomi-message').value.trim();
    const captchaInput = document.getElementById('iomi-captcha-input').value.trim();
    const honeypot = document.getElementById('iomi-hp-field').value;

    // Honeypot check (bots fill hidden fields)
    if (honeypot) {
      showError('Error de verificación. Intenta de nuevo.');
      return;
    }

    if (!name || !message) {
      showError('El nombre y el mensaje son obligatorios.');
      return;
    }

    // Captcha check
    if (parseInt(captchaInput) !== captchaAnswer) {
      showError('La respuesta de verificación es incorrecta.');
      generateCaptcha();
      document.getElementById('iomi-captcha-q').textContent = '🔒 ' + captchaQuestion;
      document.getElementById('iomi-captcha-input').value = '';
      return;
    }

    // Rate limit
    if (!checkRateLimit()) {
      showError('Demasiados mensajes. Espera un momento.');
      return;
    }

    // Build full phone with country code
    const phone = phoneRaw ? (countryCode + phoneRaw.replace(/^0+/, '')) : '';

    const btn = document.getElementById('iomi-send-btn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch(API_URL + '/functions/v1/widget-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: CLINIC_ID,
          name,
          email,
          phone,
          message,
          _hp: honeypot,
          _ts: Date.now(),
        }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        conversationId = data.conversation_id;
        localStorage.setItem('iomi_conv_id', conversationId);
        // Don't add locally — polling will pick up the inbound message with its server ID
        initForm.style.display = 'none';
        composer.style.display = 'flex';
        // Do an immediate fetch to render all messages with proper IDs
        await fetchAndRenderAll();
        startPolling();
      } else {
        showError(data.error || 'Error al enviar');
      }
    } catch (e) {
      showError('Error de conexión. Intenta de nuevo.');
    }
    btn.disabled = false;
    btn.textContent = 'Enviar mensaje';
  };

  // Reply
  document.getElementById('iomi-reply-btn').onclick = sendReply;
  document.getElementById('iomi-reply-input').onkeydown = (e) => {
    if (e.key === 'Enter') sendReply();
  };

  async function sendReply() {
    const input = document.getElementById('iomi-reply-input');
    const msg = input.value.trim();
    if (!msg || !conversationId) return;

    if (!checkRateLimit()) return;

    input.value = '';
    // Add locally for instant feedback (will be deduped by ID when polling picks it up)
    addMessage(msg, 'out');

    try {
      await fetch(API_URL + '/functions/v1/widget-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: CLINIC_ID,
          conversation_id: conversationId,
          message: msg,
          _ts: Date.now(),
        }),
      });
    } catch (e) { /* silent */ }
  }

  function addMessage(text, dir) {
    const div = document.createElement('div');
    div.className = 'iomi-msg ' + dir;
    div.innerHTML = '<div class="bubble">' + escapeHtml(text) + '</div>';
    messagesArea.appendChild(div);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function startPolling() {
    stopPolling();
    polling = setInterval(async () => {
      if (!conversationId) return;
      try {
        const res = await fetch(API_URL + '/functions/v1/widget-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId, clinic_id: CLINIC_ID }),
        });
        const data = await res.json();
        const msgs = data.messages || [];
        // Render any messages we haven't rendered yet
        msgs.forEach(function(m) {
          if (renderedMsgIds.has(m.id)) return;
          renderedMsgIds.add(m.id);
          var dir = m.direction === 'inbound' ? 'out' : 'in';
          var div = document.createElement('div');
          div.className = 'iomi-msg ' + dir;
          div.setAttribute('data-msg-id', m.id);
          div.innerHTML = '<div class="bubble">' + escapeHtml(m.content) + '</div>';
          messagesArea.appendChild(div);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight;
      } catch (e) { /* silent */ }
    }, 4000);
  }

  function stopPolling() {
    if (polling) { clearInterval(polling); polling = null; }
  }

  // Restore session
  if (conversationId) {
    initForm.style.display = 'none';
    composer.style.display = 'flex';
    (async () => {
      try {
        const res = await fetch(API_URL + '/functions/v1/widget-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId, clinic_id: CLINIC_ID }),
        });
        const data = await res.json();
        messagesArea.innerHTML = '';
        (data.messages || []).forEach(m => {
          const dir = m.direction === 'inbound' ? 'out' : 'in';
          const div = document.createElement('div');
          div.className = 'iomi-msg ' + dir;
          if (dir === 'in') div.setAttribute('data-server', '1');
          div.innerHTML = '<div class="bubble">' + escapeHtml(m.content) + '</div>';
          messagesArea.appendChild(div);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight;
      } catch (e) { /* silent */ }
    })();
  }
})();
