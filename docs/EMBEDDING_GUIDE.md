# Aventora Chatbot Embedding Guide

## Introduction

This guide explains how to embed the Aventora Chatbot widget into your website using the Web Component approach. The widget provides a clean, easy-to-use interface that avoids iframe communication issues.

## Prerequisites

1. **API Key**: You need a Domain API Key from the Aventora Admin Panel
2. **Token API**: Your server must have a `/api/chatbot-token` endpoint (or configure a custom URL)
3. **HTTPS**: The widget should be served over HTTPS in production

## Quick Start

### Step 1: Add the Script Tag

Add the following script tag to your HTML, typically before the closing `</body>` tag:

```html
<script
  src="https://cdn.aventora.ai/widget.js"
  data-tenant="your-tenant-id"
  data-theme="auto"
  data-position="bottom-right"
  defer>
</script>
```

Replace `your-tenant-id` with your actual tenant identifier.

### Step 2: Configure Token API

Ensure your server has an endpoint that generates chatbot tokens. The endpoint should:

- Accept POST requests
- Accept JSON body: `{ "domain": "your-tenant-id", "language": "en" }`
- Return JSON: `{ "token": "uuid-token", "expires_at": "..." }`

Example implementation (Node.js/Express):

```javascript
app.post('/api/chatbot-token', async (req, res) => {
  const { domain, language = 'en' } = req.body;
  
  // Generate token using your API key
  const token = await generateChatbotToken(domain, language);
  
  res.json({
    token: token,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});
```

### Step 3: Test

Open your website and verify:
1. The chatbot launcher button appears
2. Clicking it opens the chatbot
3. You can send messages

## Configuration Options

### Required Attributes

- `data-tenant` - Your tenant/domain identifier

### Optional Attributes

- `data-theme` - Widget theme: `auto` (default), `light`, or `dark`
- `data-position` - Widget position: `bottom-right` (default), `bottom-left`, `top-right`, or `top-left`
- `data-language` - Language code (default: `en`)
- `data-token-api-url` - Custom token API URL (default: `/api/chatbot-token`)
- `data-chatbot-url` - Custom chatbot base URL (auto-detected if not provided)

### Example with All Options

```html
<script
  src="https://cdn.aventora.ai/widget.js"
  data-tenant="demo"
  data-bot="real-estate"
  data-theme="dark"
  data-position="bottom-left"
  data-language="fr"
  data-token-api-url="https://api.example.com/chatbot-token"
  data-chatbot-url="https://demo.aventora.app"
  defer>
</script>
```

## Programmatic Usage

### Sending Messages

```javascript
// Wait for widget to be ready
window.addEventListener('aventora:ready', () => {
  // Send a message
  AventoraChatbot.sendMessage("Hello!", {
    autoSend: true
  });
  
  // Set a question (pre-fills input)
  AventoraChatbot.setQuestion("What are your hours?", {
    autoSend: true
  });
});
```

### Opening/Closing

```javascript
// Open chatbot
AventoraChatbot.open();

// Close chatbot
AventoraChatbot.close();
```

### File Attachments

```javascript
// Send message with file
AventoraChatbot.sendMessage("Check this file", {
  file: 'https://example.com/document.pdf',
  autoSend: true
});

// Or use File object from file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  AventoraChatbot.sendMessage("Here's the file", {
    file: file,
    autoSend: true
  });
});
```

## Integration Examples

### React

```jsx
import { useEffect } from 'react';

function ChatbotWidget() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = 'https://cdn.aventora.ai/widget.js';
    script.setAttribute('data-tenant', 'demo');
    script.setAttribute('data-theme', 'auto');
    script.setAttribute('data-position', 'bottom-right');
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return null; // Widget renders itself
}
```

### Vue

```vue
<template>
  <div></div>
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://cdn.aventora.ai/widget.js';
    script.setAttribute('data-tenant', 'demo');
    script.setAttribute('data-theme', 'auto');
    script.setAttribute('data-position', 'bottom-right');
    script.defer = true;
    document.body.appendChild(script);
  }
}
</script>
```

### WordPress

Add to your theme's `footer.php`:

```php
<script
  src="https://cdn.aventora.ai/widget.js"
  data-tenant="<?php echo esc_attr(get_option('aventora_tenant_id')); ?>"
  data-theme="auto"
  data-position="bottom-right"
  defer>
</script>
```

## Customization

### Themes

- `auto` - Automatically matches system theme
- `light` - Light theme
- `dark` - Dark theme

### Positions

- `bottom-right` - Bottom right corner (default)
- `bottom-left` - Bottom left corner
- `top-right` - Top right corner
- `top-left` - Top left corner

## Troubleshooting

### Widget Not Appearing

1. **Check browser console** for JavaScript errors
2. **Verify `data-tenant`** is set correctly
3. **Check network tab** to ensure scripts are loading
4. **Verify token API** is accessible and returning valid tokens

### Token Errors

1. **Check API key** is configured correctly
2. **Verify token endpoint** URL is correct
3. **Check CORS** settings if using cross-origin token API
4. **Verify token format** matches expected structure

### Communication Issues

1. **Wait for ready event** before sending messages:
   ```javascript
   window.addEventListener('aventora:ready', () => {
     // Now safe to send messages
   });
   ```

2. **Check iframe is loaded**:
   ```javascript
   window.addEventListener('aventora:iframe-ready', () => {
     // Iframe is ready
   });
   ```

## Security Considerations

1. **Never expose API keys** in client-side code
2. **Always generate tokens server-side**
3. **Use HTTPS** in production
4. **Validate token API requests** on your server
5. **Implement rate limiting** on token endpoint

## Support

For additional help:
- Check the [API Documentation](./WIDGET_API.md)
- Contact Aventora support
- Review browser console for detailed error messages
