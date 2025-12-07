# Quick Start Guide

Get the Aventora Chatbot embedded in your website with secure authentication in 5 minutes!

> **Need detailed step-by-step instructions?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for a complete walkthrough with troubleshooting.

## Prerequisites

- Node.js v18+ (for native fetch support)
- Aventora Admin Panel access to get your Domain API Key

## Step 1: Get Your API Key

1. Log into **Aventora Admin Panel**
2. Navigate to **API Keys** (Settings or Developer Tools)
3. Create a **Domain API Key** with `token_generation` permission
4. **Copy the API key** (save it securely!)

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure

Create a `.env` file:

```bash
# Your Domain API Key (from Admin Panel)
DOMAIN_CHATBOT_API_KEY=your-domain-api-key-here

# Domain Chatbot API URL
DOMAIN_CHATBOT_API_URL=https://api.aventora.ai

# Your chatbot base URL
CHATBOT_BASE_URL=https://yourdomain.aventora.app

# Server port
PORT=3001
```

## Step 4: Run

```bash
npm start
```

## Step 5: View Examples

Open your browser to: `http://localhost:3001`

You'll see:
- ✅ Embedded chatbot with token authentication
- ✅ Floating widget with token authentication
- ✅ Fullscreen chatbot example
- ✅ Complete code samples you can copy

## Copy & Paste Example

### Embedded Chatbot with Token

```html
<iframe 
    id="chatbot"
    style="width: 100%; height: 600px; border: none;"
    title="Aventora Chatbot"
    allow="microphone; camera">
</iframe>

<script>
async function loadChatbot() {
    const response = await fetch('/api/chatbot-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' })
    });
    const data = await response.json();
    document.getElementById('chatbot').src = 
        `https://yourdomain.aventora.app/autoconnect?token=${data.token}&lang=en`;
}
loadChatbot();
</script>
```

## Important Notes

- 🔐 **Authentication Required**: All chatbot access requires tokens
- 🔑 **API Key Security**: Never expose your API key in client-side code
- 🌐 **Server-Side Only**: Token generation must happen on your server

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- View all examples at `http://localhost:3001`
- Contact: support@aventora.app

---

**That's it!** You now have a working example of how to embed the Aventora Chatbot with secure authentication. 🎉
