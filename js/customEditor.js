/**
 * Custom Feature Layer Editor Module (ESM)
 * ArcGIS Maps SDK for JavaScript v5.1
 *
 * Based on the official "Update FeatureLayer using applyEdits()" sample pattern.
 * Adapted for POLYGON geometry with SketchViewModel for drawing/reshaping.
 *
 * Uses: FeatureForm, FeatureTemplates, SketchViewModel, applyEdits()
 * Layer fields: FullName (String), Email (String), InputDate (Date)
 * Geometry: esriGeometryPolygon
 */

// Module references dynamically loaded via $arcgis.import to ensure 100% same-realm compatibility
let SketchViewModel = null;
let GraphicsLayer = null;
let Graphic = null;
let FeatureForm = null;
let FeatureTemplates = null;
let Extent = null;

// Module-level state
let viewInstance = null;
let featureLayer = null;
let sketchVM = null;
let sketchLayer = null;
let featureForm = null;

let editFeature = null;
let highlight = null;
let isAddingNew = false;

/**
 * Loads Esri modules from the Web Component bundle to avoid prototype / instanceof cross-realm issues
 */
async function loadEsriModules() {
  if (SketchViewModel && GraphicsLayer && Graphic) return;

  if (window.$arcgis && typeof window.$arcgis.import === "function") {
    [GraphicsLayer, SketchViewModel, Graphic, FeatureForm, FeatureTemplates, Extent] = await window.$arcgis.import([
      "@arcgis/core/layers/GraphicsLayer.js",
      "@arcgis/core/widgets/Sketch/SketchViewModel.js",
      "@arcgis/core/Graphic.js",
      "@arcgis/core/widgets/FeatureForm.js",
      "@arcgis/core/widgets/FeatureTemplates.js",
      "@arcgis/core/geometry/Extent.js"
    ]);
  } else {
    [GraphicsLayer, SketchViewModel, Graphic, FeatureForm, FeatureTemplates, Extent] = await Promise.all([
      import("https://js.arcgis.com/5.1/@arcgis/core/layers/GraphicsLayer.js").then(m => m.default),
      import("https://js.arcgis.com/5.1/@arcgis/core/widgets/Sketch/SketchViewModel.js").then(m => m.default),
      import("https://js.arcgis.com/5.1/@arcgis/core/Graphic.js").then(m => m.default),
      import("https://js.arcgis.com/5.1/@arcgis/core/widgets/FeatureForm.js").then(m => m.default),
      import("https://js.arcgis.com/5.1/@arcgis/core/widgets/FeatureTemplates.js").then(m => m.default),
      import("https://js.arcgis.com/5.1/@arcgis/core/geometry/Extent.js").then(m => m.default)
    ]);
  }
}

// ==========================================
// PUBLIC API (exported to app.js)
// ==========================================

/**
 * Initializes the custom feature editor panel
 * @param {Object} mapContext - { view, map, webmap, operationalLayer }
 */
export async function init(mapContext) {
  viewInstance = mapContext.view;
  featureLayer = mapContext.operationalLayer;

  if (!featureLayer) {
    console.error("[Editor] Operational layer not found!");
    return;
  }

  console.info("[Editor] Initializing Custom Feature Editor for layer:", featureLayer.title);

  // Load same-realm Esri modules from web component bundle
  await loadEsriModules();

  // Expose zoomToAll globally
  setupGlobalHelpers();

  // 1. Graphics layer for sketching polygons
  sketchLayer = new GraphicsLayer({ title: "Custom Editor Sketch Layer", listMode: "hide" });
  viewInstance.map.add(sketchLayer);

  // 2. SketchViewModel for polygon drawing and reshaping
  sketchVM = new SketchViewModel({
    view: viewInstance,
    layer: sketchLayer,
    polygonSymbol: {
      type: "simple-fill",
      color: [0, 121, 193, 0.4],
      outline: { color: [0, 121, 193, 1], width: 2 }
    },
    defaultUpdateOptions: {
      tool: "reshape",
      toggleToolOnClick: false
    },
    updateOnGraphicClick: true
  });

  // 3. FeatureForm for attribute editing (like the sample)
  featureForm = new FeatureForm({
    container: "formDiv",
    layer: featureLayer,
    suppressDeprecationWarning: true,
    formTemplate: {
      title: "Feature Attributes",
      elements: [
        { type: "field", fieldName: "FullName", label: "Full Name" },
        { type: "field", fieldName: "Email", label: "Email Address" },
        { type: "field", fieldName: "InputDate", label: "Input Date" }
      ]
    }
  });

  // 4. FeatureTemplates for selecting a template to create new features
  const templates = new FeatureTemplates({
    container: "addTemplatesDiv",
    layers: [featureLayer],
    suppressDeprecationWarning: true
  });

  // 5. The editArea panel is already inside <arcgis-expand id="editor-expand"> in HTML
  const editAreaEl = document.getElementById("editArea");
  if (editAreaEl) {
    editAreaEl.style.display = "block";
  }

  // 6. Wire up event listeners
  setupTemplateSelection(templates);
  setupSketchEvents();
  setupMapClickSelection();
  setupEditorButtons();

  // 7. Initial feature list load
  await refreshFeaturesList();
}

// ==========================================
// TEMPLATE SELECTION -> START DRAWING
// ==========================================

function setupTemplateSelection(templates) {
  templates.on("select", () => {
    // Automatically expand the Custom Feature Editor panel
    const editorExpand = document.getElementById("editor-expand");
    if (editorExpand) {
      editorExpand.expanded = true;
    }

    clearEditor();
    isAddingNew = true;
    toggleCancelButtons(true);

    // Update instructions
    setEditorStatus("Drawing Polygon: Click on map to add vertices, double-click to finish");
    showToast("Click on map to draw polygon vertices. Double-click to complete.", "info");

    // Activate polygon drawing
    sketchVM.create("polygon");
  });
}

// ==========================================
// SKETCH EVENTS
// ==========================================

function setupSketchEvents() {
  // When polygon drawing is complete or cancelled
  sketchVM.on("create", (event) => {
    if (event.state === "complete") {
      const drawnGeometry = event.graphic ? event.graphic.geometry : event.geometry;
      console.log("[Editor] Polygon drawn successfully:", drawnGeometry);
      toggleCancelButtons(false);

      sketchLayer.removeAll();

      // Create a temporary graphic with empty attributes
      editFeature = new Graphic({
        geometry: drawnGeometry,
        attributes: { FullName: "", Email: "", InputDate: Date.now() }
      });

      sketchLayer.add(editFeature);

      // Automatically expand the Custom Feature Editor panel
      const editorExpand = document.getElementById("editor-expand");
      if (editorExpand) {
        editorExpand.expanded = true;
      }

      // Show FeatureForm for the new feature
      featureForm.feature = editFeature;
      document.getElementById("updateHeader").innerText = "Fill New Feature Details";
      toggleEditingDivs(false);
      setEditorStatus("Enter feature attributes and click Save Changes");
    } else if (event.state === "cancel") {
      toggleCancelButtons(false);
      setEditorStatus("Ready");
    }
  });

  // When geometry reshape/update is complete
  sketchVM.on("update", (event) => {
    if (event.state === "complete" && event.graphics && event.graphics.length > 0 && editFeature) {
      editFeature.geometry = event.graphics[0].geometry;
      console.log("[Editor] Geometry reshape completed.");
    }
  });
}

// ==========================================
// MAP CLICK -> SELECT EXISTING FEATURE
// ==========================================

function setupMapClickSelection() {
  viewInstance.on("click", async (event) => {
    // Don't intercept clicks if actively drawing
    if (sketchVM.state === "active" || isAddingNew) return;

    const response = await viewInstance.hitTest(event, { include: [featureLayer] });

    if (response.results.length === 0) {
      // Clicked empty space -> show templates panel
      toggleEditingDivs(true);
      return;
    }

    // User clicked an existing feature -> enter edit mode
    clearEditor();

    const clickedGraphic = response.results[0].graphic;
    const oidField = featureLayer.objectIdField || "OBJECTID";
    const oid = clickedGraphic.attributes[oidField];

    // Query full feature from server
    const featureSet = await featureLayer.queryFeatures({
      objectIds: [oid],
      outFields: ["*"],
      returnGeometry: true
    });

    if (featureSet.features.length > 0) {
      editFeature = featureSet.features[0];

      // Automatically open the Custom Feature Editor panel
      const editorExpand = document.getElementById("editor-expand");
      if (editorExpand) {
        editorExpand.expanded = true;
      }

      // Show attributes in FeatureForm
      featureForm.feature = editFeature;

      // Highlight on map
      const layerView = await viewInstance.whenLayerView(featureLayer);
      highlight = layerView.highlight(editFeature);

      // Add a clone to sketchLayer for geometry reshaping
      const editGraphic = editFeature.clone();
      sketchLayer.add(editGraphic);
      sketchVM.update([editGraphic], { tool: "reshape" });

      document.getElementById("updateHeader").innerText = `Update Feature #${oid}`;
      toggleEditingDivs(false);
      setEditorStatus(`Editing Feature #${oid}`);
    }
  });
}

// ==========================================
// EDITOR BUTTONS (Save / Delete / Cancel)
// ==========================================

function setupEditorButtons() {
  // Save / Update button
  const btnUpdate = document.getElementById("btnUpdate");
  if (btnUpdate) {
    btnUpdate.addEventListener("click", async () => {
      if (!editFeature) {
        showToast("No feature to save.", "warning");
        return;
      }

      // Grab updated attributes from FeatureForm
      const values = featureForm.getValues();
      Object.keys(values).forEach(key => {
        editFeature.attributes[key] = values[key];
      });

      // Capture latest geometry from SketchVM
      if (sketchLayer.graphics.length > 0) {
        editFeature.geometry = sketchLayer.graphics.getItemAt(0).geometry;
      }

      if (isAddingNew) {
        // CREATE: Send clean graphic with only editable attributes
        const addGraphic = new Graphic({
          geometry: editFeature.geometry,
          attributes: {
            FullName: editFeature.attributes.FullName || "",
            Email: editFeature.attributes.Email || "",
            InputDate: editFeature.attributes.InputDate || Date.now()
          }
        });
        await applyEditsToLayer({ addFeatures: [addGraphic] });
      } else {
        // UPDATE: Include OBJECTID + editable fields only
        const oidField = featureLayer.objectIdField || "OBJECTID";
        const updateGraphic = new Graphic({
          geometry: editFeature.geometry,
          attributes: {
            [oidField]: editFeature.attributes[oidField],
            FullName: editFeature.attributes.FullName || "",
            Email: editFeature.attributes.Email || "",
            InputDate: editFeature.attributes.InputDate || Date.now()
          }
        });
        await applyEditsToLayer({ updateFeatures: [updateGraphic] });
      }
    });
  }

  // Delete button
  const btnDelete = document.getElementById("btnDelete");
  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      if (!editFeature || isAddingNew) {
        showToast("Select an existing feature to delete.", "warning");
        return;
      }

      if (confirm("Are you sure you want to delete this polygon feature?")) {
        const oidField = featureLayer.objectIdField || "OBJECTID";
        const deleteGraphic = new Graphic({
          attributes: { [oidField]: editFeature.attributes[oidField] }
        });
        await applyEditsToLayer({ deleteFeatures: [deleteGraphic] });
      }
    });
  }

  // Cancel button inside form
  const btnCancel = document.getElementById("btnCancel");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      clearEditor();
      setEditorStatus("Ready");
    });
  }

  // Cancel Drawing buttons (Header, Panel, Floating Pill)
  const cancelDrawingButtons = [
    document.getElementById("btn-cancel-add-feature"),
    document.getElementById("btn-cancel-draw-panel"),
    document.getElementById("btn-cancel-drawing-pill")
  ];

  cancelDrawingButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener("click", () => {
        clearEditor();
        setEditorStatus("Ready");
        showToast("Feature addition cancelled.", "info");
      });
    }
  });

  // ESC key handler to cancel drawing
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (isAddingNew || (sketchVM && sketchVM.state === "active"))) {
      clearEditor();
      setEditorStatus("Ready");
      showToast("Feature addition cancelled.", "info");
    }
  });

  // Header "Add Feature" button (alternative entry point)
  const btnStartAdd = document.getElementById("btn-start-add-feature");
  if (btnStartAdd) {
    btnStartAdd.addEventListener("click", () => {
      // Automatically expand the Custom Feature Editor panel
      const editorExpand = document.getElementById("editor-expand");
      if (editorExpand) {
        editorExpand.expanded = true;
      }

      clearEditor();
      isAddingNew = true;
      toggleCancelButtons(true);
      setEditorStatus("Drawing Polygon: Click on map to add points, double-click to finish");
      showToast("Click on map to draw polygon vertices. Double-click to complete.", "info");
      sketchVM.create("polygon");
    });
  }

  // Refresh table button in drawer
  const btnRefresh = document.getElementById("btn-refresh-features");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => refreshFeaturesList());
  }
}

// ==========================================
// applyEdits WRAPPER (like the sample)
// ==========================================

async function applyEditsToLayer(params) {
  try {
    setEditorStatus("Saving edits to server...");
    console.log("[Editor] Calling featureLayer.applyEdits()", params);

    const result = await featureLayer.applyEdits(params);

    // Check for errors in results
    if (result.addFeatureResults && result.addFeatureResults.length > 0) {
      if (result.addFeatureResults[0].error) throw result.addFeatureResults[0].error;
      const oid = result.addFeatureResults[0].objectId;
      showToast(`Feature created successfully! (ID: #${oid})`, "success");
      console.info("[Editor] Feature added, ObjectID:", oid);
    }

    if (result.updateFeatureResults && result.updateFeatureResults.length > 0) {
      if (result.updateFeatureResults[0].error) throw result.updateFeatureResults[0].error;
      const oid = result.updateFeatureResults[0].objectId;
      showToast(`Feature #${oid} updated successfully!`, "success");
      console.info("[Editor] Feature updated, ObjectID:", oid);
    }

    if (result.deleteFeatureResults && result.deleteFeatureResults.length > 0) {
      if (result.deleteFeatureResults[0].error) throw result.deleteFeatureResults[0].error;
      const oid = result.deleteFeatureResults[0].objectId;
      showToast(`Feature #${oid} deleted successfully!`, "success");
      console.info("[Editor] Feature deleted, ObjectID:", oid);
    }

    // Clean up and refresh
    clearEditor();
    featureLayer.refresh();
    await refreshFeaturesList();
    setEditorStatus("Idle");

  } catch (err) {
    console.error("[Editor] applyEdits failed:", err);
    showToast(`Error saving edits: ${err.message || err}`, "error");
    setEditorStatus("Error during edit operation");
  }
}

// ==========================================
// FEATURES DATA TABLE / DRAWER
// ==========================================

export async function refreshFeaturesList() {
  const tableBody = document.getElementById("features-table-body");
  const countBadge = document.getElementById("features-count-badge");
  if (!tableBody || !featureLayer) return;

  tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Loading layer features...</td></tr>`;

  try {
    const results = await featureLayer.queryFeatures({
      where: "1=1",
      outFields: ["*"],
      returnGeometry: true
    });

    const features = results.features || [];
    const oidField = featureLayer.objectIdField || "OBJECTID";

    // Sort by OBJECTID descending
    features.sort((a, b) => {
      const idA = (a.attributes && a.attributes[oidField]) || 0;
      const idB = (b.attributes && b.attributes[oidField]) || 0;
      return idB - idA;
    });

    if (countBadge) countBadge.textContent = features.length.toString();

    if (features.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">
          No features found. Click <strong>"Add Feature"</strong> or select a template to draw the first polygon!
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = "";

    features.forEach(feat => {
      const attrs = feat.attributes;
      const oid = attrs[oidField];
      const name = attrs.FullName || "—";
      const email = attrs.Email || "—";
      const dateStr = attrs.InputDate ? new Date(attrs.InputDate).toLocaleDateString() : "—";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${oid}</strong></td>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${dateStr}</td>
        <td class="action-cell">
          <button type="button" class="btn-sm-action btn-zoom" title="Zoom to Feature">Zoom</button>
          <button type="button" class="btn-sm-action btn-edit" title="Edit Feature">Edit</button>
          <button type="button" class="btn-sm-action btn-delete" title="Delete Feature">Del</button>
        </td>`;

      tr.querySelector(".btn-zoom").addEventListener("click", () => {
        if (feat.geometry) viewInstance.goTo({ target: feat.geometry, zoom: 16 });
      });

      tr.querySelector(".btn-edit").addEventListener("click", () => {
        selectFeatureById(oid);
        const drawer = document.getElementById("features-drawer");
        if (drawer) drawer.classList.remove("open");
      });

      tr.querySelector(".btn-delete").addEventListener("click", async () => {
        if (confirm(`Delete feature #${oid}?`)) {
          const deleteGraphic = new Graphic({ attributes: { [oidField]: oid } });
          await applyEditsToLayer({ deleteFeatures: [deleteGraphic] });
        }
      });

      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.warn("[Editor] Notice loading features table:", err);
    tableBody.innerHTML = `
      <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--accent-danger);">
        Could not load features table.
      </td></tr>`;
  }
}

/**
 * Select a feature by objectId for editing (used from table)
 */
async function selectFeatureById(objectId) {
  clearEditor();

  const featureSet = await featureLayer.queryFeatures({
    objectIds: [objectId],
    outFields: ["*"],
    returnGeometry: true
  });

  if (featureSet.features.length > 0) {
    editFeature = featureSet.features[0];

    // Automatically expand the Custom Feature Editor panel
    const editorExpand = document.getElementById("editor-expand");
    if (editorExpand) {
      editorExpand.expanded = true;
    }

    featureForm.feature = editFeature;

    const layerView = await viewInstance.whenLayerView(featureLayer);
    highlight = layerView.highlight(editFeature);

    const editGraphic = editFeature.clone();
    sketchLayer.add(editGraphic);
    sketchVM.update([editGraphic], { tool: "reshape" });

    document.getElementById("updateHeader").innerText = `Update Feature #${objectId}`;
    toggleEditingDivs(false);
    setEditorStatus(`Editing Feature #${objectId}`);

    // Zoom to it
    viewInstance.goTo({ target: editFeature.geometry, zoom: 16 });
  }
}

// ==========================================
// HELPERS
// ==========================================

function clearEditor() {
  if (highlight) { highlight.remove(); highlight = null; }
  if (sketchLayer) sketchLayer.removeAll();
  if (sketchVM && sketchVM.state === "active") sketchVM.cancel();
  editFeature = null;
  isAddingNew = false;
  if (featureForm) featureForm.feature = null;
  toggleEditingDivs(true);
  toggleCancelButtons(false);
}

function toggleCancelButtons(isDrawing) {
  const btnCancelHeader = document.getElementById("btn-cancel-add-feature");
  const bannerPanel = document.getElementById("drawing-active-banner");
  const btnCancelPill = document.getElementById("btn-cancel-drawing-pill");

  if (btnCancelHeader) btnCancelHeader.style.display = isDrawing ? "inline-flex" : "none";
  if (bannerPanel) bannerPanel.style.display = isDrawing ? "block" : "none";
  if (btnCancelPill) btnCancelPill.style.display = isDrawing ? "inline-block" : "none";
}

function toggleEditingDivs(showAdd) {
  const addDiv = document.getElementById("addFeatureDiv");
  const updateDiv = document.getElementById("featureUpdateDiv");
  const instructionDiv = document.getElementById("updateInstructionDiv");

  if (addDiv) addDiv.style.display = showAdd ? "block" : "none";
  if (updateDiv) updateDiv.style.display = showAdd ? "none" : "block";
  if (instructionDiv) instructionDiv.style.display = showAdd ? "block" : "none";
}

function setEditorStatus(text) {
  const el = document.getElementById("editor-status-text");
  if (el) el.textContent = text;
}

function setupGlobalHelpers() {
  window.mapView = viewInstance;

  window.zoomToAll = function () {
    if (!Extent || !viewInstance) return;
    const egyptExtent = new Extent({
      xmin: 25.0, ymin: 22.0, xmax: 36.0, ymax: 32.0,
      spatialReference: { wkid: 4326 }
    });
    viewInstance.goTo(egyptExtent);
  };
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠" : "ℹ"}</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    </div>
    <button type="button" class="toast-close">&times;</button>`;

  toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}
