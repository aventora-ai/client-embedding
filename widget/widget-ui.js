/**
 * Aventora Chatbot Widget UI
 * 
 * Loads and displays the Flutter chatbot app directly in Shadow DOM
 * (no iframe - pure JavaScript embedding)
 */

(function() {
  'use strict';

  // Prevent multiple definitions
  if (window.AventoraWidgetUI) {
    return;
  }

  /**
   * Initialize the widget UI
   * @param {Object} options - Configuration options
   * @param {ShadowRoot} options.shadowRoot - Shadow DOM root
   * @param {Object} options.config - Widget configuration
   * @param {Object} options.elements - DOM element references
   * @returns {Promise<Object>} UI instance
   */
  window.AventoraWidgetUI = {
    init: function(options) {
      return new Promise((resolve, reject) => {
        try {
          const instance = new AventoraWidgetUIInstance(options);
          instance.initialize().then(() => {
            resolve(instance);
          }).catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    },

    destroy: function(instance) {
      if (instance && instance.destroy) {
        instance.destroy();
      }
    }
  };

  /**
   * Widget UI Instance
   */
  function AventoraWidgetUIInstance(options) {
    this.shadowRoot = options.shadowRoot;
    this.config = options.config;
    this.elements = options.elements;
    
    // State
    this.token = null;
    this.chatbotBaseUrl = null;
    this.isOpen = false;
    this.isLoading = false;
    this.flutterAppLoaded = false;
    this.flutterContainer = null;
    
    // DOM references
    this.header = null;
    this.closeButton = null;
    this.chatPanel = null;
  }

  AventoraWidgetUIInstance.prototype = {
    /**
     * Initialize the UI
     */
    initialize: function() {
      return new Promise((resolve, reject) => {
        try {
          this.render();
          this.attachEventListeners();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },

    /**
     * Render the UI structure
     */
    render: function() {
      const chatPanel = this.elements.chatPanel;
      
      // Inject CSS
      const css = this.getCSS();
      const styleElement = document.createElement('style');
      styleElement.textContent = css;
      this.shadowRoot.appendChild(styleElement);

      // Build HTML structure - no header, Flutter app provides its own UI
      // Add close button overlay in top right corner
      chatPanel.innerHTML = `
        <button class="widget-close-button" aria-label="Close chat" title="Close">×</button>
        <div class="chat-content" id="flutter-container">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Loading chatbot...</span>
          </div>
        </div>
      `;

      // Get element references
      this.chatPanel = chatPanel;
      this.flutterContainer = chatPanel.querySelector('#flutter-container');
      this.closeButton = chatPanel.querySelector('.widget-close-button');
    },

    /**
     * Get CSS styles
     */
    getCSS: function() {
      const isDark = this.config.theme === 'dark' || 
        (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      const bgColor = isDark ? '#1a1a1a' : '#ffffff';
      const textColor = isDark ? '#e0e0e0' : '#333333';
      const borderColor = isDark ? '#333333' : '#e0e0e0';

      return `
        .chat-content {
          height: 100%;
          overflow: hidden;
          position: relative;
          background: ${bgColor};
        }
        
        .widget-close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border: none;
          background: ${isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)'};
          color: ${textColor};
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.2s;
          outline: none;
          font-family: inherit;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .widget-close-button:hover {
          background: ${isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 1)'};
          transform: scale(1.1);
        }
        
        .widget-close-button:active {
          transform: scale(0.95);
        }
        
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
          color: ${textColor};
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid ${borderColor};
          border-top-color: ${this.config.primary || '#2563eb'};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Flutter app container */
        #flutter-container {
          width: 100%;
          height: 100%;
        }
        
        #flutter-container > * {
          width: 100%;
          height: 100%;
        }
        
        @media (max-width: 640px) {
          .chat-content {
            height: 100vh;
          }
        }
      `;
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
      // Close button click handler
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => {
          this.close();
        });
      }
      
      // Escape key to close
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', escapeHandler);
      this.escapeHandler = escapeHandler;
    },

    /**
     * Open the chat panel
     */
    open: function() {
      this.elements.chatPanel.classList.add('open');
      this.elements.launcherButton.style.display = 'none';
      this.isOpen = true;

      // Load Flutter app if not already loaded
      // Note: For cross-origin Flutter apps, we use iframe method
      // This is created dynamically by JavaScript, so customers don't need iframe tags
      if (!this.flutterAppLoaded) {
        this.loadFlutterApp();
      } else {
        // If already loaded, focus the input
        setTimeout(() => {
          this.focusInput();
        }, 300);
      }

      // Dispatch event
      window.dispatchEvent(new CustomEvent('aventora:widget:opened', {
        detail: { instance: this }
      }));
    },

    /**
     * Close the chat panel
     */
    close: function() {
      this.elements.chatPanel.classList.remove('open');
      this.elements.launcherButton.style.display = 'flex';
      this.isOpen = false;

      // Dispatch event
      window.dispatchEvent(new CustomEvent('aventora:widget:closed', {
        detail: { instance: this }
      }));
    },

    /**
     * Load Flutter chatbot app
     * 
     * Note: For cross-origin Flutter web apps, we use an iframe method.
     * The iframe is created dynamically by JavaScript, so customers don't
     * need to add iframe tags - they just add a script tag.
     */
    loadFlutterApp: function() {
      if (this.isLoading) return;
      
      this.isLoading = true;
      
      // First, get chatbot base URL and token
      Promise.all([
        this.getChatbotBaseUrl(),
        this.getToken()
      ]).then(([chatbotBaseUrl, token]) => {
        this.chatbotBaseUrl = chatbotBaseUrl;
        this.token = token;
        
        console.log('[AventoraWidget] Loading Flutter app from:', chatbotBaseUrl);
        
        // Use iframe method for cross-origin Flutter apps
        // This is the recommended approach and works reliably
        const language = this.config.language || 'en';
        this.loadFlutterAppViaIframe(chatbotBaseUrl, token, language);
      }).catch(error => {
        console.error('[AventoraWidget] Error loading Flutter app:', error);
        this.showError('Failed to load chatbot. Please try again.');
        this.isLoading = false;
      });
    },

    /**
     * Get chatbot base URL from server config
     */
    getChatbotBaseUrl: function() {
      return fetch('/api/config')
        .then(response => response.json())
        .then(data => {
          if (data.chatbotBaseUrl) {
            return data.chatbotBaseUrl;
          }
          throw new Error('CHATBOT_BASE_URL not configured');
        });
    },

    /**
     * Get authentication token
     */
    getToken: function() {
      return fetch('/api/chatbot-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: this.config.tenant,
          language: this.config.language || 'en'
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to get token');
        }
        return response.json();
      })
      .then(data => data.token);
    },

    /**
     * Initialize Flutter app in the container
     */
    initializeFlutterApp: function(chatbotBaseUrl, token) {
      const container = this.flutterContainer;
      const language = this.config.language || 'en';
      
      console.log('[AventoraWidget] Initializing Flutter app from:', chatbotBaseUrl);
      
      // Create Flutter app container div
      const flutterApp = document.createElement('div');
      flutterApp.id = 'flutter-app';
      container.innerHTML = '';
      container.appendChild(flutterApp);
      
      // Load Flutter loader script from chatbot base URL
      const flutterJsUrl = `${chatbotBaseUrl}/flutter.js`;
      
      console.log('[AventoraWidget] Loading Flutter.js from:', flutterJsUrl);
      
      this.loadScript(flutterJsUrl)
        .then(() => {
          console.log('[AventoraWidget] Flutter.js loaded successfully');
          
          // Load pipecat bridge if it exists
          return this.loadScript(`${chatbotBaseUrl}/pipecat-bridge.js`).catch(() => {
            console.warn('[AventoraWidget] pipecat-bridge.js not found, continuing...');
          });
        })
        .then(() => {
          // Initialize Flutter app
          if (window._flutter && window._flutter.loader) {
            console.log('[AventoraWidget] Initializing Flutter engine...');
            
            // CRITICAL: Flutter needs to load assets from the chatbot URL, not the widget server
            // We need to override Flutter's asset resolution to use absolute URLs
            
            // Store original base if it exists
            const originalBase = document.querySelector('base');
            let baseChanged = false;
            
            // Create or update base element to point to chatbot URL
            let flutterBase = originalBase;
            if (!flutterBase) {
              flutterBase = document.createElement('base');
              document.head.insertBefore(flutterBase, document.head.firstChild);
              baseChanged = true;
            } else {
              // Store original href
              flutterBase.setAttribute('data-original-href', flutterBase.href || '/');
            }
            
            // Set base to chatbot URL for Flutter asset loading
            flutterBase.href = chatbotBaseUrl + '/';
            console.log('[AventoraWidget] Set base href to:', flutterBase.href);
            
            // Initialize Flutter with proper asset base
            window._flutter.loader.loadEntrypoint({
              serviceWorker: {
                serviceWorkerVersion: null,
                // Disable service worker to avoid CORS issues
                serviceWorkerSettings: {
                  serviceWorkerVersion: null
                }
              },
              config: {
                // CRITICAL: Set asset base to chatbot URL so Flutter loads assets from correct server
                assetBase: chatbotBaseUrl + '/',
              },
              onEntrypointLoaded: (engineInitializer) => {
                engineInitializer.initializeEngine({
                  renderer: 'canvaskit', // or 'html' depending on your Flutter build
                  hostElement: flutterApp,
                  assetBase: chatbotBaseUrl + '/' // Ensure assets load from chatbot URL
                }).then((appRunner) => {
                  // Navigate to autoconnect route with token
                  const autoconnectUrl = `${chatbotBaseUrl}/autoconnect?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(language)}`;
                  
                  // Change window location to autoconnect URL so Flutter router picks it up
                  // But we need to do this in a way that doesn't reload the page
                  // Flutter web apps read initial route from window.location
                  
                  // Run the app
                  appRunner.runApp();
                  
                  // After app runs, try to navigate to autoconnect route
                  setTimeout(() => {
                    // Use Flutter's navigation if available, otherwise use history API
                    if (window.history && window.history.pushState) {
                      // Update URL without reload
                      const currentPath = window.location.pathname;
                      window.history.pushState({}, '', autoconnectUrl);
                      // Trigger popstate to notify Flutter router
                      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                    }
                  }, 1000);
                  
                  this.flutterAppLoaded = true;
                  this.isLoading = false;
                  
                  // Remove loading state
                  const loadingState = container.querySelector('.loading-state');
                  if (loadingState) {
                    loadingState.remove();
                  }
                  
                  console.log('[AventoraWidget] Flutter app initialized successfully');
                }).catch(err => {
                  console.error('[AventoraWidget] Error running Flutter app:', err);
                  this.showError('Failed to initialize Flutter app: ' + err.message);
                  this.isLoading = false;
                  
                  // Restore original base
                  if (baseChanged && flutterBase.parentNode) {
                    flutterBase.parentNode.removeChild(flutterBase);
                  } else if (originalBase) {
                    const originalHref = originalBase.getAttribute('data-original-href');
                    if (originalHref) {
                      originalBase.href = originalHref;
                    }
                  }
                });
              }
            });
          } else {
            throw new Error('Flutter loader not available after loading flutter.js');
          }
        })
        .catch(err => {
          console.error('[AventoraWidget] Error loading Flutter app directly:', err);
          console.log('[AventoraWidget] Falling back to iframe method (recommended for cross-origin Flutter apps)');
          // Use iframe method (recommended for cross-origin Flutter apps)
          this.loadFlutterAppViaIframe(chatbotBaseUrl, token, language);
        });
    },

    /**
     * Load Flutter app via iframe
     * 
     * Note: This is the recommended approach for embedding Flutter web apps
     * from a different origin. The iframe is created dynamically by JavaScript,
     * so customers don't need to add an iframe tag - they just add a script tag.
     */
    loadFlutterAppViaIframe: function(chatbotBaseUrl, token, language) {
      console.log('[AventoraWidget] Loading Flutter app via iframe from:', chatbotBaseUrl);
      
      const iframe = document.createElement('iframe');
      const iframeUrl = `${chatbotBaseUrl}/autoconnect?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(language)}`;
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      iframe.allow = 'microphone; camera';
      iframe.title = 'Aventora Chatbot';
      iframe.setAttribute('allowfullscreen', 'true');
      
      // Clear container and add iframe
      this.flutterContainer.innerHTML = '';
      this.flutterContainer.appendChild(iframe);
      
      iframe.onload = () => {
        console.log('[AventoraWidget] Iframe loaded, setting up communication...');
        
        // Setup postMessage communication with iframe
        this.setupIframeCommunication(iframe, chatbotBaseUrl);
        
        // Mark as loaded immediately (Flutter will handle its own initialization)
        this.flutterAppLoaded = true;
        this.isLoading = false;
        
        // Remove loading state
        const loadingState = this.flutterContainer.querySelector('.loading-state');
        if (loadingState) {
          loadingState.remove();
        }
        
        console.log('[AventoraWidget] Flutter app iframe loaded');
        
        // Wait for Flutter to initialize, then focus input
        // Flutter apps can take 3-5 seconds to fully load
        setTimeout(() => {
          console.log('[AventoraWidget] Attempting to focus input...');
          this.focusInput();
        }, 3000);
        
        // Also try after longer delay
        setTimeout(() => {
          console.log('[AventoraWidget] Second attempt to focus input...');
          this.focusInput();
        }, 6000);
      };
      
      iframe.onerror = () => {
        this.showError('Failed to load chatbot. Please check that the chatbot server is running.');
        this.isLoading = false;
      };
      
      // Store iframe reference for communication
      this.iframe = iframe;
      this.chatbotBaseUrl = chatbotBaseUrl;
      
      console.log('[AventoraWidget] Iframe created and stored:', {
        hasIframe: !!this.iframe,
        chatbotBaseUrl: this.chatbotBaseUrl,
        iframeSrc: iframe.src
      });
    },

    /**
     * Setup postMessage communication with Flutter app in iframe
     */
    setupIframeCommunication: function(iframe, chatbotBaseUrl) {
      const widgetInstance = this; // Use different name to avoid conflict with window.self
      let chatbotOrigin;
      
      try {
        chatbotOrigin = new URL(chatbotBaseUrl).origin;
      } catch (e) {
        console.error('[AventoraWidget] Invalid chatbot base URL:', chatbotBaseUrl);
        chatbotOrigin = '*'; // Fallback to wildcard (less secure but works)
      }
      
      console.log('[AventoraWidget] Setting up communication with origin:', chatbotOrigin);
      
      // Listen for messages from Flutter app
      this.messageHandler = (event) => {
        // Verify origin (if we have a specific origin)
        if (chatbotOrigin !== '*' && event.origin !== chatbotOrigin) {
          return;
        }
        
        // Handle messages from Flutter app
        if (event.data && typeof event.data === 'object') {
          console.log('[AventoraWidget] Received message from Flutter:', event.data);
          // Forward relevant messages as custom events
          window.dispatchEvent(new CustomEvent('aventora:widget:message', {
            detail: event.data
          }));
        }
      };
      
      window.addEventListener('message', this.messageHandler);
      
      // Store reference for sending messages to iframe
      this.sendToFlutter = function(message) {
        // Use stored iframe reference
        const targetIframe = widgetInstance.iframe || iframe;
        
        if (!targetIframe || !targetIframe.contentWindow) {
          console.warn('[AventoraWidget] Cannot send message - iframe not ready', {
            hasIframe: !!targetIframe,
            hasContentWindow: targetIframe ? !!targetIframe.contentWindow : false
          });
          return false;
        }
        
        try {
          // Use '*' as origin if we couldn't parse it, or use specific origin
          const targetOrigin = chatbotOrigin === '*' ? '*' : chatbotOrigin;
          targetIframe.contentWindow.postMessage(message, targetOrigin);
          console.log('[AventoraWidget] ✅ Sent message to Flutter:', message, 'to origin:', targetOrigin);
          return true;
        } catch (e) {
          console.error('[AventoraWidget] ❌ Error sending message to Flutter app:', e);
          return false;
        }
      };
      
      // Store chatbot origin for later use
      this.chatbotOrigin = chatbotOrigin;
      
      console.log('[AventoraWidget] ✅ Communication setup complete', {
        hasSendToFlutter: !!this.sendToFlutter,
        chatbotOrigin: chatbotOrigin,
        iframeSrc: iframe.src
      });
      
      // Test communication immediately
      setTimeout(() => {
        console.log('[AventoraWidget] Testing communication...');
        if (this.sendToFlutter) {
          this.sendToFlutter({ type: 'focus_input' });
        }
      }, 1000);
    },

    /**
     * Focus the input field in Flutter app
     */
    focusInput: function() {
      if (this.sendToFlutter) {
        // Send multiple message types to ensure Flutter receives it
        const messages = [
          { type: 'focus_input' },
          { type: 'click_input' }
        ];
        
        messages.forEach(msg => {
          this.sendToFlutter(msg);
        });
        
        console.log('[AventoraWidget] Sent focus_input and click_input messages to Flutter app');
      } else {
        console.warn('[AventoraWidget] Cannot focus input - sendToFlutter not available');
      }
    },

    /**
     * Send a message to Flutter app
     * By default, puts text in textbox but does NOT send (autoSend: false)
     * Set options.autoSend = true to automatically send
     */
    sendMessage: function(text, options = {}) {
      if (!this.sendToFlutter) {
        console.warn('[AventoraWidget] Flutter app not ready, cannot send message');
        // Try to setup communication if iframe exists
        if (this.iframe && this.chatbotBaseUrl) {
          this.setupIframeCommunication(this.iframe, this.chatbotBaseUrl);
          // Retry after setup
          setTimeout(() => {
            if (this.sendToFlutter) {
              this.sendMessage(text, options);
            }
          }, 500);
        }
        return false;
      }
      
      // Default to autoSend: false (just put text in textbox, don't send)
      const autoSend = options.autoSend === true;
      
      // When autoSend is false, use set_question type (just set text, don't send)
      // When autoSend is true, use send_message type (set text and send)
      if (autoSend) {
        // Send message and auto-send
        const messages = [
          { type: 'send_message', text: text, autoSend: true },
          { type: 'chatbot_message', message: text, autoSend: true }
        ];
        messages.forEach(msg => {
          this.sendToFlutter(msg);
        });
      } else {
        // Just set text in input field (don't send)
        this.sendToFlutter({ 
          type: 'set_question', 
          question: text, 
          autoSend: false 
        });
      }
      
      console.log('[AventoraWidget] Sent message to Flutter app:', text, 'autoSend:', autoSend);
      return true;
    },

    /**
     * Set a question in Flutter app input
     * By default, puts question in textbox but does NOT send (autoSend: false)
     * Set options.autoSend = true to automatically send
     */
    setQuestion: function(text, options = {}) {
      if (!this.sendToFlutter) {
        console.warn('[AventoraWidget] Flutter app not ready, cannot set question');
        // Try to setup communication if iframe exists
        if (this.iframe && this.chatbotBaseUrl) {
          this.setupIframeCommunication(this.iframe, this.chatbotBaseUrl);
          // Retry after setup
          setTimeout(() => {
            if (this.sendToFlutter) {
              this.setQuestion(text, options);
            }
          }, 500);
        }
        return false;
      }
      
      // Default to autoSend: false (just put question in textbox, don't send)
      const autoSend = options.autoSend === true;
      
      const message = {
        type: 'set_question',
        question: text,
        autoSend: autoSend
      };
      
      this.sendToFlutter(message);
      console.log('[AventoraWidget] Set question in Flutter app:', text, 'autoSend:', autoSend);
      return true;
    },

    /**
     * Set a file parameter in Flutter app
     * This passes a file parameter (e.g., file=ABC123) to the chatbot
     * By default, does NOT send automatically (autoSend: false)
     * Set options.autoSend = true to automatically send
     */
    setFile: function(fileId, options = {}) {
      if (!this.sendToFlutter) {
        console.warn('[AventoraWidget] Flutter app not ready, cannot set file');
        // Try to setup communication if iframe exists
        if (this.iframe && this.chatbotBaseUrl) {
          this.setupIframeCommunication(this.iframe, this.chatbotBaseUrl);
          // Retry after setup
          setTimeout(() => {
            if (this.sendToFlutter) {
              this.setFile(fileId, options);
            }
          }, 500);
        }
        return false;
      }
      
      // Default to autoSend: false (just set file parameter, don't send)
      const autoSend = options.autoSend === true;
      
      const message = {
        type: 'set_file',
        file: fileId,
        autoSend: autoSend
      };
      
      this.sendToFlutter(message);
      console.log('[AventoraWidget] Set file parameter in Flutter app:', fileId, 'autoSend:', autoSend);
      return true;
    },

    /**
     * Load a script dynamically
     */
    loadScript: function(src) {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Load synchronously to ensure order
        script.crossOrigin = 'anonymous'; // Allow cross-origin if needed
        
        script.onload = () => {
          console.log('[AventoraWidget] Script loaded:', src);
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('[AventoraWidget] Failed to load script:', src, error);
          reject(new Error(`Failed to load script: ${src}`));
        };
        
        document.head.appendChild(script);
      });
    },

    /**
     * Show error message
     */
    showError: function(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-state';
      errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #d32f2f;';
      errorDiv.textContent = message;
      
      this.flutterContainer.innerHTML = '';
      this.flutterContainer.appendChild(errorDiv);
    },

    /**
     * Destroy instance and clean up
     */
    destroy: function() {
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler);
      }
      if (this.messageHandler) {
        window.removeEventListener('message', this.messageHandler);
      }
    }
  };

})();
