/**
 * Map and View Initialization Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1
 * Supports both:
 * 1. Live ArcGIS Online Web Map consumption via Item ID
 * 2. Standalone / Offline mode with in-memory FeatureLayer (no account needed)
 */
import Map from "https://js.arcgis.com/5.1/@arcgis/core/Map.js";
import WebMap from "https://js.arcgis.com/5.1/@arcgis/core/WebMap.js";
import MapView from "https://js.arcgis.com/5.1/@arcgis/core/views/MapView.js";
import FeatureLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/FeatureLayer.js";
import Graphic from "https://js.arcgis.com/5.1/@arcgis/core/Graphic.js";

import { APP_CONFIG } from "./config.js?v=5.2";
import { isStandalone } from "./auth.js?v=5.2";

let mapInstance = null;
let view = null;
let operationalLayer = null;

/**
 * Initializes the Map and MapView
 * @param {string} containerId - DOM container ID
 * @returns {Promise<Object>} { webmap, map, view, operationalLayer }
 */
export async function initMap(containerId = "viewDiv") {
  if (APP_CONFIG.mode === "standalone" || isStandalone()) {
    console.info("[Map] Initializing in Standalone Mode (No account required)...");
    return initStandaloneMap(containerId);
  }

  try {
    console.info("[Map] Attempting to load ArcGIS Online Web Map Item ID:", APP_CONFIG.webMapId);

    mapInstance = new WebMap({
      portalItem: {
        id: APP_CONFIG.webMapId
      }
    });

    view = new MapView({
      container: containerId,
      map: mapInstance,
      highlightOptions: {
        color: [37, 99, 235, 1],
        fillOpacity: 0.35
      },
      popup: {
        dockEnabled: false,
        dockOptions: {
          buttonEnabled: true,
          breakpoint: false,
          position: "top-right"
        },
        defaultPopupTemplateEnabled: true
      }
    });

    await Promise.all([view.when(), mapInstance.when()]);
    operationalLayer = findOperationalLayer(mapInstance, APP_CONFIG.operationalLayerTitle);

    if (operationalLayer) {
      try {
        await operationalLayer.load();
        configureLayerPopup(operationalLayer);
      } catch (layerErr) {
        console.warn("[Map] Notice loading operational layer:", layerErr);
      }
    } else {
      console.warn("[Map] Operational layer not found in WebMap, creating layer fallback.");
      operationalLayer = createSampleFeatureLayer();
      mapInstance.add(operationalLayer);
    }

    return { webmap: mapInstance, map: mapInstance, view, operationalLayer };
  } catch (err) {
    console.warn("[Map] WebMap failed to load from ArcGIS Online, falling back to Standalone Mode:", err.message);
    return initStandaloneMap(containerId);
  }
}

/**
 * Initializes standalone map with client-side FeatureLayer
 */
async function initStandaloneMap(containerId) {
  mapInstance = new Map({
    basemap: "topo-vector" // Standard Esri public vector basemap (no auth needed)
  });

  operationalLayer = createSampleFeatureLayer();
  mapInstance.add(operationalLayer);

  view = new MapView({
    container: containerId,
    map: mapInstance,
    center: APP_CONFIG.initialCenter || [31.2357, 30.0444],
    zoom: APP_CONFIG.initialZoom || 13,
    highlightOptions: {
      color: [37, 99, 235, 1],
      fillOpacity: 0.35
    },
    popup: {
      dockEnabled: false,
      dockOptions: {
        buttonEnabled: true,
        breakpoint: false,
        position: "top-right"
      },
      defaultPopupTemplateEnabled: true
    }
  });

  await view.when();
  await operationalLayer.load();

  console.info("[Map] Standalone Map and FeatureLayer initialized successfully.");
  return { webmap: mapInstance, map: mapInstance, view, operationalLayer };
}

/**
 * Creates client-side FeatureLayer with identical schema and sample polygons
 */
function createSampleFeatureLayer() {
  // Initial sample polygon geometries and attributes (around Cairo area)
  const sampleFeatures = [
    new Graphic({
      geometry: {
        type: "polygon",
        rings: [
          [31.2200, 30.0400],
          [31.2300, 30.0400],
          [31.2300, 30.0480],
          [31.2200, 30.0480],
          [31.2200, 30.0400]
        ],
        spatialReference: { wkid: 4326 }
      },
      attributes: {
        OBJECTID: 1,
        FullName: "Ahmed Youssef (GIS Specialist)",
        Email: "ahmed.youssef@coresolutions.com",
        InputDate: Date.now() - 86400000 * 3,
        Shape__Area: 84250.0,
        Shape__Length: 1750.0
      }
    }),
    new Graphic({
      geometry: {
        type: "polygon",
        rings: [
          [31.2350, 30.0340],
          [31.2460, 30.0340],
          [31.2480, 30.0430],
          [31.2360, 30.0440],
          [31.2350, 30.0340]
        ],
        spatialReference: { wkid: 4326 }
      },
      attributes: {
        OBJECTID: 2,
        FullName: "Sarah Mohamed (Project Lead)",
        Email: "sarah.mohamed@coresolutions.com",
        InputDate: Date.now() - 86400000,
        Shape__Area: 109400.0,
        Shape__Length: 2120.0
      }
    })
  ];

  const layer = new FeatureLayer({
    title: "Sample_Layer",
    geometryType: "polygon",
    spatialReference: { wkid: 4326 },
    objectIdField: "OBJECTID",
    source: sampleFeatures,
    fields: [
      { name: "OBJECTID", type: "oid", alias: "OBJECTID" },
      { name: "FullName", type: "string", alias: "Full Name" },
      { name: "Email", type: "string", alias: "Email" },
      { name: "InputDate", type: "date", alias: "Input Date" },
      { name: "Shape__Area", type: "double", alias: "Area (sq m)" },
      { name: "Shape__Length", type: "double", alias: "Perimeter (m)" }
    ],
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [37, 99, 235, 0.25],
        outline: {
          color: [37, 99, 235, 1],
          width: 2
        }
      }
    },
    popupTemplate: {
      title: "{FullName}",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "FullName", label: "Full Name" },
            { fieldName: "Email", label: "Email" },
            { fieldName: "InputDate", label: "Input Date", format: { dateFormat: "short-date-short-time" } },
            { fieldName: "Shape__Area", label: "Area (sq m)", format: { places: 2, digitSeparator: true } },
            { fieldName: "Shape__Length", label: "Perimeter (m)", format: { places: 2, digitSeparator: true } },
            { fieldName: "OBJECTID", label: "Feature ID" }
          ]
        }
      ]
    }
  });

  return layer;
}

function findOperationalLayer(mapInst, targetTitle) {
  let layer = mapInst.layers.find(l => l.title === targetTitle);
  if (!layer && mapInst.allLayers) {
    layer = mapInst.allLayers.find(l =>
      l.title === targetTitle ||
      (l.url && l.url.toLowerCase().includes("sample_layer"))
    );
  }
  return layer;
}

function configureLayerPopup(layer) {
  if (!layer.popupTemplate) {
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
}

export function getView() { return view; }
export function getMap() { return mapInstance; }
export function getOperationalLayer() { return operationalLayer; }
