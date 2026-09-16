# GIS Front-End Developer — Take-Home Technical Assessment

A single-page Web GIS viewer built with the **ArcGIS Maps SDK for JavaScript v5.1**, consuming the supplied Web Map (Item ID `16ffde90eb6e4432ba2b81da63637ba0`) and exposing its content through the mandatory and bonus widget set defined in the assessment brief. Features a custom feature editor powered by `applyEdits()` (no out-of-the-box Editor widget), interactive 2D measurement tools, full layer management, and operational feature tabular analysis.

---

## 🔗 Live Demo & Repository

- **Live deployed link**: `<add GitHub Pages / hosting URL here>`
- **Source code repository**: `https://github.com/ahmedy1902/CoreSolutionsProject`

---

## 🚀 Quick Start & Run Instructions

### Technical Choice: CDN vs npm
Per the assessment's technical constraints, the SDK is loaded via **CDN as ES Modules (ESM)** directly from `https://js.arcgis.com/5.1/`, rather than via npm/bundler. No other frameworks or external APIs are used — only the ArcGIS Maps SDK for JavaScript (Core API).

### Prerequisites
No complex build tools or `npm install` required! The application uses standard ES Modules (ESM) loaded directly from Esri's official CDN, so it runs entirely client-side as static HTML/CSS/JS.

### How to Run Locally

1. **Clone or Extract Project Files**
   Ensure all files are placed in a web root directory.

2. **Start a Local Web Server**
   You can use any static local web server. Options include:
   - **Python** (built-in):
     ```bash
     python -m http.server 8085
     ```
   - **Node.js `serve`**:
     ```bash
     npx serve -p 8085
     ```
   - **VS Code**: Right-click `index.html` and choose **"Open with Live Server"**.

3. **Open in Browser**
   Navigate to `http://localhost:8085/` in Chrome, Firefox, Edge, or Safari.

---

## ✅ Completed Widgets & Features

| Status | Widget / Feature | Description | Reference / Implementation |
|---|---|---|---|
| **Mandatory** | **2D MapView & Web Map** | Loads Web Map Item ID `16ffde90eb6e4432ba2b81da63637ba0` in a full viewport. | `js/map.js` |
| **Mandatory** | **Search Widget** | Searches operational layer features (`FullName`, `Email`, `OBJECTID`) + World Geocoding. Auto-zooms & opens popup. | `js/widgets.js` |
| **Mandatory** | **Default Popup** | Esri's default popup UI works out of the box for the operational layer (no custom popup rebuild); triggered by feature click and by Search result selection. | `js/map.js` |
| **Mandatory** | **Custom Feature Editor** | **Custom `applyEdits()` Editor** using `FeatureForm`, `FeatureTemplates`, and `SketchViewModel`. User can **Add, Update, or Delete** polygon features. Includes prominent **Cancel Add** buttons (header, panel, floating pill) and `ESC` shortcut. | `js/customEditor.js` |
| **Mandatory** | **LayerList Widget** | Lists operational layers with visibility toggles and built-in panel legend. | `js/widgets.js` |
| **Mandatory** | **Legend Widget** | Reflects current layer symbology and updates dynamically as layers toggle. | `js/widgets.js` |
| **Mandatory** | **BasemapGallery Widget** | Switch between Esri basemaps (Topographic, Streets, Imagery, Navigation, Dark Gray, etc.). | `js/widgets.js` |
| **Mandatory** | **Home Widget** | Restores view to initial Web Map extent. | `js/widgets.js` |
| **Mandatory** | **Zoom Widget** | Explicit zoom in and zoom out map controls. | `js/widgets.js` |
| **Mandatory** | **ScaleBar Widget** | Dual metric & imperial dynamic scale bar. | `js/widgets.js` |
| **Bonus** | **2D Area Measurement** | Interactive `AreaMeasurement2D` widget inside `Expand`. Auto-starts on open and clears on collapse. | `js/widgets.js` |
| **Bonus** | **2D Distance Measurement** | Interactive `DistanceMeasurement2D` widget inside `Expand`. Auto-starts on open and clears on collapse. | `js/widgets.js` |
| **Bonus** | **Print / Export to PDF** | Exports the current map view (basemap + sketch graphics) to PDF/PNG via Esri's public sample `PrintingTools` GP service. The private operational layer is temporarily removed from the map while the print panel is open, since the public service cannot authenticate against it — see [Known Issues](#-known-issues--future-improvements). | `js/widgets.js` |
| **Bonus** | **Interactive Sketch** | Allows drawing custom graphics (points, lines, polygons) on a dedicated sketch layer. | `js/widgets.js` |
| **Bonus** | **Locate Widget** | Geolocates user's current GPS position on the map. | `js/widgets.js` |
| **Bonus** | **Compass Widget** | Indicates map orientation and rotates back to North. | `js/widgets.js` |
| **Bonus** | **Fullscreen Widget** | Toggles full-screen browser mode. | `js/widgets.js` |
| **Bonus** | **Operational Data Table** | Bottom drawer displaying all layer features in a responsive table with Zoom, Edit, and Delete actions. | `index.html` & `js/customEditor.js` |
| **Bonus** | **OAuth 2.0 Auth & Fallback** | Obtains OAuth 2.0 app token using Client ID/Secret with automatic standalone fallback if offline. | `js/auth.js` |

---

## 💡 Assumptions Made

1. **SDK Version & Loading**: Built against **ArcGIS Maps SDK for JavaScript v5.1**, loaded via CDN as ES Modules (`@arcgis/core` import paths from `js.arcgis.com`) rather than npm, per the "state your choice in the README" constraint.
2. **Authentication**: The Web Map is authenticated against ArcGIS Online using the supplied OAuth 2.0 Client ID/Secret (`js/auth.js`), with automatic fallback to Standalone Mode if the app token request fails or the network is unavailable.
4. **Layer Schema**: Target operational layer (`Sample_Layer`) contains polygon geometries with fields: `OBJECTID` (OID), `FullName` (String), `Email` (String), `InputDate` (Date), `Shape__Area` (Double), `Shape__Length` (Double).
5. **Resilience & Standalone Mode**: If WebMap `16ffde90eb6e4432ba2b81da63637ba0` fails to load from ArcGIS Online (due to network/CORS/permissions), the app seamlessly falls back to Standalone Mode with an in-memory `FeatureLayer` so all widgets, editing operations, and feature table operations remain 100% functional.
6. **Editor Workflow**: Per requirement, the out-of-the-box `Editor` widget is **NOT** used; full CRUD is implemented via SDK functions (`applyEdits()`, `SketchViewModel`, `FeatureForm`).
7. **Print Scope**: Per the assessment requirement ("a public/sample [print service] is acceptable"), the public Esri `PrintingTools` utility service is used as-is rather than standing up a dedicated Enterprise print service. Because that public service makes an anonymous, unauthenticated request back to whatever feature service is in the exported web map, it cannot render a **private** operational layer — see below.

---

## 🛠️ Known Issues & Future Improvements

- **Print Service and Private Layers**: The Print widget uses Esri's public `PrintingTools` utility service (`utility.arcgisonline.com`). This service exports a web map by making its own server-side request back to each layer's REST endpoint, with no credentials attached. If the operational layer (`Sample_Layer`) is not shared publicly, that request is rejected and the export fails with:
  ```
  Failed to create layer from service at .../Sample_Layer/FeatureServer/0
  ```
  **Current workaround**: the app temporarily removes the private operational layer from the map for the duration of the print panel being open, then restores it on close. This lets the public service successfully export the basemap and any sketch graphics, at the cost of not including the operational layer's features in the printed output.

  **Production recommendation**: for a deployment where operational data (e.g. Ministry of Awqaf records) must appear in printed output, replace `printServiceUrl` in `js/widgets.js` with a print/export GP service hosted on the organization's own **federated ArcGIS Enterprise** portal. A Print service running inside the same Enterprise as the operational layer can access it directly without the public-sharing requirement, and doesn't depend on the continued availability of Esri's public sample endpoint.

- **Things to Improve with More Time**:
  - Implement spatial query filtering (e.g., query features within a drawn spatial extent).
  - Replace the public print service with an Enterprise-hosted one so private layers print correctly without removal.

---

## 📚 Official Esri Documentation & Sample References

- **Measurement 2D**: [Esri Sample - 2D Measurement](https://developers.arcgis.com/javascript/latest/sample-code/measurement-2d/)
- **Print Component**: [Esri Reference - arcgis-print](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-print/)
- **PrintTemplate**: [Esri Reference - PrintTemplate](https://developers.arcgis.com/javascript/latest/api-reference/esri-rest-support-PrintTemplate.html)
- **FeatureLayer Editing (`applyEdits`)**: [Esri Sample - Editing applyEdits](https://developers.arcgis.com/javascript/latest/sample-code/editing-applyedits/)
- **OAuth 2.0 Access Tokens**: [Esri Documentation - Access Tokens](https://developers.arcgis.com/javascript/latest/authentication/access-tokens/)
- **FeatureLayerView Queries**: [Esri Sample - FeatureLayerView Query](https://developers.arcgis.com/javascript/latest/sample-code/featurelayerview-query/)
- **SketchViewModel**: [Esri Sample - Sketch Widget](https://developers.arcgis.com/javascript/latest/sample-code/sketch/)
- **LayerList & Legend**: [Esri Sample - LayerList & Legend](https://developers.arcgis.com/javascript/latest/sample-code/widgets-layerlist-legend/)
- **BasemapGallery**: [Esri Sample - Basemap Gallery](https://developers.arcgis.com/javascript/latest/sample-code/basemap-gallery/)
- **Home Component**: [Esri Reference - arcgis-home](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-home/)
- **Zoom Component**: [Esri Reference - arcgis-zoom](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-zoom/)
- **ScaleBar Component**: [Esri Reference - arcgis-scale-bar](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-scale-bar/)
- **Popup Component**: [Esri Reference - arcgis-popup](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-popup/)
- **Locate Widget**: [Esri Sample - Locate Widget](https://developers.arcgis.com/javascript/latest/sample-code/locate/)
- **Fullscreen Component**: [Esri Reference - arcgis-fullscreen](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-fullscreen/)