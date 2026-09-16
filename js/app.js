/**
 * Main Application Orchestrator (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1
 * Bootstraps authentication, map, widgets, and custom editor
 * Single entry point: <script type="module" src="js/app.js">
 */

// Import application modules
import { APP_CONFIG, isConfigReady, saveConfig, clearConfig } from "./config.js?v=5.2";
import { initAuth, isStandalone } from "./auth.js?v=5.2";
import { initMap } from "./map.js?v=5.2";
import { initWidgets } from "./widgets.js?v=5.2";
import { init as initEditor, refreshFeaturesList, showToast } from "./customEditor.js?v=5.2";

let connectionPromptResolver = null;
let isInitialPrompt = false;

// ==========================================
// Application Bootstrap
// ==========================================

(async function bootApp() {
  // Detect file:// protocol and guide user to http://localhost:8085
  if (window.location.protocol === "file:") {
    const banner = document.createElement("div");
    banner.id = "file-protocol-warning";
    banner.style.cssText = "position:fixed;top:0;left:0;width:100%;background:#dc2626;color:#ffffff;text-align:center;padding:12px 16px;z-index:999999;font-weight:600;font-family:sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.4);line-height:1.5;";
    banner.innerHTML = "⚠️ Note: You opened this file directly via <code>file:///</code> protocol. Modern browsers block ArcGIS token/CORS requests on local files. Please open via your local server: <a href='http://localhost:8085' style='color:#ffffff;text-decoration:underline;font-weight:bold;margin-left:8px;background:rgba(0,0,0,0.25);padding:3px 8px;border-radius:4px;'>http://localhost:8085</a>";
    document.body.prepend(banner);
  }

  // Setup connection modal and layout controls early
  setupConnectionModal();
  setupLayoutControls();

  // If credentials are not configured, prompt the user first
  if (!isConfigReady()) {
    updateLoadingState(false);
    await promptForConnection();
  }

  try {
    // Step 1: Authenticate with ArcGIS Online
    updateLoadingState(true, "Authenticating with ArcGIS Online...");
    console.info("[App] Step 1/4: Initializing authentication...");
    await initAuth();

    // Step 2: Initialize Map & MapView
    updateLoadingState(true, "Loading Web Map...");
    console.info("[App] Step 2/4: Initializing Map & MapView...");
    const mapContext = await initMap("viewDiv");

    // Immediately hide loading overlay as soon as MapView resolves!
    updateLoadingState(false);
    console.info("[App] MapView ready and displayed!");

    // Update header metadata
    updateHeaderInfo(mapContext.webmap || mapContext.map, mapContext.operationalLayer);

    // Step 3: Initialize all Mandatory & Bonus Widgets
    console.info("[App] Step 3/4: Initializing widgets...");
    await initWidgets(mapContext);

    // Step 4: Initialize Custom applyEdits Feature Editor
    console.info("[App] Step 4/4: Initializing custom feature editor...");
    await initEditor(mapContext);

    console.info("[App] ArcGIS GIS Viewer Application successfully initialized!");
    const modeNotice = isStandalone()
      ? "Ready (Standalone Demo Mode)"
      : "Ready (Connected to ArcGIS Online Web Map)";
    showToast(modeNotice, "success");

  } catch (err) {
    console.error("[App] Critical Application Initialization Error:", err);
    showFatalError(err.message || String(err));
  }
})();

// ==========================================
// Connection Configuration Modal Handling
// ==========================================

function promptForConnection() {
  return new Promise((resolve) => {
    connectionPromptResolver = resolve;
    isInitialPrompt = true;
    openConfigModal();
  });
}

function openConfigModal() {
  const modal = document.getElementById("modal-connection-config");
  if (!modal) return;

  // Pre-fill inputs with current APP_CONFIG values
  const inputPortal = document.getElementById("config-portal-url");
  const inputWebMap = document.getElementById("config-webmap-id");
  const inputClientId = document.getElementById("config-client-id");
  const inputSecret = document.getElementById("config-client-secret");
  const inputLayerTitle = document.getElementById("config-layer-title");

  if (inputPortal) inputPortal.value = APP_CONFIG.portalUrl || "https://www.arcgis.com";
  if (inputWebMap) inputWebMap.value = APP_CONFIG.webMapId || "16ffde90eb6e4432ba2b81da63637ba0";
  if (inputClientId) inputClientId.value = APP_CONFIG.clientId || "";
  if (inputSecret) inputSecret.value = APP_CONFIG.clientSecret || "";
  if (inputLayerTitle) inputLayerTitle.value = APP_CONFIG.operationalLayerTitle || "Sample_Layer";

  modal.classList.add("active");
}

function closeConfigModal() {
  const modal = document.getElementById("modal-connection-config");
  if (modal) modal.classList.remove("active");
}

function setupConnectionModal() {
  const modal = document.getElementById("modal-connection-config");
  const btnShowConnection = document.getElementById("btn-show-connection");
  const btnCloseConfig = document.getElementById("btn-close-config");
  const btnSaveConfig = document.getElementById("btn-save-config");
  const btnLaunchStandalone = document.getElementById("btn-launch-standalone");
  const btnClearConfig = document.getElementById("btn-clear-config");
  const btnToggleSecret = document.getElementById("btn-toggle-secret-visibility");
  const inputSecret = document.getElementById("config-client-secret");
  const layerBadge = document.getElementById("layer-status-badge");

  if (btnShowConnection) {
    btnShowConnection.addEventListener("click", () => {
      isInitialPrompt = false;
      openConfigModal();
    });
  }

  if (layerBadge) {
    layerBadge.style.cursor = "pointer";
    layerBadge.title = "Click to configure connection settings";
    layerBadge.addEventListener("click", () => {
      isInitialPrompt = false;
      openConfigModal();
    });
  }

  if (btnCloseConfig) {
    btnCloseConfig.addEventListener("click", () => {
      closeConfigModal();
      if (isInitialPrompt && connectionPromptResolver) {
        // Default to standalone so app doesn't hang
        saveConfig({ mode: "standalone" }, false);
        const resolver = connectionPromptResolver;
        connectionPromptResolver = null;
        resolver();
      }
    });
  }

  if (btnToggleSecret && inputSecret) {
    btnToggleSecret.addEventListener("click", () => {
      inputSecret.type = inputSecret.type === "password" ? "text" : "password";
    });
  }

  if (btnClearConfig) {
    btnClearConfig.addEventListener("click", () => {
      clearConfig();
      if (document.getElementById("config-client-id")) document.getElementById("config-client-id").value = "";
      if (inputSecret) inputSecret.value = "";
      showToast("Saved credentials cleared from browser storage", "info");
    });
  }

  if (btnLaunchStandalone) {
    btnLaunchStandalone.addEventListener("click", () => {
      saveConfig({ mode: "standalone" }, false);
      closeConfigModal();
      if (isInitialPrompt && connectionPromptResolver) {
        const resolver = connectionPromptResolver;
        connectionPromptResolver = null;
        resolver();
      } else {
        window.location.reload();
      }
    });
  }

  if (btnSaveConfig) {
    btnSaveConfig.addEventListener("click", () => {
      const portalUrl = (document.getElementById("config-portal-url")?.value || "").trim() || "https://www.arcgis.com";
      const webMapId = (document.getElementById("config-webmap-id")?.value || "").trim() || "16ffde90eb6e4432ba2b81da63637ba0";
      const clientId = (document.getElementById("config-client-id")?.value || "").trim();
      const clientSecret = (document.getElementById("config-client-secret")?.value || "").trim();
      const layerTitle = (document.getElementById("config-layer-title")?.value || "").trim() || "Sample_Layer";
      const remember = document.getElementById("config-remember")?.checked !== false;

      if (!clientId || !clientSecret) {
        alert("Please enter both Client ID and Client Secret, or select 'Launch Standalone Demo'.");
        return;
      }

      saveConfig({
        mode: "arcgis-online",
        portalUrl,
        webMapId,
        clientId,
        clientSecret,
        operationalLayerTitle: layerTitle
      }, remember);

      closeConfigModal();

      if (isInitialPrompt && connectionPromptResolver) {
        const resolver = connectionPromptResolver;
        connectionPromptResolver = null;
        resolver();
      } else {
        window.location.reload();
      }
    });
  }
}

// ==========================================
// UI Helpers
// ==========================================

/**
 * Updates loading overlay state
 */
function updateLoadingState(isLoading, message = "Loading...") {
  const overlay = document.getElementById("app-loading-overlay");
  const statusText = document.getElementById("loading-status-text");

  if (overlay && statusText) {
    if (isLoading) {
      overlay.classList.remove("hidden");
      statusText.textContent = message;
    } else {
      overlay.classList.add("hidden");
    }
  }
}

/**
 * Displays fatal startup error message
 */
function showFatalError(errMsg) {
  const overlay = document.getElementById("app-loading-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div class="fatal-error-box">
        <div class="fatal-error-icon">✕</div>
        <h2>Application Error</h2>
        <p>Failed to initialize the ArcGIS Web Application.</p>
        <div class="error-detail">${errMsg}</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
          <button class="btn btn-primary" id="btn-fatal-change-config">Change Connection Settings</button>
        </div>
      </div>
    `;

    const btnFatalConfig = document.getElementById("btn-fatal-change-config");
    if (btnFatalConfig) {
      btnFatalConfig.addEventListener("click", () => {
        overlay.classList.add("hidden");
        openConfigModal();
      });
    }
  }
}

/**
 * Updates header branding & layer status
 */
function updateHeaderInfo(mapInstance, layer) {
  const titleEl = document.getElementById("app-map-title");
  if (titleEl) {
    titleEl.textContent = (mapInstance && mapInstance.title) ? mapInstance.title : "Sample_Layer Management Web Map";
  }

  const layerBadge = document.getElementById("layer-status-badge");
  if (layerBadge && layer) {
    const modeText = isStandalone() ? "Standalone Demo" : "ArcGIS Online";
    layerBadge.textContent = `${layer.title || "Sample_Layer"} (${modeText})`;
    layerBadge.classList.add("badge-active");
  }
}

/**
 * Sets up sidebar drawer toggles and responsive UI actions
 */
function setupLayoutControls() {
  // Drawer toggles
  const btnToggleFeaturesDrawer = document.getElementById("btn-toggle-features-drawer");
  const featuresDrawer = document.getElementById("features-drawer");
  const btnCloseDrawer = document.getElementById("btn-close-drawer");

  if (btnToggleFeaturesDrawer && featuresDrawer) {
    btnToggleFeaturesDrawer.addEventListener("click", () => {
      featuresDrawer.classList.toggle("open");
      if (featuresDrawer.classList.contains("open")) {
        refreshFeaturesList();
      }
    });
  }

  if (btnCloseDrawer && featuresDrawer) {
    btnCloseDrawer.addEventListener("click", () => {
      featuresDrawer.classList.remove("open");
    });
  }

  // Info / Assessment modal toggle
  const btnAbout = document.getElementById("btn-show-about");
  const modalAbout = document.getElementById("modal-about");
  const btnCloseAbout = document.getElementById("btn-close-about");
  const btnCloseAbout2 = document.getElementById("btn-close-about-2");

  if (btnAbout && modalAbout) {
    btnAbout.addEventListener("click", () => {
      modalAbout.classList.add("active");
    });
  }
  if (btnCloseAbout && modalAbout) {
    btnCloseAbout.addEventListener("click", () => {
      modalAbout.classList.remove("active");
    });
  }
  if (btnCloseAbout2 && modalAbout) {
    btnCloseAbout2.addEventListener("click", () => {
      modalAbout.classList.remove("active");
    });
  }

  // Theme toggle
  const btnToggleTheme = document.getElementById("btn-toggle-theme");
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      btnToggleTheme.setAttribute("title", isLight ? "Switch to Dark Mode" : "Switch to Light Mode");
    });
  }
}
