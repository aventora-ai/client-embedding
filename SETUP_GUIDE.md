# Step-by-Step Setup Guide

Complete guide to build and run the Aventora Chatbot Embedding Example from scratch.

## 📋 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js v18 or higher** installed
  - Check version: `node --version`
  - Download from: https://nodejs.org/
- [ ] **npm** (comes with Node.js)
  - Check version: `npm --version`
- [ ] **Aventora Admin Panel access** to get your Domain API Key
- [ ] **Text editor** (VS Code, Notepad++, etc.)

---

## Step 1: Verify Node.js Installation

Open your terminal/command prompt and run:

```bash
node --version
```

**Expected output:** `v18.x.x` or higher

If you see an error or version below 18:
- Download and install Node.js from https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Restart your terminal after installation

---

## Step 2: Get Your Domain API Key

### 2.1 Access Aventora Admin Panel

1. Navigate to your Aventora Admin Panel URL
2. Log in with your credentials

### 2.2 Navigate to API Keys Section

1. Look for **Settings** or **Developer Tools** in the navigation menu
2. Click on **API Keys** or **API Management**

### 2.3 Create a New Domain API Key

1. Click **"Generate API Key"** or **"Create New Key"** button
2. Fill in the form:
   - **Name**: Give it a descriptive name (e.g., "Website Embedding Key")
   - **Permissions**: Select **`token_generation`** permission
   - **Domain**: Select your domain (if applicable)
3. Click **"Create"** or **"Generate"**

### 2.4 Copy and Save Your API Key

⚠️ **IMPORTANT**: Copy the API key immediately - it won't be shown again!

- Copy the entire API key string
- Save it in a secure location (password manager, secure note, etc.)
- You'll need it in Step 4

**Example API Key format:**
```
avt_1234567890abcdefghijklmnopqrstuvwxyz
```

---

## Step 3: Clone or Download the Project

### Option A: Clone from GitHub (if available)

```bash
git clone <repository-url>
cd client-embedding
```

### Option B: Download and Extract

1. Download the project as a ZIP file
2. Extract it to a folder (e.g., `C:\Projects\client-embedding` or `~/Projects/client-embedding`)
3. Open terminal in that folder

---

## Step 4: Install Dependencies

Navigate to the project folder in your terminal:

```bash
cd client-embedding
```

Install all required packages:

```bash
npm install
```

**Expected output:**
```
added 50 packages, and audited 51 packages in 5s
```

If you see errors:
- Make sure you're in the correct directory
- Try deleting `node_modules` folder and `package-lock.json`, then run `npm install` again
- Check your internet connection

---

## Step 5: Configure Environment Variables

### 5.1 Create .env File

**On Windows (Command Prompt):**
```bash
copy .env.example .env
```

**On Windows (PowerShell):**
```bash
Copy-Item .env.example .env
```

**On Mac/Linux:**
```bash
cp .env.example .env
```

### 5.2 Edit .env File

Open the `.env` file in your text editor and update the following values:

```bash
# Server Configuration
PORT=3001

# Aventora Domain Chatbot API Configuration
# Paste your API key from Step 2 here
DOMAIN_CHATBOT_API_KEY=avt_your_actual_api_key_here

# Domain Chatbot API URL (where the API server is hosted)
# Production: https://api.aventora.ai
# Development: http://localhost:8009
DOMAIN_CHATBOT_API_URL=https://api.aventora.ai

# Chatbot Base URL (the chatbot web application)
# Replace with your actual chatbot URL
CHATBOT_BASE_URL=https://yourdomain.aventora.app
```

**Important:**
- Replace `avt_your_actual_api_key_here` with your actual API key from Step 2
- Replace `https://yourdomain.aventora.app` with your actual chatbot URL
- Do NOT add quotes around the values
- Do NOT commit this file to version control (it's already in .gitignore)

**Example of a correctly configured .env file:**
```bash
PORT=3001
DOMAIN_CHATBOT_API_KEY=avt_abc123def456ghi789jkl012mno345pqr678stu901vwx234
DOMAIN_CHATBOT_API_URL=https://api.aventora.ai
CHATBOT_BASE_URL=https://aventora.aventora.app
```

---

## Step 6: Start the Server

### 6.1 Start the Server

Run the following command:

```bash
npm start
```

**Expected output:**
```
🚀 Aventora Chatbot Embedding Example Server running on http://localhost:3001
📖 Open http://localhost:3001 in your browser to see the examples

⚠️  IMPORTANT: Configure the following environment variables:
   - DOMAIN_CHATBOT_API_KEY: Your domain API key (get from Aventora Admin Panel)
   - DOMAIN_CHATBOT_API_URL: Domain chatbot API URL (default: https://api.aventora.ai)
   - CHATBOT_BASE_URL: Your chatbot base URL (e.g., https://yourdomain.aventora.app)
```

### 6.2 Verify Server is Running

You should see:
- ✅ Server started message
- ✅ Port number (3001)
- ✅ No error messages

If you see an error:
- Check that your `.env` file exists and is in the project root
- Verify all environment variables are set correctly
- Make sure port 3001 is not already in use

---

## Step 7: Test the Application

### 7.1 Open in Browser

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Navigate to: `http://localhost:3001`

### 7.2 Verify the Page Loads

You should see:
- ✅ Aventora Chatbot Embedding Examples page
- ✅ Introduction section
- ✅ Configuration section
- ✅ Embedding examples tabs

### 7.3 Test Token Generation

1. In the **Configuration** section, verify your chatbot URL is correct
2. Click **"Update Configuration & Load Chatbot"** button
3. You should see: **"Chatbot loaded successfully!"** message

If you see an error:
- Check browser console (F12) for error messages
- Verify your API key is correct in `.env` file
- Check server terminal for error messages
- Verify `DOMAIN_CHATBOT_API_URL` is correct

### 7.4 Test Embedded Chatbot

1. Click on the **"Embedded"** tab
2. You should see a chatbot iframe loading
3. Wait a few seconds for the chatbot to fully load

### 7.5 Test Floating Chatbot

1. Click on the **"Floating"** tab
2. Look at the bottom-right corner of the page
3. You should see a floating chat button (💬)
4. Click the button to open the chatbot
5. Click the minimize button (─) to close it

---

## Step 8: Verify Everything Works

### Checklist:

- [ ] Server starts without errors
- [ ] Browser page loads at `http://localhost:3001`
- [ ] Configuration section shows your chatbot URL
- [ ] Token generation succeeds (no error messages)
- [ ] Embedded chatbot loads and displays
- [ ] Floating chatbot button appears
- [ ] Floating chatbot opens when clicked
- [ ] Floating chatbot minimizes when clicked

---

## 🐛 Troubleshooting

### Problem: "DOMAIN_CHATBOT_API_KEY not configured"

**Solution:**
1. Check that `.env` file exists in the project root
2. Verify `DOMAIN_CHATBOT_API_KEY` is set in `.env`
3. Make sure there are no extra spaces or quotes
4. Restart the server after editing `.env`

### Problem: "Failed to generate chatbot token"

**Solution:**
1. Verify your API key is correct (copy it again from Admin Panel)
2. Check that API key has `token_generation` permission
3. Verify `DOMAIN_CHATBOT_API_URL` is correct
4. Check your internet connection
5. Look at server terminal for detailed error messages

### Problem: "Port 3001 already in use"

**Solution:**
1. Change `PORT=3001` to a different port (e.g., `PORT=3002`) in `.env`
2. Or stop the process using port 3001:
   - Windows: `netstat -ano | findstr :3001` then `taskkill /PID <pid> /F`
   - Mac/Linux: `lsof -ti:3001 | xargs kill`

### Problem: "Cannot find module 'express'"

**Solution:**
1. Make sure you ran `npm install`
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again

### Problem: Chatbot iframe shows blank or error

**Solution:**
1. Check browser console (F12) for errors
2. Verify `CHATBOT_BASE_URL` is correct
3. Try opening the chatbot URL directly in browser
4. Check that token is being generated (look at Network tab in browser dev tools)

### Problem: Node.js version error

**Solution:**
1. Update Node.js to v18 or higher
2. Download from: https://nodejs.org/
3. Restart terminal after installation

---

## 🎯 Next Steps

Once everything is working:

1. **Explore the Examples:**
   - Try all three embedding modes (Embedded, Floating, Fixed)
   - Check out the code examples in the "Code Examples" tab

2. **Copy Code to Your Website:**
   - Use the code examples as templates
   - Adapt them to your website's framework (React, Vue, plain HTML, etc.)

3. **Customize:**
   - Modify styles to match your website
   - Adjust chatbot size and position
   - Add your own branding

4. **Deploy:**
   - Follow the deployment guide in README.md
   - Deploy to Heroku, Vercel, or your own server
   - Remember to set environment variables in your hosting platform

---

## 📞 Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review the [QUICK_START.md](QUICK_START.md) for a condensed guide
- Contact support: support@aventora.app

---

**Congratulations!** 🎉 You've successfully set up the Aventora Chatbot Embedding Example!
