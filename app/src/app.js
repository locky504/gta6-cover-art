// Neon Bay Cover Studio — editor wiring: photos, layout, caption, grade,
// live preview, drag-to-pan, export. All state lives in one object so the
// preview and the PNG export can never drift apart.

import {
  EXPORT_SIZES, GRADES, LAYOUTS, defaultPanels, drawCover,
  exportCoverPNG, layoutPanels, loadImageFile, loadImageUrl,
} from "./cover.js";
import { runShotMode } from "./shots.js";

export const state = {
  layout: "triple",
  panels: defaultPanels("triple"),
  photos: [null, null, null],
  title: "SUNSET HEIST",
  subtitle: "NEON BAY • ONE LAST SCORE",
  titleColor: "#ffd319",
  grade: "sunset",
  rays: true,
  grain: true,
  halftone: false,
  exportSize: "1920x1080",
  selected: 0,
};

const $ = (id) => document.getElementById(id);
const canvas = $("previewCanvas");
const ctx = canvas.getContext("2d");
let previewW = 960;
let previewH = 540;
let renderQueued = false;

export function previewSizeFor(sizeKey) {
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES["1920x1080"];
  const scale = 960 / Math.max(size.w, size.h);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

export function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    drawCover(ctx, previewW, previewH, state);
  });
}

export function renderNow() {
  drawCover(ctx, previewW, previewH, state);
}

function resizePreview() {
  const { w, h } = previewSizeFor(state.exportSize);
  previewW = w;
  previewH = h;
  canvas.width = w;
  canvas.height = h;
  requestRender();
}

export function refreshSlotLabels() {
  state.photos.forEach((photo, i) => {
    const el = $(`slotState${i}`);
    if (el) el.textContent = photo ? photo.name : "empty";
    const slot = document.querySelector(`.slot[data-slot="${i}"]`);
    if (slot) slot.classList.toggle("is-active", state.selected === i);
  });
  syncCropSliders();
}

function syncCropSliders() {
  const crop = state.panels[state.selected] || { zoom: 1.12, ox: 0, oy: 0 };
  $("zoomSlider").value = String(crop.zoom);
  $("panXSlider").value = String(crop.ox);
  $("panYSlider").value = String(crop.oy);
}

export function setPhoto(slot, img, name) {
  state.photos[slot] = { img, name };
  state.selected = slot;
  refreshSlotLabels();
  requestRender();
}

export async function loadSamplePhotos() {
  const jobs = [
    loadImageUrl("samples/pier.jpg").then((img) => setPhoto(0, img, "pier.jpg")),
    loadImageUrl("samples/boulevard.jpg").then((img) => setPhoto(1, img, "boulevard.jpg")),
  ];
  await Promise.allSettled(jobs);
  $("stageHint").textContent = "Sample photos loaded — drag a panel to reposition, or drop your own photo on the preview.";
}

function setLayout(layout) {
  if (!LAYOUTS.includes(layout)) return;
  const old = state.panels;
  state.layout = layout;
  state.panels = defaultPanels(layout);
  // Keep each panel's photo and crop where the old layout had them.
  state.panels.forEach((panel, i) => {
    if (old[i]) {
      panel.slot = old[i].slot;
      panel.zoom = old[i].zoom;
      panel.ox = old[i].ox;
      panel.oy = old[i].oy;
    }
  });
  if (state.selected >= state.panels.length) state.selected = 0;
  document.querySelectorAll(".layout-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.layout === layout));
  syncCropSliders();
  requestRender();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  document.querySelectorAll(".grade-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.grade === grade));
  requestRender();
}

function setExportSize(sizeKey) {
  if (!EXPORT_SIZES[sizeKey]) return;
  state.exportSize = sizeKey;
  document.querySelectorAll(".size-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.size === sizeKey));
  resizePreview();
}

export async function exportCurrentCover() {
  const status = $("exportStatus");
  const size = EXPORT_SIZES[state.exportSize];
  if (status) status.textContent = `Rendering ${size.w} × ${size.h} PNG…`;
  const blob = await exportCoverPNG(state, state.exportSize);
  if (!blob) {
    if (status) status.textContent = "Export failed in this browser — try desktop Chrome.";
    return null;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `neon-bay-cover-${size.w}x${size.h}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  if (status) {
    status.textContent = `Exported ${size.w} × ${size.h} PNG (${Math.round(blob.size / 1024)} KB).`;
  }
  return blob;
}

// --- pointer: click selects a panel, drag pans its photo, wheel zooms it ---
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * previewW;
  const py = ((clientY - rect.top) / rect.height) * previewH;
  const rects = layoutPanels(state.layout, previewW, previewH);
  const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  return { hit, px, py };
}

let drag = null;

canvas.addEventListener("pointerdown", (event) => {
  const { hit, px, py } = panelAt(event.clientX, event.clientY);
  if (hit < 0) return;
  state.selected = hit;
  refreshSlotLabels();
  const crop = state.panels[hit];
  drag = { panel: hit, startX: px, startY: py, ox: crop.ox, oy: crop.oy };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const { px, py } = panelAt(event.clientX, event.clientY);
  const rects = layoutPanels(state.layout, previewW, previewH);
  const rect = rects[drag.panel];
  const crop = state.panels[drag.panel];
  const spanX = Math.max(1, (rect.w * (crop.zoom - 1)) / 2 + rect.w * 0.2);
  const spanY = Math.max(1, (rect.h * (crop.zoom - 1)) / 2 + rect.h * 0.2);
  crop.ox = Math.max(-1, Math.min(1, drag.ox + ((px - drag.startX) / spanX) * 0.5));
  crop.oy = Math.max(-1, Math.min(1, drag.oy + ((py - drag.startY) / spanY) * 0.5));
  syncCropSliders();
  requestRender();
});

canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.zoom = Math.max(1, Math.min(2.5, crop.zoom - Math.sign(event.deltaY) * 0.08));
  syncCropSliders();
  requestRender();
}, { passive: false });

// --- controls ---
[0, 1, 2].forEach((slot) => {
  $(`file${slot}`).addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      setPhoto(slot, await loadImageFile(file), file.name);
      $("stageHint").textContent = `“${file.name}” loaded — drag the preview to reposition it.`;
    } catch {
      $("stageHint").textContent = "That file could not be read as an image.";
    }
    event.target.value = "";
  });
});

document.querySelectorAll(".slot").forEach((slotEl) => {
  slotEl.addEventListener("click", () => {
    state.selected = Number(slotEl.dataset.slot);
    refreshSlotLabels();
    requestRender();
  });
});

$("sampleBtn").addEventListener("click", loadSamplePhotos);
$("clearPhotosBtn").addEventListener("click", () => {
  state.photos = [null, null, null];
  refreshSlotLabels();
  requestRender();
  $("stageHint").textContent = "Photos cleared — drop a photo here, or try the samples.";
});

document.querySelectorAll(".layout-btn").forEach((b) =>
  b.addEventListener("click", () => setLayout(b.dataset.layout)));
document.querySelectorAll(".grade-btn").forEach((b) =>
  b.addEventListener("click", () => setGrade(b.dataset.grade)));
document.querySelectorAll(".size-btn").forEach((b) =>
  b.addEventListener("click", () => setExportSize(b.dataset.size)));

$("zoomSlider").addEventListener("input", (e) => {
  const crop = state.panels[state.selected];
  if (crop) { crop.zoom = Number(e.target.value); requestRender(); }
});
$("panXSlider").addEventListener("input", (e) => {
  const crop = state.panels[state.selected];
  if (crop) { crop.ox = Number(e.target.value); requestRender(); }
});
$("panYSlider").addEventListener("input", (e) => {
  const crop = state.panels[state.selected];
  if (crop) { crop.oy = Number(e.target.value); requestRender(); }
});
$("fitPanelBtn").addEventListener("click", () => {
  const crop = state.panels[state.selected];
  const defaults = defaultPanels(state.layout)[state.selected];
  if (crop && defaults) {
    crop.zoom = defaults.zoom;
    crop.ox = defaults.ox;
    crop.oy = defaults.oy;
  }
  syncCropSliders();
  requestRender();
});

$("titleInput").addEventListener("input", (e) => { state.title = e.target.value; requestRender(); });
$("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; requestRender(); });

document.querySelectorAll(".swatch").forEach((b) =>
  b.addEventListener("click", () => {
    state.titleColor = b.dataset.color;
    document.querySelectorAll(".swatch").forEach((x) =>
      x.classList.toggle("is-active", x === b));
    requestRender();
  }));

$("raysToggle").addEventListener("change", (e) => { state.rays = e.target.checked; requestRender(); });
$("grainToggle").addEventListener("change", (e) => { state.grain = e.target.checked; requestRender(); });
$("halftoneToggle").addEventListener("change", (e) => { state.halftone = e.target.checked; requestRender(); });

$("exportBtn").addEventListener("click", exportCurrentCover);
$("exportBtnTop").addEventListener("click", exportCurrentCover);

// Drag-and-drop photos straight onto the preview.
["dragenter", "dragover"].forEach((name) =>
  $("stage").addEventListener(name, (e) => { e.preventDefault(); }));
$("stage").addEventListener("drop", async (e) => {
  e.preventDefault();
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  try {
    setPhoto(state.selected, await loadImageFile(file), file.name);
  } catch {
    $("stageHint").textContent = "That file could not be read as an image.";
  }
});

// Screenshot / demo modes (?shot=…) run after the editor boots.
resizePreview();
refreshSlotLabels();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => requestRender());
}
requestRender();
runShotMode(state, { setLayout, setGrade, setExportSize, renderNow, loadSamplePhotos, refreshSlotLabels });
