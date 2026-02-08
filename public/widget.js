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

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #${WIDGET_ID} * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #${WIDGET_ID} .iomi-fab { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: ${PRIMARY_COLOR}; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 99999; transition: transform 0.2s; }
    #${WIDGET_ID} .iomi-fab:hover { transform: scale(1.08); }
    #${WIDGET_ID} .iomi-fab svg { width: 28px; height: 28px; fill: white; }
    #${WIDGET_ID} .iomi-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-height: 560px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); z-index: 99999; display: none; flex-direction: column; overflow: hidden; animation: iomi-slide-up 0.25s ease; }
    #${WIDGET_ID} .iomi-panel.open { display: flex; }
    @keyframes iomi-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    #${WIDGET_ID} .iomi-header { background: ${PRIMARY_COLOR}; color: white; padding: 20px; }
    #${WIDGET_ID} .iomi-header h3 { font-size: 16px; font-weight: 600; }
    #${WIDGET_ID} .iomi-header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    #${WIDGET_ID} .iomi-messages { flex: 1; overflow-y: auto; padding: 16px; min-height: 200px; max-height: 320px; background: #f9fafb; }
    #${WIDGET_ID} .iomi-msg { margin-bottom: 8px; display: flex; }
    #${WIDGET_ID} .iomi-msg.out { justify-content: flex-end; }
    #${WIDGET_ID} .iomi-msg .bubble { max-width: 75%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-break: break-word; }
    #${WIDGET_ID} .iomi-msg.in .bubble { background: white; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; color: #1f2937; }
    #${WIDGET_ID} .iomi-msg.out .bubble { background: ${PRIMARY_COLOR}; color: white; border-bottom-right-radius: 4px; }
    #${WIDGET_ID} .iomi-form { padding: 12px 16px; border-top: 1px solid #e5e7eb; background: white; }
    #${WIDGET_ID} .iomi-form input, #${WIDGET_ID} .iomi-form textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; margin-bottom: 8px; resize: none; }
    #${WIDGET_ID} .iomi-form input:focus, #${WIDGET_ID} .iomi-form textarea:focus { border-color: ${PRIMARY_COLOR}; }
    #${WIDGET_ID} .iomi-form button { width: 100%; background: ${PRIMARY_COLOR}; color: white; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    #${WIDGET_ID} .iomi-form button:hover { opacity: 0.9; }
    #${WIDGET_ID} .iomi-form button:disabled { opacity: 0.5; cursor: not-allowed; }
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
    </div>
  `;

  // Messages area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'iomi-messages';
  messagesArea.innerHTML = '<div class="iomi-msg in"><div class="bubble">¡Hola! 👋 ¿En qué podemos ayudarte?</div></div>';
  panel.appendChild(messagesArea);

  // Initial form (name, email, message)
  const initForm = document.createElement('div');
  initForm.className = 'iomi-form';
  initForm.id = 'iomi-init-form';
  initForm.innerHTML = `
    <input type="text" id="iomi-name" placeholder="Tu nombre *" required />
    <input type="email" id="iomi-email" placeholder="Tu email (opcional)" />
    <input type="tel" id="iomi-phone" placeholder="Tu teléfono (opcional)" />
    <textarea id="iomi-message" rows="2" placeholder="Escribe tu mensaje... *"></textarea>
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

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && conversationId) startPolling();
    else stopPolling();
  }

  // Send initial message
  document.getElementById('iomi-send-btn').onclick = async () => {
    const name = document.getElementById('iomi-name').value.trim();
    const email = document.getElementById('iomi-email').value.trim();
    const phone = document.getElementById('iomi-phone').value.trim();
    const message = document.getElementById('iomi-message').value.trim();
    if (!name || !message) return;

    const btn = document.getElementById('iomi-send-btn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch(API_URL + '/functions/v1/widget-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: CLINIC_ID, name, email, phone, message }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        conversationId = data.conversation_id;
        localStorage.setItem('iomi_conv_id', conversationId);
        addMessage(message, 'out');
        initForm.style.display = 'none';
        composer.style.display = 'flex';
        startPolling();
      } else {
        alert(data.error || 'Error al enviar');
      }
    } catch (e) {
      alert('Error de conexión');
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
    input.value = '';
    addMessage(msg, 'out');

    try {
      await fetch(API_URL + '/functions/v1/widget-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: CLINIC_ID,
          name: 'Visitante',
          message: msg,
        }),
      });
    } catch (e) { /* silent */ }
  }

  function addMessage(text, dir) {
    const div = document.createElement('div');
    div.className = `iomi-msg ${dir}`;
    div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    messagesArea.appendChild(div);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  let lastMsgCount = 1; // welcome message
  function startPolling() {
    stopPolling();
    polling = setInterval(async () => {
      if (!conversationId) return;
      try {
        const res = await fetch(API_URL + '/functions/v1/widget-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
        const data = await res.json();
        const msgs = data.messages || [];
        // Only render outbound (from clinic) messages we haven't seen
        const outbound = msgs.filter(m => m.direction === 'outbound');
        if (outbound.length > 0) {
          // Check for new outbound messages
          const currentOutbound = messagesArea.querySelectorAll('.iomi-msg.in[data-server]').length;
          outbound.forEach((m, i) => {
            if (i >= currentOutbound) {
              const div = document.createElement('div');
              div.className = 'iomi-msg in';
              div.setAttribute('data-server', '1');
              div.innerHTML = `<div class="bubble">${escapeHtml(m.content)}</div>`;
              messagesArea.appendChild(div);
            }
          });
          messagesArea.scrollTop = messagesArea.scrollHeight;
        }
      } catch (e) { /* silent */ }
    }, 5000);
  }

  function stopPolling() {
    if (polling) { clearInterval(polling); polling = null; }
  }

  // Restore session
  if (conversationId) {
    initForm.style.display = 'none';
    composer.style.display = 'flex';
    // Load existing messages
    (async () => {
      try {
        const res = await fetch(API_URL + '/functions/v1/widget-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId }),
        });
        const data = await res.json();
        messagesArea.innerHTML = '';
        (data.messages || []).forEach(m => {
          const dir = m.direction === 'inbound' ? 'out' : 'in';
          const div = document.createElement('div');
          div.className = `iomi-msg ${dir}`;
          if (dir === 'in') div.setAttribute('data-server', '1');
          div.innerHTML = `<div class="bubble">${escapeHtml(m.content)}</div>`;
          messagesArea.appendChild(div);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight;
      } catch (e) { /* silent */ }
    })();
  }
})();
