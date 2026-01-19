# Aventora Widget - Pure JavaScript Embeddable Chatbot

A lightweight, framework-free JavaScript widget for embedding the Aventora chatbot into any website. No iframe required - uses Shadow DOM for CSS isolation and REST API for communication.

## 🚀 Quick Start

Add this single line to your HTML page:

```html
<script src="https://cdn.aventora.ai/widget.js"
        data-tenant="TENANT_ID"
        data-bot="BOT_ID"
        data-api-base="https://api.aventora.ai"
        data-theme="auto"
        data-position="bottom-right"
        data-primary="#2563eb"
        data-open-on-load="false"
        defer></script>
```

That's it! The widget will automatically:
1. Inject a floating chat launcher button
2. Lazy-load the UI only when user clicks
3. Create a session and handle chat interactions
4. Persist messages in sessionStorage

## 📦 Files

- **widget.js** (~10KB) - Tiny loader script that reads config and lazy-loads UI
- **widget-ui.js** - Full UI implementation with chat functionality
- **widget.css** - Reference CSS (styles are injected inline into Shadow DOM)
- **demo.html** - Complete demonstration page
- **README.md** - This file

## ⚙️ Configuration

All configuration is done via `data-*` attributes on the script tag:

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-tenant` | ✅ Yes | - | Your tenant/domain ID |
| `data-bot` | ❌ No | `""` | Bot ID (optional) |
| `data-api-base` | ❌ No | `"https://api.aventora.ai"` | API base URL |
| `data-theme` | ❌ No | `"auto"` | Theme: `"light"`, `"dark"`, or `"auto"` |
| `data-position` | ❌ No | `"bottom-right"` | Position: `"bottom-right"`, `"bottom-left"`, `"top-right"`, `"top-left"` |
| `data-primary` | ❌ No | `"#2563eb"` | Primary color (hex code) |
| `data-open-on-load` | ❌ No | `"false"` | Auto-open on page load: `"true"` or `"false"` |

### Example Configurations

**Minimal (required only):**
```html
<script src="https://cdn.aventora.ai/widget.js"
        data-tenant="my-tenant"
        defer></script>
```

**Full configuration:**
```html
<script src="https://cdn.aventora.ai/widget.js"
        data-tenant="my-tenant"
        data-bot="support-bot"
        data-api-base="https://api.aventora.ai"
        data-theme="dark"
        data-position="bottom-left"
        data-primary="#ff6b6b"
        data-open-on-load="true"
        defer></script>
```

## 🎨 Theming

The widget supports three theme modes:

- **`auto`** (default) - Automatically matches user's system preference (light/dark)
- **`light`** - Always use light theme
- **`dark`** - Always use dark theme

You can also customize the primary color with `data-primary`:

```html
<script src="https://cdn.aventora.ai/widget.js"
        data-tenant="my-tenant"
        data-primary="#ff6b6b"
        defer></script>
```

## 📱 Responsive Behavior

- **Desktop (>640px)**: Floating panel (400x600px) in the configured corner
- **Mobile (≤640px)**: Full-screen overlay

The widget automatically adapts based on viewport width.

## 🔌 JavaScript API

### Accessing the Widget

```javascript
// Get the loader instance
const loader = window.AventoraWidgetLoader;

// Open the widget programmatically
loader.open();

// Get the UI instance (after first open)
const instance = loader.getInstance();
```

### Events

Listen for widget lifecycle events:

```javascript
// Widget ready (loader initialized)
window.addEventListener('aventora:widget:ready', (e) => {
  console.log('Widget ready!', e.detail);
  // e.detail.config - Configuration
  // e.detail.loader - Loader instance
});

// Widget opened
window.addEventListener('aventora:widget:opened', (e) => {
  console.log('Widget opened');
  // e.detail.instance - UI instance
});

// Widget closed
window.addEventListener('aventora:widget:closed', (e) => {
  console.log('Widget closed');
  // e.detail.instance - UI instance
});
```

## 🔒 Security Features

1. **XSS Protection**: All user input is sanitized using `textContent` (no `innerHTML`)
2. **Shadow DOM Isolation**: CSS and DOM are isolated from host page
3. **Token-based Auth**: Short-lived JWT tokens for session management
4. **CORS-safe**: Proper Origin validation on backend
5. **No Global Pollution**: Minimal global namespace usage (only `AventoraWidgetLoader` and `AventoraWidgetUI`)

## 🏗️ Architecture

### Loader (widget.js)

- **Size**: ~10KB minified target
- **Responsibilities**:
  - Read configuration from `data-*` attributes
  - Create Shadow DOM root container
  - Inject base CSS
  - Create launcher button and panel shell
  - Lazy-load `widget-ui.js` only on first open

### UI (widget-ui.js)

- **Size**: Larger (UI implementation)
- **Responsibilities**:
  - Render chat interface (header, messages, input)
  - Handle user interactions
  - Manage session and messages
  - Communicate with backend API
  - Persist messages in sessionStorage

### Communication Flow

1. **Session Creation**: `POST /v1/widget/session` → Returns `session_id` and `token`
2. **Send Message**: `POST /v1/widget/message` with `Authorization: Bearer <token>`
3. **Fallback**: If widget endpoints don't exist, falls back to `/query/` endpoint

## 🔧 Backend Requirements

The widget expects these REST endpoints:

### POST /v1/widget/session

Create a new widget session.

**Request:**
```json
{
  "tenant": "tenant-id",
  "bot": "bot-id",
  "origin": "https://example.com"
}
```

**Response:**
```json
{
  "session_id": "session_123",
  "token": "jwt_token_here",
  "expires_in": 3600
}
```

### POST /v1/widget/message

Send a message in a session.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "session_id": "session_123",
  "text": "Hello!"
}
```

**Response:**
```json
{
  "message": "Hello! How can I help you?",
  "message_id": "msg_456"
}
```

### Fallback Support

If `/v1/widget/session` or `/v1/widget/message` return 404, the widget automatically falls back to using the existing `/query/` endpoint:

```json
POST /query/
{
  "question": "Hello!",
  "domain": "tenant-id",
  "language": "en",
  "name": "",
  "email": "",
  "user_id": null,
  "tts": false,
  "domain_metadata": {}
}
```

## 🧪 Testing

1. Open `demo.html` in a browser
2. The widget launcher should appear in the bottom-right corner
3. Click it to open the chat panel
4. Try sending a message

### Test Checklist

- [ ] Widget loads and launcher button appears
- [ ] Clicking launcher opens panel and lazy-loads UI
- [ ] Sending message calls backend and shows response
- [ ] Host page CSS doesn't affect widget (Shadow DOM isolation)
- [ ] Mobile viewport shows full-screen panel
- [ ] Multiple embeds on same page handle gracefully
- [ ] Messages persist in sessionStorage
- [ ] Theme switching works (auto/light/dark)
- [ ] Escape key closes panel
- [ ] Error handling shows friendly messages

## 📊 Performance

- **Initial Load**: Only `widget.js` (~10KB) loads on page load
- **UI Load**: `widget-ui.js` loads only when user first opens widget
- **Lazy Loading**: Reduces initial page load impact
- **SessionStorage**: Messages cached for session persistence

## 🐛 Troubleshooting

### Widget not appearing?

1. Check browser console for errors
2. Verify `data-tenant` attribute is set
3. Ensure script tag has `defer` attribute
4. Check that `widget.js` URL is correct

### Messages not sending?

1. Check browser Network tab for API calls
2. Verify backend endpoints are available
3. Check CORS configuration on backend
4. Verify token is being generated correctly

### CSS conflicts?

The widget uses Shadow DOM, so host page CSS shouldn't affect it. If you see issues:
1. Check that Shadow DOM is supported (all modern browsers)
2. Verify widget styles are being injected correctly
3. Check browser console for Shadow DOM errors

### Multiple widgets on same page?

Each widget instance gets a unique root ID (`aventora-widget-root`, `aventora-widget-root-1`, etc.). However, it's recommended to have only one widget per page.

## 🔄 Migration from iframe

If you're currently using the iframe-based embedding:

1. **Replace iframe code** with the script tag embed
2. **Update backend** to support widget endpoints (or use fallback)
3. **Test thoroughly** - widget behavior may differ slightly
4. **Update any postMessage communication** - widget uses direct API calls

## 📄 License

MIT License - feel free to use in your projects.

## 🤝 Support

For questions or issues:
- Check the [Aventora Documentation](https://docs.aventora.app)
- Contact support: support@aventora.app

---

**Made with ❤️ by Aventora**
