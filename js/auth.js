/**
 * Authentication Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1 — Web Components
 * Handles OAuth 2.0 Client Credentials Grant and Token Registration
 * Registers token in BOTH the ESM IdentityManager AND the Web Component bundle IdentityManager
 */
import esriConfig from "https://js.arcgis.com/5.1/@arcgis/core/config.js";
import IdentityManager from "https://js.arcgis.com/5.1/@arcgis/core/identity/IdentityManager.js";
import { APP_CONFIG } from "./config.js?v=5.3";

let currentToken = null;
let tokenExpirationTimestamp = null;
let refreshTimerId = null;

/**
 * Request an OAuth 2.0 access token using client_credentials grant
 */
async function fetchAppToken() {
  if (!APP_CONFIG.clientId || !APP_CONFIG.clientSecret) {
    throw new Error("Client ID and Client Secret are required to authenticate with ArcGIS Online.");
  }

  const tokenUrl = `${APP_CONFIG.portalUrl}/sharing/rest/oauth2/token`;
  const body = new URLSearchParams({
    client_id: APP_CONFIG.clientId,
    client_secret: APP_CONFIG.clientSecret,
    grant_type: "client_credentials",
    expiration: "120"
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Token request failed with HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    const errorMsg = data.error.message || data.error.description || JSON.stringify(data.error);
    throw new Error(`ArcGIS Online Authentication Failed: ${errorMsg}. Please verify your Client ID and Client Secret.`);
  }

  currentToken = data.access_token;
  tokenExpirationTimestamp = Date.now() + (data.expires_in * 1000);

  console.info("[Auth] ArcGIS OAuth 2.0 App Token acquired successfully. Valid for:", data.expires_in, "seconds");
  return data;
}

/**
 * Registers the acquired token with Esri IdentityManager and request interceptors.
 * Registers in BOTH the ESM singleton AND the Web Component bundle's internal singleton.
 */
async function registerTokenWithEsri(tokenData) {
  if (!tokenData || !tokenData.access_token) return;

  const token = tokenData.access_token;
  const expires = tokenExpirationTimestamp;

  const targetServers = [
    "https://www.arcgis.com",
    "https://www.arcgis.com/sharing/rest",
    "https://services-ap1.arcgis.com"
  ];

  // 1. Standard ESM IdentityManager
  targetServers.forEach(serverUrl => {
    IdentityManager.registerToken({
      server: serverUrl,
      token: token,
      expires: expires,
      ssl: true
    });
  });

  // 2. Web Component bundle IdentityManager via $arcgis.import
  if (window.$arcgis && typeof window.$arcgis.import === "function") {
    try {
      const [componentIdManager, componentConfig] = await window.$arcgis.import([
        "@arcgis/core/identity/IdentityManager.js",
        "@arcgis/core/config.js"
      ]);

      if (componentIdManager && typeof componentIdManager.registerToken === "function") {
        targetServers.forEach(serverUrl => {
          componentIdManager.registerToken({
            server: serverUrl,
            token: token,
            expires: expires,
            ssl: true
          });
        });
        console.info("[Auth] Token registered in Web Component IdentityManager.");
      }

      if (componentConfig && componentConfig.request) {
        if (!componentConfig.request.interceptors) componentConfig.request.interceptors = [];
        componentConfig.request.interceptors.push({
          _id: "component-app-token-interceptor",
          urls: targetServers,
          before: function (params) {
            if (currentToken) {
              if (!params.requestOptions) params.requestOptions = {};
              if (!params.requestOptions.query) params.requestOptions.query = {};
              if (!params.requestOptions.query.token) {
                params.requestOptions.query.token = currentToken;
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn("[Auth] Notice registering in Web Component scope:", err);
    }
  }

  // 3. Setup request interceptor on esriConfig (ESM)
  if (esriConfig && esriConfig.request) {
    if (!esriConfig.request.interceptors) {
      esriConfig.request.interceptors = [];
    }

    const interceptorExists = esriConfig.request.interceptors.some(
      i => i._id === "arcgis-app-token-interceptor"
    );

    if (!interceptorExists) {
      esriConfig.request.interceptors.push({
        _id: "arcgis-app-token-interceptor",
        urls: targetServers,
        before: function (params) {
          if (currentToken) {
            if (!params.requestOptions) params.requestOptions = {};
            if (!params.requestOptions.query) params.requestOptions.query = {};
            if (!params.requestOptions.query.token) {
              params.requestOptions.query.token = currentToken;
            }
          }
        }
      });
    }
  }

  scheduleTokenRefresh(tokenData.expires_in);
}

/**
 * Schedules automatic token refresh before expiration
 */
function scheduleTokenRefresh(expiresInSeconds) {
  if (refreshTimerId) clearTimeout(refreshTimerId);
  const refreshDelayMs = Math.max(30000, (expiresInSeconds * 1000) - APP_CONFIG.tokenRefreshBufferMs);

  refreshTimerId = setTimeout(async () => {
    try {
      const freshTokenData = await fetchAppToken();
      if (freshTokenData) {
        await registerTokenWithEsri(freshTokenData);
      }
    } catch (err) {
      console.error("[Auth] Token auto-refresh notice:", err);
    }
  }, refreshDelayMs);
}

/**
 * Main initialization entry point
 * @returns {Promise<Object|null>} tokenData or null if standalone
 */
export async function initAuth() {
  // Ensure custom elements are defined so $arcgis is available
  if (window.customElements && typeof window.customElements.whenDefined === "function") {
    await window.customElements.whenDefined("arcgis-map");
  }

  const tokenData = await fetchAppToken();
  if (tokenData) {
    await registerTokenWithEsri(tokenData);
  }
  return tokenData;
}

export function getToken() {
  return currentToken;
}

export function isStandalone() {
  return false;
}
