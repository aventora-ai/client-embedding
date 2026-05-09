# Aventora Web App Embedding (Chatbot + Hub CTA)

This guide is a complete copy-paste implementation for embedding:

1. Aventora Chatbot (floating launcher + iframe panel)
2. Hub CTA button (Request a Callback modal)

It is designed for web applications that want:

- No dependency on Aventora CDN scripts
- Self-hosted frontend assets
- Domain/account-specific API keys (not global server keys)

---

## Architecture (recommended)

- Browser loads your own `embed.js` and `embed.css` from your app.
- Browser calls your backend:
  - `POST /api/chatbot-token`
  - `POST /api/hub-callback-request`
- Backend resolves tenant/account by domain and uses tenant-specific secrets:
  - `chatbot_api_key` (domain-specific)
  - `hub_api_key` (account/domain-specific)
- Backend calls Aventora services:
  - Chatbot token API: `POST {DOMAIN_CHATBOT_API_URL}/auth/api/v1/tokens/generate`
  - Hub start API: `POST {HUB_API_URL}/start`

This mirrors how CMS handles domain-specific keys and avoids server-wide shared credentials.

---

## 1) Data model requirements

Your backend should store per-domain (or per-account) integration settings. Example:

```sql
CREATE TABLE tenant_integrations (
  id BIGSERIAL PRIMARY KEY,
  domain_name VARCHAR(255) UNIQUE NOT NULL,
  chatbot_api_key VARCHAR(512) NOT NULL,
  hub_api_key VARCHAR(512) NOT NULL,
  chatbot_base_url VARCHAR(512) NOT NULL, -- e.g. https://mydomain.aventora.app
  default_language VARCHAR(16) DEFAULT 'en',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Minimum required fields per tenant/domain:

- `domain_name`
- `chatbot_api_key`
- `hub_api_key`
- `chatbot_base_url`

---

## 2) Backend: copy-paste Node/Express implementation

Create `server.js`:

```js
require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// Update these to your real APIs
const DOMAIN_CHATBOT_API_URL =
  process.env.DOMAIN_CHATBOT_API_URL || 'https://api.aventora.ai';
const HUB_API_URL = process.env.HUB_API_URL || 'https://phone.aventora.ai';

/**
 * Replace this with a real DB query.
 * Must return account/domain-specific keys.
 */
async function getTenantIntegrationByDomain(domainName) {
  // Example in-memory map (replace with DB)
  const sample = {
    'example.com': {
      domainName: 'example.com',
      chatbotApiKey: process.env.EXAMPLE_COM_CHATBOT_API_KEY || '',
      hubApiKey: process.env.EXAMPLE_COM_HUB_API_KEY || '',
      chatbotBaseUrl:
        process.env.EXAMPLE_COM_CHATBOT_BASE_URL || 'https://example.aventora.app',
      defaultLanguage: 'en',
      // Optional if you already know account_id for Hub
      hubAccountId: process.env.EXAMPLE_COM_HUB_ACCOUNT_ID || '',
    },
  };

  return sample[domainName] || null;
}

function normalizeDomain(inputDomain, requestHost) {
  // Priority: request body domain, then host header.
  const source = (inputDomain || requestHost || '').toLowerCase().trim();
  return source.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  return `+${onlyDigits}`;
}

app.post('/api/chatbot-token', async (req, res) => {
  try {
    const domain = normalizeDomain(req.body?.domain, req.headers.host);
    const language = req.body?.language || 'en';

    if (!domain) {
      return res
        .status(400)
        .json({ error: 'Domain is required to resolve tenant credentials.' });
    }

    const tenant = await getTenantIntegrationByDomain(domain);
    if (!tenant || !tenant.chatbotApiKey || !tenant.chatbotBaseUrl) {
      return res.status(404).json({
        error: `No chatbot integration configured for domain: ${domain}`,
      });
    }

    const tokenResponse = await fetch(
      `${DOMAIN_CHATBOT_API_URL}/auth/api/v1/tokens/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenant.chatbotApiKey.trim()}`,
        },
        body: JSON.stringify({
          username: 'anonymous',
          language,
          expires_in_hours: 24,
        }),
      },
    );

    const raw = await tokenResponse.text();
    let tokenData = {};
    try {
      tokenData = JSON.parse(raw);
    } catch {
      tokenData = { raw };
    }

    if (!tokenResponse.ok || !tokenData.token) {
      return res.status(tokenResponse.status || 500).json({
        error: 'Failed to generate chatbot token',
        details: tokenData,
      });
    }

    return res.json({
      token: tokenData.token,
      expires_at: tokenData.expires_at || null,
      chatbot_base_url: tenant.chatbotBaseUrl,
      language,
      domain,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error while generating chatbot token',
      message: error.message,
    });
  }
});

app.post('/api/hub-callback-request', async (req, res) => {
  try {
    const domain = normalizeDomain(req.body?.domain_name, req.headers.host);
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const phone = normalizePhone(req.body?.phone);
    const preferredTime = req.body?.preferred_time || null;
    const channel = req.body?.channel === 'phone' ? 'phone' : 'sms';
    const context = String(req.body?.context || '').trim();

    if (!domain) {
      return res.status(400).json({ error: 'domain_name is required' });
    }
    if (!name || !email || !phone) {
      return res
        .status(400)
        .json({ error: 'name, email, and phone are required' });
    }

    const tenant = await getTenantIntegrationByDomain(domain);
    if (!tenant || !tenant.hubApiKey) {
      return res.status(404).json({
        error: `No Hub integration configured for domain: ${domain}`,
      });
    }

    let accountId = tenant.hubAccountId || null;

    // Optional: lookup account_id dynamically if not stored
    if (!accountId) {
      const lookup = await fetch(
        `${HUB_API_URL}/domain/${encodeURIComponent(domain)}/account`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tenant.hubApiKey.trim()}`,
          },
        },
      );

      if (lookup.ok) {
        const accountData = await lookup.json();
        accountId = accountData.account_id || null;
      }
    }

    const callPayload = {
      type: 'conversational',
      channel,
      phone_number: phone,
      client_name: name,
      client_email: email,
      instruction: `[Website callback request. ${context || 'No extra context provided.'}]`,
      domain_name: domain,
      language: tenant.defaultLanguage || 'en',
    };

    if (preferredTime) {
      callPayload.scheduled_time = preferredTime;
    }

    const hubUrl = accountId
      ? `${HUB_API_URL}/start?account_id=${encodeURIComponent(accountId)}`
      : `${HUB_API_URL}/start`;

    const hubResponse = await fetch(hubUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenant.hubApiKey.trim()}`,
      },
      body: JSON.stringify(callPayload),
    });

    const raw = await hubResponse.text();
    let hubData = {};
    try {
      hubData = JSON.parse(raw);
    } catch {
      hubData = { raw };
    }

    if (!hubResponse.ok) {
      return res.status(hubResponse.status || 500).json({
        error: 'Failed to create callback request',
        details: hubData,
      });
    }

    return res.json({
      success: true,
      message: `Callback request created successfully via ${channel.toUpperCase()}.`,
      call_sid: hubData.call_sid || null,
      status: hubData.status || 'initiated',
      domain,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error while creating callback request',
      message: error.message,
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    services: {
      chatbotApiBase: DOMAIN_CHATBOT_API_URL,
      hubApiBase: HUB_API_URL,
    },
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Embed backend listening at http://localhost:${port}`);
});
```

Create `.env.example`:

```bash
PORT=3001
DOMAIN_CHATBOT_API_URL=https://api.aventora.ai
HUB_API_URL=https://phone.aventora.ai

# Example tenant mapping keys (replace with DB in production)
EXAMPLE_COM_CHATBOT_API_KEY=
EXAMPLE_COM_HUB_API_KEY=
EXAMPLE_COM_CHATBOT_BASE_URL=https://example.aventora.app
EXAMPLE_COM_HUB_ACCOUNT_ID=
```

Install and run:

```bash
npm install express dotenv
node server.js
```

---

## 3) Frontend asset: `embed.css`

Create `public/embed.css` (or equivalent):

```css
.aventora-embed-root {
  position: fixed;
  z-index: 9999;
}

.aventora-chat-launcher {
  width: 60px;
  height: 60px;
  border-radius: 9999px;
  border: 0;
  cursor: pointer;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.aventora-chat-panel {
  display: none;
  width: 400px;
  height: 620px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.aventora-chat-panel.open {
  display: block;
}

.aventora-chat-frame {
  width: 100%;
  height: 100%;
  border: 0;
}

.aventora-chat-close {
  position: absolute;
  right: -10px;
  top: -10px;
  width: 30px;
  height: 30px;
  border-radius: 9999px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.aventora-cta-button {
  position: fixed;
  z-index: 10000;
  left: 20px;
  bottom: 20px;
  border: 0;
  border-radius: 9999px;
  padding: 12px 18px;
  color: #fff;
  background: #2a6cf0;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.aventora-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 10001;
}

.aventora-modal.open {
  display: block;
}

.aventora-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.aventora-modal-content {
  position: relative;
  max-width: 540px;
  margin: 6vh auto;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.aventora-field {
  margin-bottom: 12px;
}

.aventora-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
}

.aventora-field input,
.aventora-field select,
.aventora-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
}

.aventora-actions {
  display: flex;
  gap: 8px;
}

.aventora-submit {
  background: #2a6cf0;
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

.aventora-cancel {
  background: #eef2ff;
  color: #1d4ed8;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}
```

---

## 4) Frontend asset: `embed.js` (chatbot + CTA, no CDN)

Create `public/embed.js`:

```js
(function () {
  'use strict';

  const scriptTag =
    document.currentScript ||
    document.querySelector('script[data-aventora-embed]');

  if (!scriptTag) {
    console.error('[AventoraEmbed] Could not find script tag.');
    return;
  }

  const config = {
    domain: scriptTag.getAttribute('data-domain') || window.location.hostname,
    language: scriptTag.getAttribute('data-language') || 'en',
    chatbotPosition:
      scriptTag.getAttribute('data-chatbot-position') || 'bottom-right',
    chatbotTokenApi:
      scriptTag.getAttribute('data-chatbot-token-api') || '/api/chatbot-token',
    hubCallbackApi:
      scriptTag.getAttribute('data-hub-callback-api') ||
      '/api/hub-callback-request',
    ctaText: scriptTag.getAttribute('data-cta-text') || 'Request a Callback',
  };

  function buildChatbotUrl(baseUrl, token, lang) {
    return (
      `${String(baseUrl).replace(/\/$/, '')}/autoconnect` +
      `?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(lang)}`
    );
  }

  function createChatbotUI() {
    const root = document.createElement('div');
    root.className = 'aventora-embed-root';

    if (config.chatbotPosition === 'bottom-right') {
      root.style.right = '20px';
      root.style.bottom = '20px';
    } else if (config.chatbotPosition === 'bottom-left') {
      root.style.left = '20px';
      root.style.bottom = '20px';
    } else if (config.chatbotPosition === 'top-right') {
      root.style.right = '20px';
      root.style.top = '20px';
    } else {
      root.style.left = '20px';
      root.style.top = '20px';
    }

    const launcher = document.createElement('button');
    launcher.className = 'aventora-chat-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open chatbot');
    launcher.textContent = '💬';

    const panel = document.createElement('div');
    panel.className = 'aventora-chat-panel';

    const close = document.createElement('button');
    close.className = 'aventora-chat-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close chatbot');

    const frame = document.createElement('iframe');
    frame.className = 'aventora-chat-frame';
    frame.allow = 'microphone; camera';
    frame.title = 'Aventora Chatbot';

    panel.appendChild(close);
    panel.appendChild(frame);
    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);

    async function loadTokenAndOpen() {
      const response = await fetch(config.chatbotTokenApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: config.domain,
          language: config.language,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.token || !data.chatbot_base_url) {
        throw new Error(data.error || 'Failed to load chatbot token');
      }
      frame.src = buildChatbotUrl(data.chatbot_base_url, data.token, config.language);
      panel.classList.add('open');
      launcher.style.display = 'none';
    }

    launcher.addEventListener('click', async function () {
      try {
        if (!frame.src) {
          await loadTokenAndOpen();
        } else {
          panel.classList.add('open');
          launcher.style.display = 'none';
        }
      } catch (err) {
        console.error('[AventoraEmbed] Chatbot open failed:', err);
        alert('Chatbot is currently unavailable. Please try again.');
      }
    });

    close.addEventListener('click', function () {
      panel.classList.remove('open');
      launcher.style.display = 'inline-flex';
    });
  }

  function createCtaUI() {
    const button = document.createElement('button');
    button.className = 'aventora-cta-button';
    button.type = 'button';
    button.textContent = config.ctaText;

    const modal = document.createElement('div');
    modal.className = 'aventora-modal';
    modal.innerHTML = `
      <div class="aventora-modal-overlay" data-close-modal="1"></div>
      <div class="aventora-modal-content">
        <h3>Request a Callback</h3>
        <p>Fill in your details and we will contact you shortly.</p>
        <form id="aventora-cta-form">
          <div class="aventora-field">
            <label>Name *</label>
            <input name="name" required />
          </div>
          <div class="aventora-field">
            <label>Phone *</label>
            <input name="phone" placeholder="+1 234 567 8900" required />
          </div>
          <div class="aventora-field">
            <label>Email *</label>
            <input name="email" type="email" required />
          </div>
          <div class="aventora-field">
            <label>Preferred channel *</label>
            <select name="channel">
              <option value="sms">SMS</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div class="aventora-field">
            <label>Preferred time (optional)</label>
            <input name="preferred_time" type="datetime-local" />
          </div>
          <div class="aventora-field">
            <label>Context (optional)</label>
            <textarea name="context" rows="3"></textarea>
          </div>
          <div class="aventora-actions">
            <button class="aventora-submit" type="submit">Submit</button>
            <button class="aventora-cancel" type="button" data-close-modal="1">Cancel</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(button);
    document.body.appendChild(modal);

    function closeModal() {
      modal.classList.remove('open');
    }

    button.addEventListener('click', function () {
      modal.classList.add('open');
    });

    modal.addEventListener('click', function (event) {
      const target = event.target;
      if (target && target.getAttribute('data-close-modal') === '1') {
        closeModal();
      }
    });

    const form = modal.querySelector('#aventora-cta-form');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        domain_name: config.domain,
        name: String(formData.get('name') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        channel: String(formData.get('channel') || 'sms'),
        preferred_time: String(formData.get('preferred_time') || '').trim() || null,
        context: String(formData.get('context') || '').trim() || null,
      };

      try {
        const response = await fetch(config.hubCallbackApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.success !== true) {
          throw new Error(data.error || 'Failed to submit callback request');
        }
        alert(data.message || 'Callback request submitted successfully.');
        form.reset();
        closeModal();
      } catch (err) {
        console.error('[AventoraEmbed] Callback submit failed:', err);
        alert('Could not submit callback request. Please try again.');
      }
    });
  }

  function init() {
    createChatbotUI();
    createCtaUI();
    window.AventoraEmbed = {
      openChatbot: function () {
        const launcher = document.querySelector('.aventora-chat-launcher');
        if (launcher) launcher.click();
      },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

---

## 5) Host page snippet (copy-paste)

Put this in any page (or your main layout):

```html
<link rel="stylesheet" href="/embed.css" />

<script
  src="/embed.js"
  data-aventora-embed="1"
  data-domain="example.com"
  data-language="en"
  data-chatbot-position="bottom-right"
  data-chatbot-token-api="https://api.yourapp.com/api/chatbot-token"
  data-hub-callback-api="https://api.yourapp.com/api/hub-callback-request"
  data-cta-text="Request a Callback"
  defer>
</script>
```

Notes:

- Serve `/embed.js` and `/embed.css` from your own app/static bucket.
- No Aventora CDN code is required.
- Both APIs should be your backend endpoints.

---

## 6) Security and production requirements

1. Never expose `chatbot_api_key` or `hub_api_key` in browser code.
2. Resolve keys by domain/account on backend only.
3. Add rate limiting to:
   - `POST /api/chatbot-token`
   - `POST /api/hub-callback-request`
4. Add CORS policy only for your trusted frontend origins.
5. Validate and sanitize all input.
6. Log key prefixes only (never full keys).

---

## 7) Configuration checklist per tenant/account

For each domain/account, confirm:

- Domain is registered (e.g., `example.com`)
- Domain-specific `chatbot_api_key` is set
- Account/domain-specific `hub_api_key` is set
- `chatbot_base_url` is set (e.g., `https://example.aventora.app`)
- Optional `hub_account_id` is set (or account lookup endpoint works)
- Default language configured

---

## 8) Quick test plan

1. Open site page with embed script.
2. Click chatbot launcher:
   - Backend receives `/api/chatbot-token`.
   - Response includes `token` + `chatbot_base_url`.
   - Iframe loads `/autoconnect?token=...`.
3. Click CTA button:
   - Fill form and submit.
   - Backend receives `/api/hub-callback-request`.
   - Hub API `/start` returns success and `call_sid`.
4. Repeat with a second domain/account to confirm keys are tenant-scoped.

---

## 9) Optional improvements

- Add a tenant cache (Redis/in-memory) for integration lookups.
- Add anti-spam (hCaptcha / reCAPTCHA) to CTA form.
- Add analytics hooks for open/chat/submit events.
- Replace browser `alert()` with branded toast notifications.

