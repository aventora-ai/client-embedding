/**
 * Aventora Chatbot Widget Loader
 * 
 * Tiny loader script that reads configuration from data attributes
 * and dynamically loads the Web Component.
 * 
 * Usage:
 * <script
 *   src="https://cdn.aventora.ai/widget.js"
 *   data-tenant="demo"
 *   data-theme="auto"
 *   data-position="bottom-right"
 *   defer>
 * </script>
 */

(function() {
  'use strict';

  // Find the script tag that loaded this script
  const currentScript = document.currentScript || 
    document.querySelector('script[src*="widget.js"]') ||
    document.querySelector('script[data-tenant]');

  if (!currentScript) {
    console.error('[AventoraWidget] Could not find script tag');
    return;
  }

  // Extract configuration from data attributes
  const config = {
    tenant: currentScript.getAttribute('data-tenant') || currentScript.getAttribute('data-domain'),
    bot: currentScript.getAttribute('data-bot'),
    theme: currentScript.getAttribute('data-theme') || 'auto',
    position: currentScript.getAttribute('data-position') || 'bottom-right',
    language: currentScript.getAttribute('data-language') || 'en',
    tokenApiUrl: currentScript.getAttribute('data-token-api-url') || '/api/chatbot-token',
    chatbotUrl: currentScript.getAttribute('data-chatbot-url'),
    widgetUrl: currentScript.getAttribute('data-widget-url') || 
      (currentScript.src ? currentScript.src.replace('widget.js', 'aventora-chat.js') : 
       'https://cdn.aventora.ai/aventora-chat.js')
  };

  // Validate required config
  if (!config.tenant) {
    console.error('[AventoraWidget] data-tenant attribute is required');
    return;
  }

  // Global API placeholder (will be populated by Web Component)
  window.AventoraChatbot = window.AventoraChatbot || {
    _ready: false,
    _queue: [],
    _instance: null,
    
    // Queue API calls until component is ready
    sendMessage: function(text, options) {
      if (this._ready && this._instance) {
        return this._instance.sendMessage(text, options);
      }
      this._queue.push({ method: 'sendMessage', args: [text, options] });
    },
    
    setQuestion: function(text, options) {
      if (this._ready && this._instance) {
        return this._instance.setQuestion(text, options);
      }
      this._queue.push({ method: 'setQuestion', args: [text, options] });
    },
    
    open: function() {
      if (this._ready && this._instance) {
        return this._instance.open();
      }
      this._queue.push({ method: 'open', args: [] });
    },
    
    close: function() {
      if (this._ready && this._instance) {
        return this._instance.close();
      }
      this._queue.push({ method: 'close', args: [] });
    },
    
    getInstance: function() {
      return this._instance;
    },
    
    init: function(customConfig) {
      // Merge custom config with data attributes
      Object.assign(config, customConfig || {});
      loadComponent();
    }
  };

  // Load the Web Component script
  function loadComponent() {
    // Check if already loaded
    if (document.querySelector('script[src*="aventora-chat.js"]')) {
      console.log('[AventoraWidget] Component already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = config.widgetUrl;
    script.async = true;
    
    script.onload = function() {
      console.log('[AventoraWidget] Component loaded, initializing...');
      initializeComponent();
    };
    
    script.onerror = function() {
      console.error('[AventoraWidget] Failed to load component from:', config.widgetUrl);
    };
    
    document.head.appendChild(script);
  }

  // Initialize the Web Component
  function initializeComponent() {
    // Wait for custom element to be defined
    if (customElements.get('aventora-chat')) {
      createWidget();
    } else {
      // Wait for custom element definition
      customElements.whenDefined('aventora-chat').then(function() {
        createWidget();
      });
      
      // Fallback timeout
      setTimeout(function() {
        if (customElements.get('aventora-chat')) {
          createWidget();
        } else {
          console.error('[AventoraWidget] Custom element not defined after timeout');
        }
      }, 5000);
    }
  }

  // Create and mount the widget
  function createWidget() {
    try {
      // Check if widget already exists
      let widget = document.querySelector('aventora-chat');
      
      if (!widget) {
        // Create the custom element
        widget = document.createElement('aventora-chat');
        
        // Set attributes from config
        widget.setAttribute('tenant', config.tenant);
        if (config.bot) widget.setAttribute('bot', config.bot);
        widget.setAttribute('theme', config.theme);
        widget.setAttribute('position', config.position);
        widget.setAttribute('language', config.language);
        widget.setAttribute('token-api-url', config.tokenApiUrl);
        if (config.chatbotUrl) {
          widget.setAttribute('chatbot-url', config.chatbotUrl);
        }
        
        // Append to body
        document.body.appendChild(widget);
      }
      
      // Get instance and process queued calls
      const instance = widget.getInstance ? widget.getInstance() : widget;
      window.AventoraChatbot._instance = instance;
      window.AventoraChatbot._ready = true;
      
      // Process queued API calls
      window.AventoraChatbot._queue.forEach(function(item) {
        if (instance[item.method]) {
          instance[item.method].apply(instance, item.args);
        }
      });
      window.AventoraChatbot._queue = [];
      
      console.log('[AventoraWidget] Widget initialized successfully');
      
      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('aventora:ready', {
        detail: { instance: instance }
      }));
      
    } catch (error) {
      console.error('[AventoraWidget] Error creating widget:', error);
    }
  }

  // Auto-initialize if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadComponent);
  } else {
    loadComponent();
  }

})();
