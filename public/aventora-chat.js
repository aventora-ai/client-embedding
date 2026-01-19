/**
 * Aventora Chatbot Web Component
 * 
 * Custom element that embeds the Flutter chatbot app in an iframe
 * and provides a clean JavaScript API for communication.
 * 
 * Uses Shadow DOM for CSS isolation.
 */

(function() {
  'use strict';

  class AventoraChat extends HTMLElement {
    constructor() {
      super();
      
      // Configuration
      this.config = {
        tenant: this.getAttribute('tenant') || '',
        bot: this.getAttribute('bot') || '',
        theme: this.getAttribute('theme') || 'auto',
        position: this.getAttribute('position') || 'bottom-right',
        language: this.getAttribute('language') || 'en',
        tokenApiUrl: this.getAttribute('token-api-url') || '/api/chatbot-token',
        chatbotUrl: this.getAttribute('chatbot-url') || ''
      };
      
      // State
      this.token = null;
      this.loading = true;
      this.error = null;
      this.isOpen = false;
      this.isMinimized = true;
      this.iframe = null;
      this.iframeReady = false;
      this.pendingMessages = [];
      this.chatbotOrigin = '*'; // Will be set when iframe loads
      
      // Create Shadow DOM
      this.attachShadow({ mode: 'open' });
      
      // Initialize
      this.init();
    }

    static get observedAttributes() {
      return ['tenant', 'theme', 'position', 'language'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue) {
        this.config[name] = newValue;
        if (name === 'theme' || name === 'position') {
          this.updateStyles();
        }
      }
    }

    connectedCallback() {
      this.fetchToken();
      this.setupMessageListener();
    }

    disconnectedCallback() {
      this.removeMessageListener();
    }

    // Initialize component
    init() {
      this.render();
      this.attachEventListeners();
    }

    // Render Shadow DOM
    render() {
      const styles = this.getStyles();
      const html = this.getHTML();
      
      this.shadowRoot.innerHTML = styles + html;
      
      // Get references to elements
      this.launcherButton = this.shadowRoot.querySelector('.launcher-button');
      this.chatPanel = this.shadowRoot.querySelector('.chat-panel');
      this.minimizeButton = this.shadowRoot.querySelector('.minimize-button');
      this.iframeContainer = this.shadowRoot.querySelector('.iframe-container');
      
      // Initially hide chat panel
      if (this.chatPanel) {
        this.chatPanel.style.display = 'none';
      }
    }

    // Get CSS styles
    getStyles() {
      const positionStyles = this.getPositionStyles();
      
      return `
        <style>
          :host {
            --widget-primary: #667eea;
            --widget-primary-dark: #764ba2;
            --widget-bg: #ffffff;
            --widget-text: #333333;
            --widget-border: #e0e0e0;
            --widget-shadow: rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }
          
          .widget-container {
            position: fixed;
            z-index: 9999;
            ${positionStyles}
          }
          
          .launcher-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--widget-primary) 0%, var(--widget-primary-dark) 100%);
            border: 4px solid white;
            color: white;
            font-size: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px var(--widget-shadow);
            transition: transform 0.3s, box-shadow 0.3s;
            outline: none;
          }
          
          .launcher-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px var(--widget-shadow);
          }
          
          .launcher-button:active {
            transform: scale(0.95);
          }
          
          .chat-panel {
            display: none;
            width: 400px;
            height: 600px;
            background: var(--widget-bg);
            border-radius: 16px;
            box-shadow: 0 4px 20px var(--widget-shadow);
            overflow: hidden;
            position: relative;
          }
          
          .chat-panel.open {
            display: block;
          }
          
          .minimize-button {
            position: absolute;
            top: -15px;
            right: -15px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            border: 2px solid var(--widget-border);
            color: var(--widget-text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 2px 8px var(--widget-shadow);
            z-index: 10001;
            transition: all 0.2s;
            outline: none;
          }
          
          .minimize-button:hover {
            background: #f0f0f0;
            transform: scale(1.1);
          }
          
          .iframe-container {
            width: 100%;
            height: 100%;
            border: none;
            overflow: hidden;
          }
          
          .iframe-container iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
          }
          
          .loading-state,
          .error-state {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: 20px;
            text-align: center;
            color: var(--widget-text);
          }
          
          .error-state {
            color: #d32f2f;
          }
          
          @media (max-width: 480px) {
            .chat-panel {
              width: 100vw;
              height: 100vh;
              border-radius: 0;
            }
          }
        </style>
      `;
    }

    // Get position styles based on config
    getPositionStyles() {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;'
      };
      return positions[this.config.position] || positions['bottom-right'];
    }

    // Get HTML structure
    getHTML() {
      return `
        <div class="widget-container">
          <button class="launcher-button" aria-label="Open chatbot" title="Open chatbot">
            💬
          </button>
          <div class="chat-panel">
            <button class="minimize-button" aria-label="Minimize chatbot" title="Minimize">−</button>
            <div class="iframe-container">
              ${this.loading ? '<div class="loading-state">Loading chatbot...</div>' : ''}
              ${this.error ? `<div class="error-state">Error: ${this.escapeHtml(this.error)}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    // Escape HTML for safety
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Attach event listeners
    attachEventListeners() {
      // Use event delegation since elements are in Shadow DOM
      this.shadowRoot.addEventListener('click', (e) => {
        if (e.target.classList.contains('launcher-button')) {
          this.open();
        } else if (e.target.classList.contains('minimize-button')) {
          this.close();
        }
      });
    }

    // Fetch token from API
    async fetchToken() {
      try {
        this.loading = true;
        this.error = null;
        this.updateLoadingState();
        
        const response = await fetch(this.config.tokenApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            domain: this.config.tenant,
            language: this.config.language
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to generate token' }));
          throw new Error(errorData.error || errorData.details || 'Failed to generate chatbot token');
        }

        const data = await response.json();
        this.token = data.token;
        this.loading = false;
        
        // Create iframe now that we have token
        this.createIframe();
        
      } catch (err) {
        console.error('[AventoraChat] Token fetch error:', err);
        this.error = err.message;
        this.loading = false;
        this.updateErrorState();
      }
    }

    // Create iframe with Flutter app
    async createIframe() {
      if (!this.token) {
        console.warn('[AventoraChat] No token available, cannot create iframe');
        return;
      }

      // Build chatbot URL (now async to fetch from server config)
      const chatbotUrl = await this.getChatbotUrl();
      const iframeUrl = `${chatbotUrl}/autoconnect?token=${encodeURIComponent(this.token)}&lang=${encodeURIComponent(this.config.language)}`;
      
      console.log('[AventoraChat] Using chatbot URL:', chatbotUrl);
      console.log('[AventoraChat] Iframe URL:', iframeUrl);
      
      // Extract origin for postMessage security
      try {
        const url = new URL(chatbotUrl);
        this.chatbotOrigin = url.origin;
      } catch (e) {
        console.warn('[AventoraChat] Could not parse chatbot URL, using wildcard origin');
        this.chatbotOrigin = '*';
      }

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = iframeUrl;
      this.iframe.allow = 'microphone; camera';
      this.iframe.title = 'Aventora Chatbot';
      this.iframe.style.cssText = 'width:100%;height:100%;border:none;';
      
      // Handle iframe load
      this.iframe.onload = () => {
        console.log('[AventoraChat] Iframe loaded');
        this.iframeReady = true;
        this.processPendingMessages();
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('aventora:iframe-ready', {
          detail: { instance: this }
        }));
      };
      
      this.iframe.onerror = () => {
        console.error('[AventoraChat] Iframe load error');
        this.error = 'Failed to load chatbot';
        this.updateErrorState();
      };

      // Clear container and add iframe
      if (this.iframeContainer) {
        this.iframeContainer.innerHTML = '';
        this.iframeContainer.appendChild(this.iframe);
      }
    }

    // Get chatbot URL
    async getChatbotUrl() {
      if (this.config.chatbotUrl) {
        return this.config.chatbotUrl;
      }
      
      // Try to fetch from server config first
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const data = await response.json();
          if (data.chatbotBaseUrl) {
            return data.chatbotBaseUrl;
          }
        }
      } catch (error) {
        console.warn('[AventoraChat] Could not fetch config from server:', error);
      }
      
      // Fallback: Auto-detect from tenant
      // If tenant is "demo", URL would be "https://demo.aventora.app" (or similar)
      const hostname = window.location.hostname;
      
      // Try to construct URL based on current domain
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        // Development: try to detect port from current URL
        const port = window.location.port || '3000';
        // Try subdomain approach first, fallback to path-based
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return `http://localhost:${port}`;
        }
        return `http://${this.config.tenant}.localhost:${port}`;
      } else {
        // Production: construct from current domain or use default
        const parts = hostname.split('.');
        if (parts.length >= 2) {
          // Try to replace first part with tenant, or prepend tenant
          const baseDomain = parts.slice(-2).join('.'); // Get last two parts (e.g., "aventora.app")
          return `https://${this.config.tenant}.${baseDomain}`;
        }
        // Fallback to aventora.app domain
        return `https://${this.config.tenant}.aventora.app`;
      }
    }

    // Update loading state
    updateLoadingState() {
      if (this.iframeContainer) {
        this.iframeContainer.innerHTML = '<div class="loading-state">Loading chatbot...</div>';
      }
    }

    // Update error state
    updateErrorState() {
      if (this.iframeContainer) {
        this.iframeContainer.innerHTML = `<div class="error-state">Error: ${this.escapeHtml(this.error)}</div>`;
      }
    }

    // Setup message listener for iframe communication
    setupMessageListener() {
      this.messageHandler = (event) => {
        // Verify origin (if possible)
        if (this.chatbotOrigin !== '*' && event.origin !== this.chatbotOrigin) {
          return;
        }

        // Handle messages from Flutter app
        if (event.data && typeof event.data === 'object') {
          this.handleIframeMessage(event.data);
        }
      };
      
      window.addEventListener('message', this.messageHandler);
    }

    // Remove message listener
    removeMessageListener() {
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
      }
    }

    // Handle messages from iframe
    handleIframeMessage(data) {
      // Forward relevant messages as custom events
      if (data.type === 'chatbot_ready' || data.type === 'flutter_ready') {
        this.iframeReady = true;
        this.processPendingMessages();
        
        window.dispatchEvent(new CustomEvent('aventora:ready', {
          detail: { instance: this }
        }));
      }
      
      // Forward other messages
      window.dispatchEvent(new CustomEvent('aventora:message', {
        detail: data
      }));
    }

    // Send message to iframe
    sendToIframe(message) {
      if (!this.iframe || !this.iframe.contentWindow) {
        console.warn('[AventoraChat] Iframe not ready, queueing message');
        this.pendingMessages.push(message);
        return false;
      }

      try {
        // Send multiple message types to ensure Flutter app receives it
        const messages = [
          { type: 'chatbot_message', message: message.text, autoSend: message.autoSend, file: message.file },
          { type: 'send_message', text: message.text, autoSend: message.autoSend, file: message.file },
          { type: 'set_question', question: message.text, autoSend: message.autoSend, file: message.file },
          { type: 'openChatbot', question: message.text, autoSend: message.autoSend, file: message.file }
        ];

        messages.forEach(msg => {
          this.iframe.contentWindow.postMessage(msg, this.chatbotOrigin);
        });

        return true;
      } catch (error) {
        console.error('[AventoraChat] Error sending message to iframe:', error);
        return false;
      }
    }

    // Process pending messages
    processPendingMessages() {
      if (this.pendingMessages.length > 0 && this.iframeReady) {
        this.pendingMessages.forEach(msg => {
          this.sendToIframe(msg);
        });
        this.pendingMessages = [];
      }
    }

    // Public API: Send message
    sendMessage(text, options = {}) {
      const message = {
        text: text,
        autoSend: options.autoSend || false,
        file: options.file || null
      };

      // Handle file if it's a File object
      if (message.file instanceof File) {
        // Convert to data URL (or upload to server)
        const reader = new FileReader();
        reader.onload = (e) => {
          message.file = e.target.result;
          this.sendToIframe(message);
        };
        reader.readAsDataURL(message.file);
        return;
      }

      this.sendToIframe(message);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('aventora:message-sent', {
        detail: { text, options }
      }));
    }

    // Public API: Set question (pre-fill input, optionally auto-send)
    setQuestion(text, options = {}) {
      // Open chatbot first
      this.open();
      
      // Wait a bit for iframe to be ready, then send
      setTimeout(() => {
        this.sendMessage(text, { ...options, autoSend: options.autoSend || false });
      }, 500);
    }

    // Public API: Open chatbot
    open() {
      if (this.chatPanel) {
        this.chatPanel.style.display = 'block';
        this.chatPanel.classList.add('open');
        this.isOpen = true;
        this.isMinimized = false;
        
        if (this.launcherButton) {
          this.launcherButton.style.display = 'none';
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('aventora:opened', {
          detail: { instance: this }
        }));
      }
    }

    // Public API: Close chatbot
    close() {
      if (this.chatPanel) {
        this.chatPanel.style.display = 'none';
        this.chatPanel.classList.remove('open');
        this.isOpen = false;
        this.isMinimized = true;
        
        if (this.launcherButton) {
          this.launcherButton.style.display = 'flex';
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('aventora:closed', {
          detail: { instance: this }
        }));
      }
    }

    // Get instance (for API compatibility)
    getInstance() {
      return this;
    }

    // Update styles when theme/position changes
    updateStyles() {
      // Re-render if needed
      if (this.shadowRoot) {
        const styles = this.getStyles();
        const styleElement = this.shadowRoot.querySelector('style');
        if (styleElement) {
          styleElement.textContent = styles.match(/<style>([\s\S]*)<\/style>/)[1];
        }
      }
    }
  }

  // Register custom element
  if (!customElements.get('aventora-chat')) {
    customElements.define('aventora-chat', AventoraChat);
  }

  // Export for module systems (if needed)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AventoraChat;
  }

})();
