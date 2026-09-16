/**
 * Widgets Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1
 * Configures all Mandatory and Bonus Widgets
 */
import Home from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Home.js";
import Zoom from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Zoom.js";
import ScaleBar from "https://js.arcgis.com/5.1/@arcgis/core/widgets/ScaleBar.js";
import LayerList from "https://js.arcgis.com/5.1/@arcgis/core/widgets/LayerList.js";
import Legend from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Legend.js";
import BasemapGallery from "https://js.arcgis.com/5.1/@arcgis/core/widgets/BasemapGallery.js";
import Search from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Search.js";
import Expand from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Expand.js";
import Compass from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Compass.js";
import Locate from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Locate.js";
import Fullscreen from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Fullscreen.js";
import Measurement from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Measurement.js";
import AreaMeasurement2D from "https://js.arcgis.com/5.1/@arcgis/core/widgets/AreaMeasurement2D.js";
import DistanceMeasurement2D from "https://js.arcgis.com/5.1/@arcgis/core/widgets/DistanceMeasurement2D.js";
import Sketch from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Sketch.js";
import Print from "https://js.arcgis.com/5.1/@arcgis/core/widgets/Print.js";
import GraphicsLayer from "https://js.arcgis.com/5.1/@arcgis/core/layers/GraphicsLayer.js";

import { APP_CONFIG } from "./config.js?v=5.2";

let instances = {};
let sketchLayer = null;

/**
 * Initializes all mandatory and bonus widgets
 * @param {Object} mapContext - { view, webmap, operationalLayer }
 */
export async function initWidgets(mapContext) {
  const { view, webmap, operationalLayer } = mapContext;

  console.info("[Widgets] Initializing Map Widgets (Mandatory & Bonus)...");

  // ==========================================
  // 1. MANDATORY WIDGETS
  // ==========================================

  // 1.1 Zoom Widget (Mandatory)
  // Explicit zoom in/out controls, correctly positioned
  const zoomWidget = new Zoom({
    view: view
  });
  view.ui.add(zoomWidget, "top-left");
  instances.zoom = zoomWidget;

  // 1.2 Home Widget (Mandatory)
  // Returns view to web map's initial extent
  const homeWidget = new Home({
    view: view
  });
  view.ui.add(homeWidget, "top-left");
  instances.home = homeWidget;

  // 1.2 ScaleBar Widget (Mandatory)
  // Visible always with correct units (dual: metric & imperial)
  const scaleBarWidget = new ScaleBar({
    view: view,
    unit: "dual",
    style: "line"
  });
  view.ui.add(scaleBarWidget, "bottom-left");
  instances.scaleBar = scaleBarWidget;

  // 1.3 Search Widget (Mandatory)
  // Search against layers in web map (not just world geocoding).
  // Selecting result zooms/pans to feature and opens popup.
  const searchSources = [];

  if (operationalLayer) {
    searchSources.push({
      layer: operationalLayer,
      searchFields: ["FullName", "Email", "OBJECTID"],
      displayField: "FullName",
      exactMatch: false,
      outFields: ["*"],
      name: operationalLayer.title || "Sample Layer Features",
      placeholder: "Search features (Name, Email)...",
      suggestionTemplate: "{FullName} ({Email})",
      zoomScale: 25000
    });
  }

  const searchWidget = new Search({
    view: view,
    sources: searchSources,
    includeDefaultSources: true, // Also includes World Geocoding Service as fallback
    allPlaceholder: "Search features or locations...",
    locationEnabled: true,
    autoSelect: true,
    popupEnabled: true  // Opens popup when result is selected (requirement)
  });

  // When a search result is selected → zoom to feature and open its popup
  searchWidget.on("select-result", (event) => {
    if (event.result && event.result.feature) {
      view.popup.open({
        features: [event.result.feature],
        updateLocationEnabled: true
      });
    }
  });

  // Embed Search in top-right
  view.ui.add(searchWidget, {
    position: "top-right",
    index: 0
  });
  instances.search = searchWidget;

  // 1.4 LayerList Widget (Mandatory)
  // List all operational layers with visibility toggles and built-in legend
  const layerListWidget = new LayerList({
    view: view,
    listItemCreatedFunction: function (event) {
      const item = event.item;
      item.panel = {
        content: "legend",
        open: false
      };
    }
  });

  const layerListExpand = new Expand({
    view: view,
    content: layerListWidget,
    expandIcon: "layers",
    expandTooltip: "Layer List & Visibility",
    group: "top-right"
  });
  view.ui.add(layerListExpand, {
    position: "top-right",
    index: 1
  });
  instances.layerList = layerListWidget;
  instances.layerListExpand = layerListExpand;

  // 1.5 Legend Widget (Mandatory)
  // Reflects current layer symbology and updates dynamically as layers toggle
  const legendWidget = new Legend({
    view: view,
    style: "classic"
  });

  const legendExpand = new Expand({
    view: view,
    content: legendWidget,
    expandIcon: "legend",
    expandTooltip: "Map Legend",
    group: "top-right"
  });
  view.ui.add(legendExpand, {
    position: "top-right",
    index: 2
  });
  instances.legend = legendWidget;
  instances.legendExpand = legendExpand;

  // 1.6 BasemapGallery Widget (Mandatory)
  // Switch between at least 3 basemaps (Esri standard basemaps included)
  const basemapGallery = new BasemapGallery({
    view: view
  });

  const basemapExpand = new Expand({
    view: view,
    content: basemapGallery,
    expandIcon: "basemap",
    expandTooltip: "Basemap Gallery",
    group: "top-right"
  });
  view.ui.add(basemapExpand, {
    position: "top-right",
    index: 3
  });
  instances.basemapGallery = basemapGallery;
  instances.basemapExpand = basemapExpand;

  // ==========================================
  // 2. BONUS WIDGETS
  // ==========================================

  // 2.1 Compass Widget (Bonus)
  // Resets map rotation to North
  const compassWidget = new Compass({
    view: view
  });
  view.ui.add(compassWidget, "top-left");
  instances.compass = compassWidget;

  // 2.2 Locate Widget (Bonus)
  // Centers on user's current geolocation
  const locateWidget = new Locate({
    view: view,
    useHeadingEnabled: false
  });
  view.ui.add(locateWidget, "top-left");
  instances.locate = locateWidget;

  // 2.3 Fullscreen Widget (Bonus)
  // Toggles full-screen browser mode
  const fullscreenWidget = new Fullscreen({
    view: view
  });
  view.ui.add(fullscreenWidget, "top-left");
  instances.fullscreen = fullscreenWidget;

  // 2.4 Area Measurement 2D Widget (Bonus)
  const areaMeasurementWidget = new AreaMeasurement2D({
    view: view
  });

  const areaExpand = new Expand({
    view: view,
    content: areaMeasurementWidget,
    expandIcon: "measure-area",
    expandTooltip: "Area Measurement",
    group: "top-right"
  });

  areaExpand.watch("expanded", (expanded) => {
    if (expanded) {
      if (areaMeasurementWidget.viewModel) areaMeasurementWidget.viewModel.start();
    } else {
      if (areaMeasurementWidget.viewModel) areaMeasurementWidget.viewModel.clear();
    }
  });

  view.ui.add(areaExpand, {
    position: "top-right",
    index: 4
  });
  instances.areaMeasurement = areaMeasurementWidget;
  instances.areaExpand = areaExpand;

  // 2.5 Distance Measurement 2D Widget (Bonus)
  const distanceMeasurementWidget = new DistanceMeasurement2D({
    view: view
  });

  const distanceExpand = new Expand({
    view: view,
    content: distanceMeasurementWidget,
    expandIcon: "measure-line",
    expandTooltip: "Distance Measurement",
    group: "top-right"
  });

  distanceExpand.watch("expanded", (expanded) => {
    if (expanded) {
      if (distanceMeasurementWidget.viewModel) distanceMeasurementWidget.viewModel.start();
    } else {
      if (distanceMeasurementWidget.viewModel) distanceMeasurementWidget.viewModel.clear();
    }
  });

  view.ui.add(distanceExpand, {
    position: "top-right",
    index: 5
  });
  instances.distanceMeasurement = distanceMeasurementWidget;
  instances.distanceExpand = distanceExpand;

  // 2.6 Sketch / Graphics Layer Widget (Bonus)
  // User can add/edit simple graphics (point, line, polygon) as a sketch layer
  sketchLayer = new GraphicsLayer({
    title: "Interactive Sketch Layer",
    listMode: "show"
  });
  webmap.add(sketchLayer);

  const sketchWidget = new Sketch({
    layer: sketchLayer,
    view: view,
    creationMode: "update",
    availableCreateTools: ["point", "polyline", "polygon", "rectangle", "circle"]
  });

  const sketchExpand = new Expand({
    view: view,
    content: sketchWidget,
    expandIcon: "edit-attributes",
    expandTooltip: "Sketch Graphics (Bonus)",
    group: "top-right"
  });
  view.ui.add(sketchExpand, {
    position: "top-right",
    index: 6
  });
  instances.sketch = sketchWidget;
  instances.sketchLayer = sketchLayer;
  instances.sketchExpand = sketchExpand;

 // 2.7 Print Widget (Bonus)
  // Uses an ArcGIS Server print service (public/sample) to export the current view to PDF
  try {
    const printWidget = new Print({
      view: view,
      printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
      templateOptions: {
        format: "pdf",
        layout: "map-only",
        exportOptions: {
          width: 800,
          height: 1100,
          dpi: 96
        },
        layoutOptions: {
          titleText: "My Custom Map",
          authorText: "Ahmed Yasser",
          copyrightText: "Ahmed Yasser"
        }
      }
    });

    const printExpand = new Expand({
      view: view,
      content: printWidget,
      expandIcon: "print",
      expandTooltip: "Export / Print to PDF",
      group: "top-right"
    });

    // The public sample print service can't authenticate against private
    // feature services, so temporarily drop the private operational layer
    // from the map while the print panel is open, then restore it after.
    printExpand.watch("expanded", (expanded) => {
      if (!operationalLayer) return;
      if (expanded) {
        if (webmap.layers.includes(operationalLayer)) {
          webmap.remove(operationalLayer);
        }
      } else {
        if (!webmap.layers.includes(operationalLayer)) {
          webmap.add(operationalLayer);
        }
      }
    });

    view.ui.add(printExpand, {
      position: "top-right",
      index: 7
    });

    instances.print = printWidget;
    instances.printExpand = printExpand;
  } catch (printErr) {
    console.warn("[Widgets] Print widget initialization notice:", printErr);
  }     
  console.info("[Widgets] All widgets successfully registered on MapView.");
  return instances;     
}

export function getInstances() { return instances; }
export function getSketchLayer() { return sketchLayer; }
