# Aventora Chatbot Widget API

## Overview

The Aventora Chatbot Widget is a Web Component that provides a clean JavaScript API for embedding and interacting with the Aventora chatbot. It uses Shadow DOM for CSS isolation and handles all iframe communication internally.

## Quick Start

### Basic Embedding

Add a single script tag to your HTML:

```html
<script
  src="https://cdn.aventora.ai/widget.js"
  data-tenant="demo"
  data-theme="auto"
  data-position="bottom-right"
  defer>
</script>
```

### Configuration Attributes

- `data-tenant` (required) - Your tenant/domain identifier
- `data-bot` (optional) - Bot identifier
- `data-theme` (optional) - Theme: `auto`, `light`, or `dark` (default: `auto`)
- `data-position` (optional) - Position: `bottom-right`, `bottom-left`, `top-right`, or `top-left` (default: `bottom-right`)
- `data-language` (optional) - Language code (default: `en`)
- `data-token-api-url` (optional) - Token API endpoint (default: `/api/chatbot-token`)
- `data-chatbot-url` (optional) - Chatbot base URL (auto-detected if not provided)
- `data-widget-url` (optional) - Web Component URL (default: auto-detected from loader script)

## JavaScript API

### Global Object

The widget exposes a global `AventoraChatbot` object with the following methods:

### `sendMessage(text, options)`

Send a message to the chatbot.

**Parameters:**
- `text` (string) - The message text
- `options` (object, optional) - Options:
  - `autoSend` (boolean) - Whether to automatically send the message (default: `false`)
  - `file` (string|File) - File URL or File object to attach

**Example:**
```javascript
AventoraChatbot.sendMessage("Hello, how can I help?", {
  autoSend: true
});
```

### `setQuestion(text, options)`

Set a question in the chatbot input field (optionally auto-send).

**Parameters:**
- `text` (string) - The question text
- `options` (object, optional) - Options:
  - `autoSend` (boolean) - Whether to automatically send the message (default: `false`)
  - `file` (string|File) - File URL or File object to attach

**Example:**
```javascript
AventoraChatbot.setQuestion("What are your business hours?", {
  autoSend: true
});
```

### `open()`

Open the chatbot widget.

**Example:**
```javascript
AventoraChatbot.open();
```

### `close()`

Close/minimize the chatbot widget.

**Example:**
```javascript
AventoraChatbot.close();
```

### `getInstance()`

Get the Web Component instance for advanced usage.

**Example:**
```javascript
const widget = AventoraChatbot.getInstance();
// Access internal methods if needed
```

## Events

The widget dispatches custom events that you can listen to:

### `aventora:ready`

Fired when the widget is fully initialized and ready.

```javascript
window.addEventListener('aventora:ready', (e) => {
  console.log('Widget ready:', e.detail);
});
```

### `aventora:opened`

Fired when the chatbot is opened.

```javascript
window.addEventListener('aventora:opened', (e) => {
  console.log('Chatbot opened');
});
```

### `aventora:closed`

Fired when the chatbot is closed/minimized.

```javascript
window.addEventListener('aventora:closed', (e) => {
  console.log('Chatbot closed');
});
```

### `aventora:message`

Fired when a message is received from the chatbot.

```javascript
window.addEventListener('aventora:message', (e) => {
  console.log('Message received:', e.detail);
});
```

### `aventora:iframe-ready`

Fired when the iframe is loaded and ready.

```javascript
window.addEventListener('aventora:iframe-ready', (e) => {
  console.log('Iframe ready');
});
```

## Programmatic Initialization

You can also initialize the widget programmatically:

```html
<script src="https://cdn.aventora.ai/widget.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    AventoraChatbot.init({
      tenant: 'demo',
      language: 'en',
      theme: 'auto',
      position: 'bottom-right',
      tokenApiUrl: '/api/chatbot-token',
      chatbotUrl: 'https://demo.aventora.app'
    });
  });
</script>
```

## File Upload

The widget supports file attachments:

```javascript
// Using a file URL
AventoraChatbot.sendMessage("Check this file", {
  file: 'https://example.com/file.pdf',
  autoSend: true
});

// Using a File object (from file input)
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    AventoraChatbot.sendMessage("Here's the file", {
      file: file,
      autoSend: true
    });
  }
});
```

## Backward Compatibility

The widget maintains backward compatibility with the old `openChatbotWithQuestion` function:

```javascript
// Old API (still works)
window.openChatbotWithQuestion("Hello", true, "file.pdf");

// New API (recommended)
AventoraChatbot.setQuestion("Hello", {
  autoSend: true,
  file: "file.pdf"
});
```

## Advanced Usage

### Custom Styling

The widget uses Shadow DOM, so host site CSS won't affect it. However, you can customize the appearance using CSS variables (if supported by the component):

```css
aventora-chat {
  --widget-primary: #667eea;
  --widget-primary-dark: #764ba2;
}
```

### Multiple Instances

By default, only one widget instance is created. If you need multiple instances, you can create them manually:

```javascript
const widget = document.createElement('aventora-chat');
widget.setAttribute('tenant', 'demo');
widget.setAttribute('language', 'en');
document.body.appendChild(widget);
```

## Error Handling

The widget handles errors gracefully:

```javascript
window.addEventListener('aventora:error', (e) => {
  console.error('Widget error:', e.detail);
});
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- Mobile browsers: Full support

## Troubleshooting

### Widget not loading

1. Check browser console for errors
2. Verify `data-tenant` attribute is set
3. Check network tab for failed script loads
4. Ensure token API endpoint is accessible

### Messages not sending

1. Wait for `aventora:ready` event before sending messages
2. Check if iframe is loaded (`aventora:iframe-ready` event)
3. Verify token API is working
4. Check browser console for postMessage errors

### Styling issues

The widget uses Shadow DOM, so it's isolated from host CSS. If you need to customize styles, use CSS variables or contact support for customization options.
