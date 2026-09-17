/**
 * Map and View Initialization Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1 — Web Components
 * Loads live ArcGIS Online Web Map via Item ID and initializes operational FeatureLayer
 */
import { APP_CONFIG } from "./config.js?v=5.7";

let mapInstance = null;
let view = null;
let operationalLayer = null;

/**
 * Waits for the arcgis-map view to be fully initialized and ready
 */
async function waitForViewReady(mapEl) {
  if (!mapEl) return null;
  if (mapEl.view) return mapEl.view;

  return new Promise((resolve) => {
    const handler = () => {
      mapEl.removeEventListener("arcgisViewReadyChange", handler);
      resolve(mapEl.view);
    };
    mapEl.addEventListener("arcgisViewReadyChange", handler);
    // Safety timeout in case event already fired
    setTimeout(() => {
      mapEl.removeEventListener("arcgisViewReadyChange", handler);
      resolve(mapEl.view);
    }, 12000);
  });
}

/**
 * Initializes the Map and MapView from the specified WebMap Item ID
 * @param {string} containerId - DOM container ID (defaults to 'main-map')
 * @returns {Promise<Object>} { webmap, map, view, operationalLayer }
 */
export async function initMap(containerId = "main-map") {
  // Ensure the arcgis-map custom element is registered before querying it
  if (window.customElements && typeof window.customElements.whenDefined === "function") {
    await window.customElements.whenDefined("arcgis-map");
  }

  const mapElement = document.getElementById("main-map") || document.querySelector("arcgis-map");
  if (!mapElement) {
    throw new Error("Could not find <arcgis-map> element in the DOM.");
  }

  if (!APP_CONFIG.webMapId) {
    throw new Error("WebMap Item ID is required. Please provide a valid WebMap Item ID in Connection Settings.");
  }

  console.info("[Map] Loading ArcGIS Online Web Map Item ID:", APP_CONFIG.webMapId);

  try {
    mapElement.itemId = APP_CONFIG.webMapId;
    view = await waitForViewReady(mapElement);
    mapInstance = mapElement.map;

    if (!view) {
      throw new Error("MapView failed to initialize within timeout.");
    }

    view.highlightOptions = {
      color: [37, 99, 235, 1],
      fillOpacity: 0.35
    };
    view.popup = {
      dockEnabled: false,
      dockOptions: {
        buttonEnabled: true,
        breakpoint: false,
        position: "top-right"
      },
      defaultPopupTemplateEnabled: true
    };

    operationalLayer = await waitForOperationalLayer(mapInstance, APP_CONFIG.operationalLayerTitle);

    if (operationalLayer) {
      try {
        await operationalLayer.load();
        configureLayerPopup(operationalLayer);
        console.info("[Map] Operational layer loaded:", operationalLayer.title);
      } catch (layerErr) {
        console.warn("[Map] Notice loading operational layer:", layerErr);
      }
    } else {
      console.warn(`[Map] Operational layer '${APP_CONFIG.operationalLayerTitle}' not found by title in WebMap.`);
    }

    return { webmap: mapInstance, map: mapInstance, view, operationalLayer };
  } catch (err) {
    console.error("[Map] Failed to load WebMap from ArcGIS Online:", err);
    throw new Error(`Failed to load WebMap (${APP_CONFIG.webMapId}): ${err.message || err}. Please verify your ArcGIS credentials.`);
  }
}

async function waitForOperationalLayer(mapInst, targetTitle, maxWaitMs = 15000) {
  if (!mapInst) return null;

  // 1. Await WebMap readiness if available
  if (typeof mapInst.when === "function") {
    try {
      await mapInst.when();
    } catch (e) {
      console.warn("[Map] mapInstance.when() notice:", e);
    }
  }

  if (typeof mapInst.loadAll === "function") {
    try {
      await mapInst.loadAll();
    } catch {
      // ignore
    }
  }

  // 2. Poll for the operational layer with small intervals
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const layer = findOperationalLayer(mapInst, targetTitle);
    if (layer) return layer;
    await new Promise(r => setTimeout(r, 250));
  }

  return findOperationalLayer(mapInst, targetTitle);
}

function findOperationalLayer(mapInst, targetTitle) {
  if (!mapInst) return null;
  let layer = null;
  const targetLower = targetTitle ? targetTitle.toLowerCase() : "";

  if (targetTitle) {
    if (mapInst.layers) {
      layer = mapInst.layers.find(l => 
        l.title === targetTitle || (l.title && l.title.toLowerCase() === targetLower)
      );
    }
    if (!layer && mapInst.allLayers) {
      layer = mapInst.allLayers.find(l =>
        l.title === targetTitle ||
        (l.title && l.title.toLowerCase() === targetLower) ||
        (l.url && l.url.toLowerCase().includes(targetLower))
      );
    }
  }
  // Auto-detect: if no matching title found, find the first FeatureLayer in the WebMap
  if (!layer && mapInst.allLayers) {
    layer = mapInst.allLayers.find(l => l.type === "feature");
  }
  if (!layer && mapInst.layers) {
    layer = mapInst.layers.find(l => l.type === "feature");
  }
  return layer;
}

function configureLayerPopup(layer) {
  if (!layer || layer.popupTemplate) return;
  layer.popupTemplate = {
    title: "{FullName}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          { fieldName: "FullName", label: "Full Name" },
          { fieldName: "Email", label: "Email" },
          { fieldName: "InputDate", label: "Input Date", format: { dateFormat: "short-date-short-time" } },
          { fieldName: "Shape__Area", label: "Calculated Area (sq m)", format: { places: 2, digitSeparator: true } },
          { fieldName: "Shape__Length", label: "Perimeter (m)", format: { places: 2, digitSeparator: true } },
          { fieldName: "OBJECTID", label: "Feature ID" }
        ]
      }
    ]
  };
}

export function getView() { return view; }
export function getMap() { return mapInstance; }
export function getOperationalLayer() { return operationalLayer; }
