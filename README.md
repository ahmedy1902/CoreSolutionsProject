# GIS Front-End Developer — Take-Home Technical Assessment

A high-performance, responsive single-page Web GIS application built with the **ArcGIS Maps SDK for JavaScript v5.1** (utilizing official Web Components) consuming the target Web Map (Item ID `16ffde90eb6e4432ba2b81da63637ba0`). It exposes all mandatory and bonus capabilities defined in the assessment brief, including a fully custom feature editor powered by `applyEdits()` (strictly without the out-of-the-box `Editor` widget), 2D measurement tools, operational feature table drawer, layer and legend management, dynamic dark/light theme switching, and secure OAuth 2.0 authentication.

---

## 🔗 Live Demo & Repository

- **Live Deployed URL**: `https://ahmedy1902.github.io/CoreSolutionsProject/`
- **Source Code Repository**: `https://github.com/ahmedy1902/CoreSolutionsProject`

> **🔐 Note for Evaluators on Authentication & Credentials**:
> To follow cybersecurity best practices and prevent sensitive OAuth credentials from being leaked in a public GitHub repository, credentials are **not** hardcoded in git-tracked files.
> 
> When opening the application:
> 1. A **Connection Settings Modal** will automatically prompt for credentials on first launch.
> 2. Enter the assessment credentials provided in the brief:
>    - **Portal URL**: `https://www.arcgis.com`
>    - **Web Map Item ID**: `16ffde90eb6e4432ba2b81da63637ba0`
>    - **Client ID**: *(Enter your assessment Client ID)*
>    - **Client Secret**: *(Enter your assessment Client Secret)*
> 3. Click **"Connect & Load Web Map"**.
> 4. You may select **"Remember credentials on this browser"** to store them in your local browser storage (`localStorage` / `sessionStorage`) for convenience during evaluation.
> 5. Credentials can be edited or cleared at any time via the **"Connection Settings"** button in the application header.

---

## 🚀 Quick Start & Run Instructions

### Technical Choice: CDN vs npm
Per the assessment's technical constraints, the SDK is loaded via **CDN as ES Modules (ESM)** directly from `https://js.arcgis.com/5.1/`, rather than via npm/bundler. No external build steps or heavy frameworks are required — the application leverages native Web Components (`<arcgis-map>`, `<arcgis-search>`, `<arcgis-legend>`, `<arcgis-layer-list>`, `<arcgis-basemap-gallery>`, `<arcgis-print>`, `<arcgis-expand>`, etc.) alongside vanilla JavaScript and CSS.

Dynamic module loading uses `window.$arcgis.import(...)` to guarantee single-realm prototype consistency across the SDK and Web Components.

### Prerequisites
No `npm install` or compilation is required. Any modern browser (Chrome, Edge, Firefox, Safari) and a simple local HTTP server can run the application.

### How to Run Locally

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ahmedy1902/CoreSolutionsProject.git
   cd CoreSolutionsProject
   ```

2. *(Optional)* **Configure Local Dev Credentials**
   To skip entering credentials in the modal on every session, create a file named `js/config.local.js` (which is already included in `.gitignore`):
   ```javascript
   export const LOCAL_CONFIG = {
     clientId: "YOUR_CLIENT_ID",
     clientSecret: "YOUR_CLIENT_SECRET",
     portalUrl: "https://www.arcgis.com",
     webMapId: "16ffde90eb6e4432ba2b81da63637ba0"
   };
   ```

3. **Start a Local Web Server**
   Run any static web server in the project root:
   - **Python** (built-in):
     ```bash
     python -m http.server 8085
     ```
   - **Node.js**:
     ```bash
     npx serve -p 8085
     ```
   - **VS Code**: Right-click `index.html` and click **"Open with Live Server"**.

4. **Open in Browser**
   Navigate to `http://localhost:8085/`.

---

## ✅ Completed Widgets & Features

| Status | Widget / Feature | Description | Implementation File |
|---|---|---|---|
| **Mandatory** | **2D Map & Web Map** | Loads Web Map Item ID `16ffde90eb6e4432ba2b81da63637ba0` using the `<arcgis-map>` component. | `index.html` & `js/map.js` |
| **Mandatory** | **Search Widget** | Searches operational layer features (`FullName`, `Email`, `OBJECTID`) + World Geocoding with auto-zoom and popup display. | `js/widgets.js` |
| **Mandatory** | **Default Popup** | Default Esri popup integration for the operational feature layer, triggered by feature selection or search result. | `js/map.js` |
| **Mandatory** | **Custom Feature Editor** | **Custom `applyEdits()` Editor** built with `FeatureForm`, `FeatureTemplates`, and `SketchViewModel` (no out-of-the-box `Editor` widget). Supports full **Create, Update (attributes & geometry vertices), and Delete** for polygon features. Features auto-expanding panel, clear cancel buttons (header, panel, floating pill), and `ESC` shortcut. | `js/customEditor.js` |
| **Mandatory** | **LayerList Widget** | `<arcgis-layer-list>` component inside an expand panel with operational layer toggles and embedded legend support. | `index.html` & `js/widgets.js` |
| **Mandatory** | **Legend Widget** | `<arcgis-legend>` component dynamically reflecting active layer symbology. | `index.html` & `js/widgets.js` |
| **Mandatory** | **BasemapGallery Widget** | `<arcgis-basemap-gallery>` component supporting switching between Esri basemaps. | `index.html` & `js/widgets.js` |
| **Mandatory** | **Home Widget** | `<arcgis-home>` component resetting map view to initial extent. | `index.html` |
| **Mandatory** | **Zoom Widget** | `<arcgis-zoom>` component with explicit zoom-in and zoom-out buttons. | `index.html` |
| **Mandatory** | **ScaleBar Widget** | `<arcgis-scale-bar>` component with dual metric and imperial scale units. | `index.html` |
| **Bonus** | **2D Area Measurement** | Interactive `AreaMeasurement2D` widget inside `Expand`. Auto-activates on open and clears on collapse. | `js/widgets.js` |
| **Bonus** | **2D Distance Measurement** | Interactive `DistanceMeasurement2D` widget inside `Expand`. Auto-activates on open and clears on collapse. | `js/widgets.js` |
| **Bonus** | **Print / Export to PDF** | `<arcgis-print>` Web Component inside `<arcgis-expand>`. Automatically hides the private operational layer (`operationalLayer.visible = false`) while the print panel is expanded to prevent unauthenticated server errors with the public sample print service, and restores it on panel collapse. | `index.html` & `js/widgets.js` |
| **Bonus** | **Interactive Sketch** | Allows freehand drawing of custom graphics (points, polylines, polygons, rectangles, circles) on a dedicated graphics layer. | `js/widgets.js` |
| **Bonus** | **Locate Widget** | Geolocates and tracks user's current GPS location on the map. | `js/widgets.js` |
| **Bonus** | **Compass Widget** | Displays map orientation and resets heading to North on click. | `js/widgets.js` |
| **Bonus** | **Fullscreen Widget** | `<arcgis-fullscreen>` component toggling browser fullscreen mode. | `index.html` |
| **Bonus** | **Operational Data Table** | Collapsible bottom drawer displaying all layer features in an interactive table with Zoom, Edit, and Delete actions. | `index.html` & `js/customEditor.js` |
| **Bonus** | **OAuth 2.0 Authentication** | Authenticates against ArcGIS Online via OAuth 2.0 Client Credentials flow (`client_credentials`), registering tokens into both the JS API and Web Component `IdentityManager`. | `js/auth.js` & `js/config.js` |
| **Bonus** | **Dynamic Dark / Light Theme** | Synchronized theme switcher toggling Calcite UI modes (`calcite-mode-dark` / `calcite-mode-light`), Esri SDK theme stylesheets (`dark/main.css` / `light/main.css`), and customized CSS variables with optimal contrast. | `js/app.js` & `css/editor.css` |

---

## 💡 Architecture & Key Decisions

1. **SDK Version & Loading Strategy**:
   - Built with **ArcGIS Maps SDK for JavaScript v5.1**.
   - Components loaded directly via ESM from `https://js.arcgis.com/5.1/`.
   - To avoid cross-realm prototype conflicts between npm modules and CDN Web Components (such as `#add() The item being added is not a Layer`), modules are loaded dynamically via `window.$arcgis.import(...)`.

2. **Strict Authentication & Security**:
   - Access strictly requires valid OAuth 2.0 credentials for the specified ArcGIS Online Web Map.
   - Credentials are not committed to source control; they are managed through the UI Connection Settings modal or local `.gitignore` configuration.
   - Dual registration of acquired OAuth tokens in `IdentityManager` ensures both legacy SDK classes and modern Web Components can access secured services.

3. **Custom Feature Editor (No Out-of-the-Box Widget)**:
   - Full CRUD capability is implemented cleanly using SDK primitives:
     - `applyEdits({ addFeatures, updateFeatures, deleteFeatures })` on the operational `FeatureLayer`.
     - `SketchViewModel` for geometry creation and vertex editing.
     - `FeatureForm` and `FeatureTemplates` for attribute editing and schema-aware templates.
   - Fluid UX: Opening feature templates or clicking existing features expands the editor panel automatically.
   - Comprehensive cancellation paths: Cancel buttons in the header, inside the form panel, a floating cancellation pill during sketch, and keyboard `ESC` handling.

4. **Print Service Handling**:
   - Per the assessment instructions ("a public/sample [print service] is acceptable"), Esri's public `PrintingTools` utility service is utilized.
   - Because Esri's public utility service cannot make authenticated requests to private ArcGIS Online layers, the app automatically toggles `operationalLayer.visible = false` when the Print panel is opened, enabling seamless basemap and sketch export without errors. Upon closing the print panel, operational layer visibility is instantly restored.

5. **Theme Synchronization & Accessibility**:
   - Switching between Dark and Light mode toggles Calcite design tokens, Esri map stylesheets, and custom CSS variables simultaneously.
   - Form controls, tables, instructions, and headers maintain high WCAG-compliant contrast ratios across both modes.

---

## 🛠️ Known Limitations & Future Enhancements

- **Print Service with Private Operational Data**:
  - *Limitation*: The public `PrintingTools` GP service cannot access non-public feature services without an unauthenticated HTTP error.
  - *Implemented Mitigation*: The layer is temporarily hidden while the print panel is expanded, allowing the basemap and sketch drawings to export cleanly.
  - *Future Enhancement*: In an enterprise deployment, point the Print widget to a federated ArcGIS Enterprise print service that shares authentication with the feature service to export private operational data directly.

- **Additional Future Enhancements**:
  - Add spatial and attribute query filtering (e.g. filter features by drawn bounding box or attribute query expressions).
  - Add offline caching using Service Workers and IndexedDB for disconnected workflows.

---

## 📚 Official Esri Documentation & References

- **ArcGIS Maps SDK v5.1 Web Components**: [Esri Web Components Overview](https://developers.arcgis.com/javascript/latest/references/map-components/)
- **FeatureLayer Editing (`applyEdits`)**: [Esri Sample - Editing applyEdits](https://developers.arcgis.com/javascript/latest/sample-code/editing-applyedits/)
- **SketchViewModel**: [Esri Sample - Sketch Widget](https://developers.arcgis.com/javascript/latest/sample-code/sketch/)
- **FeatureForm**: [Esri Reference - FeatureForm](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-FeatureForm.html)
- **OAuth 2.0 Access Tokens**: [Esri Documentation - Access Tokens](https://developers.arcgis.com/javascript/latest/authentication/access-tokens/)
- **2D Measurement**: [Esri Sample - 2D Measurement](https://developers.arcgis.com/javascript/latest/sample-code/measurement-2d/)
- **Print Component**: [Esri Reference - arcgis-print](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-print/)
- **LayerList & Legend**: [Esri Sample - LayerList & Legend](https://developers.arcgis.com/javascript/latest/sample-code/widgets-layerlist-legend/)
- **BasemapGallery**: [Esri Sample - Basemap Gallery](https://developers.arcgis.com/javascript/latest/sample-code/basemap-gallery/)
- **Locate Widget**: [Esri Sample - Locate Widget](https://developers.arcgis.com/javascript/latest/sample-code/locate/)
- **Fullscreen Component**: [Esri Reference - arcgis-fullscreen](https://developers.arcgis.com/javascript/latest/references/map-components/components/arcgis-fullscreen/)