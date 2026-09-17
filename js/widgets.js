/**
 * Widgets Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1 — Web Components
 * All widgets are now declared as <arcgis-*> HTML components in index.html.
 * This module configures component behavior that requires JS (search sources,
 * measurement auto-start, print layer toggling).
 */

import { APP_CONFIG } from "./config.js?v=5.4";

let instances = {};
let sketchLayer = null;

/**
 * Configures all web component widgets that need JS setup
 * @param {Object} mapContext - { view, webmap, operationalLayer }
 */
export async function initWidgets(mapContext) {
  const { view, webmap, operationalLayer } = mapContext;

  console.info("[Widgets] Configuring Web Component widgets...");

  // ==========================================
  // 1. SEARCH — Configure layer search sources
  // ==========================================
  const searchEl = document.getElementById("main-search");
  if (searchEl && operationalLayer) {
    // Wait for the component to be fully defined
    await customElements.whenDefined("arcgis-search");

    searchEl.includeDefaultSources = true;
    searchEl.allPlaceholder = "Search features or locations...";

    // Add layer search source once the component is ready
    const configureSearch = () => {
      try {
        if (searchEl.sources) {
          searchEl.sources = [
            {
              layer: operationalLayer,
              searchFields: ["FullName", "Email", "OBJECTID"],
              displayField: "FullName",
              exactMatch: false,
              outFields: ["*"],
              name: operationalLayer.title || "Sample Layer Features",
              placeholder: "Search features (Name, Email)...",
              suggestionTemplate: "{FullName} ({Email})",
              zoomScale: 25000
            }
          ];
        }
      } catch (e) {
        console.warn("[Widgets] Search source config notice:", e);
      }
    };

    // Try immediately; if not ready, wait for component ready
    setTimeout(configureSearch, 500);
  }
  instances.search = searchEl;

  // ==========================================
  // 2. SKETCH — <arcgis-sketch> manages its own internal GraphicsLayer
  // ==========================================
  const sketchEl = document.getElementById("main-sketch");
  if (sketchEl) {
    await customElements.whenDefined("arcgis-sketch");
  }
  instances.sketch = sketchEl;

  // ==========================================
  // 3. PRINT — Set the print service URL
  // ==========================================
  const printEl = document.getElementById("map-print");
  if (printEl) {
    await customElements.whenDefined("arcgis-print");
    printEl.printServiceUrl = APP_CONFIG.printServiceUrl ||
      "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";
  }
  instances.print = printEl;

  // ==========================================
  // 4. PRINT EXPAND — Toggle operational layer for public print service
  // ==========================================
  const printExpand = document.getElementById("print-expand");
  if (printExpand && operationalLayer && webmap) {
    printExpand.addEventListener("arcgisExpanded", () => {
      if (webmap.layers.includes(operationalLayer)) {
        webmap.remove(operationalLayer);
      }
    });
    printExpand.addEventListener("arcgisCollapsed", () => {
      if (!webmap.layers.includes(operationalLayer)) {
        webmap.add(operationalLayer);
      }
    });
  }
  instances.printExpand = printExpand;

  console.info("[Widgets] All web component widgets configured successfully.");
  return instances;
}

export function getInstances() { return instances; }
export function getSketchLayer() { return sketchLayer; }
