/**
 * Widgets Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1 — Web Components
 * All widgets are now declared as <arcgis-*> HTML components in index.html.
 * This module configures component behavior that requires JS (search sources,
 * measurement auto-start, print layer toggling, touch support).
 */

import { APP_CONFIG } from "./config.js?v=5.7";

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
  //    On mobile we need to ensure the expand open triggers proper view wiring.
  // ==========================================
  const sketchEl = document.getElementById("main-sketch");
  const sketchExpand = document.getElementById("sketch-expand");

  if (sketchEl) {
    await customElements.whenDefined("arcgis-sketch");

    const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      console.info("[Widgets] Touch device: configuring sketch widget for mobile.");

      // When the sketch expand opens, ensure the internal component is activated
      const activateSketch = (isExpanded) => {
        if (!isExpanded) return;
        setTimeout(() => {
          try {
            // Force a resize so the sketch widget re-measures against the current viewport
            if (typeof sketchEl.refresh === "function") sketchEl.refresh();

            // Ensure the sketch host element is interactive
            sketchEl.style.pointerEvents = "auto";
            sketchEl.style.touchAction = "manipulation";

            console.info("[Sketch] Sketch widget activated for mobile view.");
          } catch (e) {
            console.warn("[Sketch] Mobile activation notice:", e);
          }
        }, 300);
      };

      if (sketchExpand) {
        // Listen for arcgisPropertyChange (SDK v5 Web Components event)
        sketchExpand.addEventListener("arcgisPropertyChange", (evt) => {
          if (evt.detail && evt.detail.name === "expanded") {
            activateSketch(evt.detail.value);
          }
        });

        // MutationObserver fallback for attribute-based expand state
        const sketchObs = new MutationObserver(() => {
          const expanded = sketchExpand.expanded || sketchExpand.hasAttribute("expanded");
          activateSketch(expanded);
        });
        sketchObs.observe(sketchExpand, { attributes: true, attributeFilter: ["expanded"] });
      }
    }
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
  // 4. PRINT EXPAND — Hide operational layer while print widget is open
  // ==========================================
  const printExpand = document.getElementById("print-expand");
  if (printExpand && operationalLayer) {
    const updateVisibility = (isExpanded) => {
      const expanded = (typeof isExpanded === "boolean")
        ? isExpanded
        : Boolean(printExpand.expanded || printExpand.hasAttribute("expanded"));
      operationalLayer.visible = !expanded;
      console.info(`[Print] Print widget ${expanded ? "OPEN (layer hidden)" : "CLOSED (layer visible)"}`);
    };

    // 1. Listen for arcgisPropertyChange event on <arcgis-expand>
    printExpand.addEventListener("arcgisPropertyChange", (event) => {
      if (event.detail && event.detail.name === "expanded") {
        updateVisibility(event.detail.value);
      }
    });

    // 2. MutationObserver for 'expanded' HTML attribute changes
    const observer = new MutationObserver(() => {
      updateVisibility();
    });
    observer.observe(printExpand, { attributes: true, attributeFilter: ["expanded"] });

    // 3. reactiveUtils watch for robust property binding
    if (window.$arcgis && typeof window.$arcgis.import === "function") {
      window.$arcgis.import(["@arcgis/core/core/reactiveUtils.js"]).then(([reactiveUtils]) => {
        if (reactiveUtils && typeof reactiveUtils.watch === "function") {
          reactiveUtils.watch(
            () => printExpand.expanded,
            (expanded) => updateVisibility(expanded)
          );
        }
      }).catch(() => {});
    }
  }
  instances.printExpand = printExpand;

  // ==========================================
  // 5. MEASUREMENT — Touch / Mobile Support
  // ==========================================
  _setupMeasurementTouchSupport(view);

  console.info("[Widgets] All web component widgets configured successfully.");
  return instances;
}

/**
 * Sets up touch-friendly measurement widget behaviour.
 * On touch/mobile devices the SDK measurement widgets require a pointer-events
 * pass-through so that finger taps register on the map canvas.
 * We also listen for when each expand opens and immediately clear any previous
 * measurement so the user gets a fresh tool each time.
 */
function _setupMeasurementTouchSupport(view) {
  const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  if (isTouchDevice) {
    console.info("[Widgets] Touch device detected — configuring measurement touch support.");
  }

  const measurementPairs = [
    { expandId: "area-expand",     widgetId: "area-measurement" },
    { expandId: "distance-expand", widgetId: "distance-measurement" },
  ];

  measurementPairs.forEach(({ expandId, widgetId }) => {
    const expandEl = document.getElementById(expandId);
    const widgetEl = document.getElementById(widgetId);
    if (!expandEl || !widgetEl) return;

    // When the expand opens, clear stale measurement and ensure view is linked
    const handleExpand = (isExpanded) => {
      if (!isExpanded) return;

      // Give the component time to render before clearing/activating
      setTimeout(() => {
        try {
          // Clear any previous measurement so user starts fresh
          if (typeof widgetEl.clear === "function") {
            widgetEl.clear();
          }

          // On touch devices, pass touch events through to the map canvas
          if (isTouchDevice) {
            _enableTouchOnMeasurementWidget(widgetEl);
          }
        } catch (e) {
          console.warn(`[Widgets] Measurement widget setup notice (${widgetId}):`, e);
        }
      }, 200);
    };

    // Listen for expand property change
    expandEl.addEventListener("arcgisPropertyChange", (event) => {
      if (event.detail && event.detail.name === "expanded") {
        handleExpand(event.detail.value);
      }
    });

    // MutationObserver fallback
    const obs = new MutationObserver(() => {
      const isExpanded = expandEl.expanded || expandEl.hasAttribute("expanded");
      handleExpand(isExpanded);
    });
    obs.observe(expandEl, { attributes: true, attributeFilter: ["expanded"] });
  });
}

/**
 * Ensures touch events on the measurement widget's SVG/canvas panel bubble
 * through to the ArcGIS MapView canvas, which requires touch-action:none on
 * specific inner elements so the browser does not swallow them as scroll/pan.
 */
function _enableTouchOnMeasurementWidget(widgetEl) {
  // Set touch-action on the widget host
  widgetEl.style.touchAction = "none";

  // Walk into shadow DOM if accessible (best-effort)
  if (widgetEl.shadowRoot) {
    const inner = widgetEl.shadowRoot.querySelectorAll(
      ".esri-area-measurement-2d, .esri-distance-measurement-2d, " +
      ".esri-measurement, [role='presentation'], .esri-widget"
    );
    inner.forEach(el => {
      el.style.touchAction = "none";
    });
  }
}

export function getInstances() { return instances; }
export function getSketchLayer() { return sketchLayer; }
