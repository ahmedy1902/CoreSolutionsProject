/**
 * Application Configuration & Runtime Credential Manager (ESM)
 * GIS Technical Assessment - Core Solutions Mini Project
 * 
 * Supports:
 * 1. Default safe public configuration (safe for public GitHub repository)
 * 2. In-browser Session/Local Storage for evaluator credentials (GitHub Pages ready)
 * 3. Optional local dev overrides via gitignored ./config.local.js
 */

const STORAGE_KEY = "arcgis_assessment_config";

// Default public configuration (NO secrets hardcoded)
const DEFAULT_CONFIG = {
  mode: "arcgis-online",
  portalUrl: "https://www.arcgis.com",
  webMapId: "16ffde90eb6e4432ba2b81da63637ba0",
  clientId: "",
  clientSecret: "",
  printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
  operationalLayerTitle: "Sample_Layer",
  initialCenter: [25, 45],
  initialZoom: 13,
  tokenRefreshBufferMs: 5 * 60 * 1000
};

// Mutable live config exported across ESM modules
export const APP_CONFIG = { ...DEFAULT_CONFIG };

/**
 * Read configuration saved by user in browser storage
 */
export function getStoredConfig() {
  try {
    const sessionData = sessionStorage.getItem(STORAGE_KEY);
    if (sessionData) return JSON.parse(sessionData);

    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) return JSON.parse(localData);
  } catch (err) {
    console.warn("[Config] Storage read error:", err);
  }
  return null;
}

/**
 * Check whether we have all required credentials to connect to ArcGIS Online
 */
export function isConfigReady() {
  return Boolean(
    APP_CONFIG.clientId &&
    APP_CONFIG.clientSecret &&
    APP_CONFIG.webMapId &&
    APP_CONFIG.portalUrl
  );
}

/**
 * Save credentials entered via UI Modal
 */
export function saveConfig(updates, remember = true) {
  Object.assign(APP_CONFIG, updates);
  try {
    const serialized = JSON.stringify({
      mode: APP_CONFIG.mode,
      portalUrl: APP_CONFIG.portalUrl,
      webMapId: APP_CONFIG.webMapId,
      clientId: APP_CONFIG.clientId,
      clientSecret: APP_CONFIG.clientSecret,
      operationalLayerTitle: APP_CONFIG.operationalLayerTitle
    });

    if (remember) {
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn("[Config] Failed to save config to storage:", err);
  }
}

/**
 * Clear all saved credentials from browser storage
 */
export function clearConfig() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[Config] Storage clear error:", err);
  }
  Object.assign(APP_CONFIG, DEFAULT_CONFIG);
}

// ===================================================
// Bootstrap Runtime Configuration
// ===================================================

// 1. Try to load local dev overrides (if ./config.local.js exists)
try {
  const localMod = await import("./config.local.js").catch(() => null);
  if (localMod && localMod.LOCAL_CONFIG) {
    Object.assign(APP_CONFIG, localMod.LOCAL_CONFIG);
  }
} catch {
  // Ignored on production / GitHub Pages where config.local.js is not uploaded
}

// 2. Storage overrides (takes priority over defaults/local if user configured in UI)
const stored = getStoredConfig();
if (stored) {
  Object.assign(APP_CONFIG, stored);
}
