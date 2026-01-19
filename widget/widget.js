/**
 * Aventora Chatbot Widget Loader
 * 
 * Tiny loader script (~10KB target) that reads configuration from data attributes
 * and lazy-loads the UI component only when user first opens the widget.
 * 
 * Usage:
 * <script
 *   src="https://cdn.aventora.ai/widget.js"
 *   data-tenant="TENANT_ID"
 *   data-bot="BOT_ID"
 *   data-api-base="https://api.aventora.ai"
 *   data-theme="auto"
 *   data-position="bottom-right"
 *   data-primary="#2563eb"
 *   data-open-on-load="false"
 *   defer>
 * </script>
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.AventoraWidgetLoader) {
    console.warn('[AventoraWidget] Loader already initialized');
    return;
  }

  // Find the script tag that loaded this script
  const currentScript = document.currentScript || 
    (function() {
      const scripts = document.querySelectorAll('script[src*="widget.js"]');
      return scripts[scripts.length - 1] || null;
    })();

  if (!currentScript) {
    console.error('[AventoraWidget] Could not find script tag');
    return;
  }

  console.log('[AventoraWidget] Initializing...', {
    scriptSrc: currentScript.src,
    tenant: currentScript.getAttribute('data-tenant')
  });

  // Extract configuration from data attributes
  const config = {
    tenant: currentScript.getAttribute('data-tenant') || currentScript.getAttribute('data-domain'),
    bot: currentScript.getAttribute('data-bot') || '',
    apiBase: currentScript.getAttribute('data-api-base') || null, // Will be fetched from server
    chatbotBaseUrl: currentScript.getAttribute('data-chatbot-base-url') || null, // Will be fetched from server
    theme: currentScript.getAttribute('data-theme') || 'auto',
    position: currentScript.getAttribute('data-position') || 'bottom-right',
    primary: currentScript.getAttribute('data-primary') || '#2563eb',
    openOnLoad: currentScript.getAttribute('data-open-on-load') === 'true'
  };

  // Validate required config
  if (!config.tenant) {
    console.error('[AventoraWidget] data-tenant attribute is required');
    console.error('[AventoraWidget] Available attributes:', {
      tenant: currentScript.getAttribute('data-tenant'),
      domain: currentScript.getAttribute('data-domain'),
      allAttributes: Array.from(currentScript.attributes).map(a => `${a.name}="${a.value}"`)
    });
    return;
  }

  console.log('[AventoraWidget] Config extracted:', config);

  // Determine widget-ui.js URL (same directory as widget.js)
  const scriptSrc = currentScript.src || '';
  let widgetUiUrl;
  
  if (scriptSrc) {
    // Extract base URL and construct widget-ui.js path
    try {
      const scriptUrl = new URL(scriptSrc, window.location.href);
      const basePath = scriptUrl.pathname.replace(/widget\.js$/, '');
      widgetUiUrl = scriptUrl.origin + basePath + 'widget-ui.js';
    } catch (e) {
      // Fallback: simple string replacement
      widgetUiUrl = scriptSrc.replace(/widget\.js$/, 'widget-ui.js');
    }
  } else {
    // Fallback to absolute path
    widgetUiUrl = '/widget/widget-ui.js';
  }
  
  console.log('[AventoraWidget] Widget UI URL:', widgetUiUrl);

  // Create root container with unique ID
  let rootId = 'aventora-widget-root';
  let counter = 0;
  while (document.getElementById(rootId)) {
    rootId = `aventora-widget-root-${++counter}`;
  }

  const root = document.createElement('div');
  root.id = rootId;
  root.setAttribute('data-aventora-widget', 'true');
  document.body.appendChild(root);

  // Attach Shadow DOM
  const shadowRoot = root.attachShadow({ mode: 'open' });

  // Inject base CSS
  const baseCSS = `
    :host {
      --widget-primary: ${config.primary};
      --widget-bg: #ffffff;
      --widget-text: #333333;
      --widget-border: #e0e0e0;
      --widget-shadow: rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    .widget-container {
      position: fixed;
      z-index: 999999;
      ${getPositionStyles(config.position)}
    }
    
    .launcher-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--widget-primary);
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
      font-family: inherit;
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
      width: 450px;
      height: 700px;
      max-width: 90vw;
      max-height: 90vh;
      background: var(--widget-bg);
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--widget-shadow);
      overflow: hidden;
      position: relative;
    }
    
    .chat-panel.open {
      display: block;
    }
    
    @media (max-width: 640px) {
      .chat-panel {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = baseCSS;
  shadowRoot.appendChild(styleElement);

  // Create launcher button and panel shell
  const container = document.createElement('div');
  container.className = 'widget-container';
  
  const launcherButton = document.createElement('button');
  launcherButton.className = 'launcher-button';
  launcherButton.setAttribute('aria-label', 'Open chatbot');
  launcherButton.setAttribute('title', 'Open chatbot');
  launcherButton.textContent = '💬';
  
  const chatPanel = document.createElement('div');
  chatPanel.className = 'chat-panel';
  
  container.appendChild(launcherButton);
  container.appendChild(chatPanel);
  shadowRoot.appendChild(container);

  // State
  let uiLoaded = false;
  let uiInstance = null;
  let configLoaded = false;

  // Fetch configuration from server
  function loadConfig() {
    if (configLoaded) {
      return Promise.resolve();
    }

    // Try to fetch config from server (if running on same origin)
    const configUrl = '/api/config';
    
    return fetch(configUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Config endpoint not available');
        }
        return response.json();
      })
      .then(data => {
        // Use API base URL from server config (preferred)
        if (data.apiBaseUrl) {
          config.apiBase = data.apiBaseUrl;
        }
        
        // Store chatbot base URL if available (for reference, though widget doesn't use it directly)
        if (data.chatbotBaseUrl) {
          config.chatbotBaseUrl = data.chatbotBaseUrl;
        }
        
        // Fallback to default if still not set
        if (!config.apiBase) {
          config.apiBase = 'https://api.aventora.ai';
        }
        
        configLoaded = true;
        console.log('[AventoraWidget] Config loaded:', { apiBase: config.apiBase, chatbotBaseUrl: config.chatbotBaseUrl });
      })
      .catch(error => {
        // If config endpoint fails, use defaults
        console.warn('[AventoraWidget] Could not load config from server, using defaults:', error);
        if (!config.apiBase) {
          config.apiBase = 'https://api.aventora.ai';
        }
        configLoaded = true;
      });
  }

  // Load UI script dynamically
  function loadUI() {
    if (uiLoaded) {
      return Promise.resolve(uiInstance);
    }

    return new Promise((resolve, reject) => {
      // Check if already loaded globally
      if (window.AventoraWidgetUI) {
        uiLoaded = true;
        initializeUI().then(resolve).catch(reject);
        return;
      }

      const script = document.createElement('script');
      script.src = widgetUiUrl;
      script.async = true;
      
      script.onload = function() {
        // Wait a bit for the script to execute and define AventoraWidgetUI
        setTimeout(() => {
          if (window.AventoraWidgetUI) {
            console.log('[AventoraWidget] AventoraWidgetUI found, initializing...');
            uiLoaded = true;
            initializeUI().then(resolve).catch(reject);
          } else {
            console.error('[AventoraWidget] AventoraWidgetUI not found after script load');
            console.error('[AventoraWidget] Script URL:', widgetUiUrl);
            console.error('[AventoraWidget] Available globals with "Aventora":', Object.keys(window).filter(k => k.includes('Aventora')));
            console.error('[AventoraWidget] Check browser console for syntax errors in widget-ui.js');
            reject(new Error('AventoraWidgetUI not found after script load. Check console for syntax errors.'));
          }
        }, 200); // Increased timeout to allow script to execute
      };
      
      script.onerror = function(error) {
        console.error('[AventoraWidget] Script load error:', error);
        console.error('[AventoraWidget] Failed to load from:', widgetUiUrl);
        reject(new Error(`Failed to load widget UI from ${widgetUiUrl}. Check that the file exists and is accessible.`));
      };
      
      // Inject into shadow root's host document (main document)
      document.head.appendChild(script);
    });
  }

  // Initialize UI component
  function initializeUI() {
    if (uiInstance) {
      return Promise.resolve(uiInstance);
    }

    if (!window.AventoraWidgetUI || !window.AventoraWidgetUI.init) {
      return Promise.reject(new Error('AventoraWidgetUI.init not available'));
    }

    return window.AventoraWidgetUI.init({
      shadowRoot: shadowRoot,
      config: config,
      elements: {
        container: container,
        launcherButton: launcherButton,
        chatPanel: chatPanel
      }
    }).then(instance => {
      uiInstance = instance;
      return instance;
    });
  }

  // Handle launcher button click
  launcherButton.addEventListener('click', function() {
    // Ensure config is loaded before opening UI
    loadConfig().then(() => {
      return loadUI();
    }).then(instance => {
      if (instance && instance.open) {
        instance.open();
      }
    }).catch(err => {
      console.error('[AventoraWidget] Failed to load UI:', err);
      chatPanel.innerHTML = `<div style="padding: 20px; text-align: center; color: #d32f2f;">Error loading chatbot. Please refresh the page.</div>`;
      chatPanel.classList.add('open');
      launcherButton.style.display = 'none';
    });
  });

  // Load config on initialization
  loadConfig();

  // Auto-open if configured
  if (config.openOnLoad) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        loadConfig().then(() => {
          setTimeout(() => launcherButton.click(), 100);
        });
      });
    } else {
      loadConfig().then(() => {
        setTimeout(() => launcherButton.click(), 100);
      });
    }
  }

  // Helper function for position styles
  function getPositionStyles(position) {
    const positions = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    };
    return positions[position] || positions['bottom-right'];
  }

  // Expose minimal global API
  try {
    window.AventoraWidgetLoader = {
      config: config,
      root: root,
      shadowRoot: shadowRoot,
      open: function() {
        launcherButton.click();
        // Return a promise that resolves when UI is loaded
        return loadConfig().then(() => {
          return loadUI();
        });
      },
      getInstance: function() {
        return uiInstance;
      },
      waitForInstance: function(timeout = 5000) {
        return new Promise((resolve, reject) => {
          if (uiInstance) {
            resolve(uiInstance);
            return;
          }
          
          // Try to load UI if not already loading
          if (!uiLoaded) {
            loadConfig().then(() => {
              return loadUI();
            }).then(instance => {
              resolve(instance);
            }).catch(reject);
          } else {
            // UI is loading, wait for it
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
              if (uiInstance) {
                clearInterval(checkInterval);
                resolve(uiInstance);
              } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Timeout waiting for widget UI to load'));
              }
            }, 100);
          }
        });
      },
      // Convenience methods that work with the instance
      sendMessage: function(text, options) {
        if (uiInstance && uiInstance.sendMessage) {
          return uiInstance.sendMessage(text, options);
        }
        console.warn('[AventoraWidget] Instance not ready, message will be queued');
        // Queue the message
        this.waitForInstance().then(instance => {
          if (instance && instance.sendMessage) {
            instance.sendMessage(text, options);
          }
        });
        return false;
      },
      setQuestion: function(text, options) {
        if (uiInstance && uiInstance.setQuestion) {
          return uiInstance.setQuestion(text, options);
        }
        console.warn('[AventoraWidget] Instance not ready, question will be queued');
        this.waitForInstance().then(instance => {
          if (instance && instance.setQuestion) {
            instance.setQuestion(text, options);
          }
        });
        return false;
      },
      setFile: function(fileId, options) {
        if (uiInstance && uiInstance.setFile) {
          return uiInstance.setFile(fileId, options);
        }
        console.warn('[AventoraWidget] Instance not ready, file will be queued');
        this.waitForInstance().then(instance => {
          if (instance && instance.setFile) {
            instance.setFile(fileId, options);
          }
        });
        return false;
      },
      focusInput: function() {
        if (uiInstance && uiInstance.focusInput) {
          return uiInstance.focusInput();
        }
        this.waitForInstance().then(instance => {
          if (instance && instance.focusInput) {
            instance.focusInput();
          }
        });
        return false;
      }
    };

    console.log('[AventoraWidget] Loader initialized and exposed to window.AventoraWidgetLoader');

    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('aventora:widget:ready', {
      detail: { config: config, loader: window.AventoraWidgetLoader }
    }));
    
    console.log('[AventoraWidget] Ready event dispatched');
  } catch (error) {
    console.error('[AventoraWidget] Error initializing loader:', error);
  }

})();
