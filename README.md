# Aventora Chatbot Embedding Example

A standalone Node.js application demonstrating how to embed the Aventora Chatbot in your website using secure token-based authentication. This example shows how to authenticate users (including anonymous users) and embed the chatbot in your site.

## 🔐 Authentication Overview

The Aventora Chatbot requires token-based authentication. The flow is:

1. **Get API Key** - Obtain a Domain API Key from the Aventora Admin Panel
2. **Configure Server** - Set your API key in environment variables
3. **Generate Tokens** - Your server generates tokens using the API key
4. **Embed Chatbot** - Use tokens to authenticate chatbot access

**Important:** All chatbot access requires authentication. There is no unauthenticated access.

## 🚀 Quick Start

> **New to this?** Check out the detailed [SETUP_GUIDE.md](SETUP_GUIDE.md) for step-by-step instructions with troubleshooting tips.

### Prerequisites

- Node.js (v18 or higher - for native fetch support)
- npm or yarn
- Aventora Admin Panel access to get your Domain API Key

### Step 1: Get Your API Key

1. **Log into Aventora Admin Panel**
2. **Navigate to API Keys** (Settings or Developer Tools)
3. **Create a New Domain API Key**
   - Ensure it has `token_generation` permission
   - Copy the API key immediately (it won't be shown again!)

### Step 2: Install and Configure

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your configuration:
   ```bash
   # Your Domain API Key (get from Aventora Admin Panel)
   DOMAIN_CHATBOT_API_KEY=your-domain-api-key-here
   
   # Domain Chatbot API URL
   DOMAIN_CHATBOT_API_URL=https://api.aventora.ai
   
   # Your chatbot base URL
   CHATBOT_BASE_URL=https://yourdomain.aventora.app
   
   # Server port
   PORT=3001
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   
   Navigate to `http://localhost:3001` to see the embedding examples.

## 📖 What's Included

This example application demonstrates three main embedding methods:

### 1. **Embedded Mode**
Embed the chatbot directly in your page content. Perfect for dedicated chat pages or sections.

### 2. **Floating Mode**
Display the chatbot as a floating widget in the corner of your page. Users can minimize/restore it.

### 3. **Fixed/Fullscreen Mode**
Display the chatbot as a fullscreen overlay. Useful for mobile or when you want maximum focus on the chat.

## 💻 Code Examples

The application includes complete, copy-paste ready code examples for:

- **HTML-only embedding** (no JavaScript required)
- **HTML + JavaScript** floating widget implementation
- **React component** example
- **API reference** and query parameters

## 📁 Project Structure

```
client-embedding/
├── server.js          # Express server
├── package.json       # Dependencies
├── .env.example       # Environment variables template
├── README.md          # This file
└── public/
    ├── index.html     # Main example page
    └── styles.css     # Styling
```

## 🔧 Configuration

### Environment Variables

- `DOMAIN_CHATBOT_API_KEY` (required): Your Domain API Key from Aventora Admin Panel
- `DOMAIN_CHATBOT_API_URL`: Domain Chatbot API URL (default: `https://api.aventora.ai`)
- `CHATBOT_BASE_URL` (required): Your chatbot base URL (e.g., `https://yourdomain.aventora.app`)
- `PORT`: Server port (default: 3001)

### Authentication Flow

1. **Client requests token** from your server's `/api/chatbot-token` endpoint
2. **Server generates token** using your Domain API Key via the Domain Chatbot API
3. **Token is returned** to the client
4. **Client embeds chatbot** with token in the URL

### Chatbot URL Format

The chatbot is accessed via the `/autoconnect` endpoint with a token:

```
{CHATBOT_BASE_URL}/autoconnect?token={token}&lang={language}
```

**Query Parameters:**
- `token` (required): Authentication token obtained from `/api/chatbot-token`
- `lang` (optional): Language code (e.g., 'en', 'es', 'fr'). Default: 'en'

## 📝 Usage Examples

### Embedded Chatbot with Token

```html
<iframe 
    id="chatbot"
    style="width: 100%; height: 600px; border: none; border-radius: 12px;"
    title="Aventora Chatbot"
    allow="microphone; camera">
</iframe>

<script>
async function loadChatbot() {
    try {
        // Fetch token from your server
        const response = await fetch('/api/chatbot-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'en' })
        });
        const data = await response.json();
        
        // Load chatbot with token
        document.getElementById('chatbot').src = 
            `https://yourdomain.aventora.app/autoconnect?token=${data.token}&lang=en`;
    } catch (error) {
        console.error('Failed to load chatbot:', error);
    }
}
loadChatbot();
</script>
```

### Server-Side Token Generation

The server endpoint (`/api/chatbot-token`) uses your API key to generate tokens:

```javascript
// This is already implemented in server.js
app.post('/api/chatbot-token', async (req, res) => {
    const { language = 'en' } = req.body;
    const domainApiKey = process.env.DOMAIN_CHATBOT_API_KEY;
    const apiUrl = process.env.DOMAIN_CHATBOT_API_URL;
    
    const response = await fetch(`${apiUrl}/auth/api/v1/tokens/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${domainApiKey}`,
        },
        body: JSON.stringify({
            username: 'anonymous',
            language: language,
            expires_in_hours: 24,
        }),
    });
    
    const tokenData = await response.json();
    res.json({ token: tokenData.token, expires_at: tokenData.expires_at });
});
```

### Floating Widget

See the complete implementation in `public/index.html` - look for the "Floating Mode" tab. All examples use token-based authentication.

## 🌐 Deployment

### Deploy to Heroku

1. Create a `Procfile`:
   ```
   web: node server.js
   ```

2. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy to Vercel

1. Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server.js"
       }
     ]
   }
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Deploy to Any Node.js Hosting

Simply upload the files and run:
```bash
npm install
npm start
```

## 🎨 Customization

You can customize the chatbot appearance by:

1. **Styling the iframe container** - Add CSS to style the wrapper div
2. **Custom button design** - Modify the floating button styles
3. **Positioning** - Adjust the position of floating widgets
4. **Size** - Change width/height of embedded chatbots

## 📚 API Reference

### Token Generation Endpoint

**Your Server Endpoint:**
```
POST /api/chatbot-token
Content-Type: application/json

Request Body:
{
  "language": "en"  // optional, defaults to "en"
}

Response:
{
  "token": "uuid-token-string",
  "expires_at": "2024-01-01T00:00:00Z"
}
```

**Domain Chatbot API Endpoint (used by your server):**
```
POST {DOMAIN_CHATBOT_API_URL}/auth/api/v1/tokens/generate
Authorization: Bearer {DOMAIN_CHATBOT_API_KEY}
Content-Type: application/json

Request Body:
{
  "username": "anonymous",
  "language": "en",
  "expires_in_hours": 24
}
```

### Autoconnect Endpoint

```
GET {CHATBOT_BASE_URL}/autoconnect?token={token}&lang={language}
```

**Query Parameters:**
- `token` (required): Authentication token from `/api/chatbot-token`
- `lang` (optional): Language code (default: 'en')

**Iframe Attributes:**
- `allow="microphone; camera"`: Required for voice/video features
- `title`: Accessibility label

## 🔒 Security Best Practices

1. **Never Expose API Keys**: Keep `DOMAIN_CHATBOT_API_KEY` in server-side environment variables only
2. **Protect Token Endpoint**: Add rate limiting and authentication to `/api/chatbot-token` in production
3. **Use HTTPS**: Always use HTTPS in production for secure token transmission
4. **Token Expiration**: Tokens expire after 24 hours. Implement token refresh if needed
5. **CORS Configuration**: Configure CORS properly on your server
6. **Environment Variables**: Never commit `.env` files to version control

## ✨ Best Practices

1. **Responsive Design**: Make sure your chatbot widget is responsive on mobile devices
2. **Z-Index**: Use appropriate z-index values to ensure the chatbot appears above other content
3. **Loading States**: Consider showing a loading indicator while the chatbot loads
4. **Error Handling**: Handle cases where the chatbot fails to load gracefully
5. **Accessibility**: Ensure proper ARIA labels and keyboard navigation
6. **Performance**: Load the chatbot asynchronously to avoid blocking page load
7. **Token Caching**: Consider caching tokens client-side to avoid repeated requests

## 🐛 Troubleshooting

### Chatbot not loading?

1. **Check API Key Configuration:**
   - Verify `DOMAIN_CHATBOT_API_KEY` is set in your `.env` file
   - Ensure the API key has `token_generation` permission
   - Check server logs for token generation errors

2. **Verify URLs:**
   - Check that `CHATBOT_BASE_URL` is correct
   - Verify `DOMAIN_CHATBOT_API_URL` points to the correct API server
   - Test the API endpoint: `curl -X POST http://localhost:3001/api/chatbot-token`

3. **Check Browser Console:**
   - Look for CORS errors
   - Verify token is being generated and included in iframe URL
   - Ensure the iframe has `allow="microphone; camera"` attribute

4. **Common Issues:**
   - **"DOMAIN_CHATBOT_API_KEY not configured"**: Set the API key in `.env` file
   - **"Failed to generate chatbot token"**: Verify API key is valid and has correct permissions
   - **Token expires**: Tokens are valid for 24 hours by default. Implement token refresh if needed

### CORS Issues?

If you're embedding from a different domain, make sure CORS is properly configured on the chatbot server.

### Mobile Issues?

- Ensure viewport meta tag is present: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- Test on actual devices, not just browser dev tools
- Consider using responsive CSS for the chatbot container

## 📞 Support

For questions or issues:
- Check the [Aventora Documentation](https://docs.aventora.app)
- Contact support: support@aventora.app

## 📄 License

MIT License - feel free to use this example in your projects.

---

**Made with ❤️ by Aventora**
