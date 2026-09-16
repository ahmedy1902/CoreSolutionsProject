/**
 * Application Configuration
 * GIS Technical Assessment - Core Solutions Mini Project
 * ESM Module for ArcGIS Maps SDK for JavaScript v5.1
 */
export const APP_CONFIG = {
  // Operating mode: 'arcgis-online' to connect with provided Client ID/Secret and WebMap
  mode: "arcgis-online", // Options: "arcgis-online" | "standalone"

  // ArcGIS Online Portal URL
  portalUrl: "your portal url",

  // Provided Web Map Item ID
  webMapId: "your webmapid",

  // Provided OAuth 2.0 Client Credentials
  clientId: "your client id",
  clientSecret: "your client secret",

  // Public/Sample ArcGIS Server Print Service for Export Web Map Task
  printServiceUrl: "your printservice url",

  // Target operational layer title in the web map
  operationalLayerTitle: "your operational layer title",

  // Initial map center & zoom for standalone mode 
  initialCenter: [your longitude, your latitude],
  initialZoom: your zoom level,

  // Token refresh buffer in milliseconds
  tokenRefreshBufferMs: 5 * 60 * 1000
};
