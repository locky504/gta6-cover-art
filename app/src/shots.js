// Neon Bay Cover Studio — screenshot modes for the maker's own screenshots.
//   ?shot=editor&photo=pier&caption=SUNSET%20HEIST
//       Full editor with a sample photo loaded, for the "app at work" shot.
//   ?shot=cover&size=1920x1080&photo=pier&layout=triple&caption=SUNSET%20HEIST
//       The cover alone, filling the window — the app's own drawing of the
//       cover it exports, at the screenshot's size.
//   ?shot=export&size=1080x1350
//       Renders the real export path and reports its PNG byte size in the
//       page, so an automated check can confirm export works end to end.
// Nothing here is a mock: every mode draws through the same drawCover and
// exportCoverPNG the user-facing buttons use.

import { EXPORT_SIZES, drawCover, exportCoverPNG, loadImageUrl } from "./cover.js";

const SAMPLE_URLS = { pier: "samples/pier.jpg", boulevard: "samples/boulevard.jpg" };

function applyCommonParams(state, params, hooks) {
  if (params.get("caption")) {
    state.title = params.get("caption");
    const input = document.getElementById("titleInput");
    if (input) input.value = state.title;
  }
  if (params.get("tagline")) {
    state.subtitle = params.get("tagline");
    const input = document.getElementById("subtitleInput");
    if (input) input.value = state.subtitle;
  }
  if (params.get("layout")) hooks.setLayout(params.get("layout"));
  if (params.get("grade")) hooks.setGrade(params.get("grade"));
  if (params.get("size")) hooks.setExportSize(params.get("size"));
}

async function loadShotPhoto(state, params) {
  const key = params.get("photo") || "pier";
  const url = SAMPLE_URLS[key] || SAMPLE_URLS.pier;
  const img = await loadImageUrl(url);
  state.photos[0] = { img, name: `${key}.jpg` };
  if (key === "pier") {
    try {
      state.photos[1] = { img: await loadImageUrl(SAMPLE_URLS.boulevard), name: "boulevard.jpg" };
    } catch (_) { /* one photo is enough */ }
  }
}

export async function runShotMode(state, hooks) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (!shot) return;
  try { await document.fonts.ready; } catch (_) { /* fonts are best-effort */ }

  if (shot === "editor") {
    applyCommonParams(state, params, hooks);
    await loadShotPhoto(state, params);
    if (hooks.refreshSlotLabels) hooks.refreshSlotLabels();
    const hint = document.getElementById("stageHint");
    if (hint) hint.textContent = "Sample photos loaded — drag a panel to reposition, or drop your own photo on the preview.";
    hooks.renderNow();
    return;
  }

  if (shot === "cover") {
    document.body.classList.add("shot-cover");
    applyCommonParams(state, params, hooks);
    await loadShotPhoto(state, params);
    const canvas = document.getElementById("previewCanvas");
    const size = EXPORT_SIZES[params.get("size")] || EXPORT_SIZES["1920x1080"];
    const scale = Math.min(window.innerWidth / size.w, window.innerHeight / size.h);
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    drawCover(canvas.getContext("2d"), canvas.width, canvas.height, state);
    document.title = `COVER ${canvas.width}x${canvas.height}`;
    return;
  }

  if (shot === "export") {
    document.body.classList.add("shot-cover");
    applyCommonParams(state, params, hooks);
    await loadShotPhoto(state, params);
    const sizeKey = params.get("size") || "1920x1080";
    const blob = await exportCoverPNG(state, sizeKey);
    const size = EXPORT_SIZES[sizeKey];
    const info = document.getElementById("exportInfo");
    const text = blob
      ? `EXPORT_OK bytes=${blob.size} size=${size.w}x${size.h}`
      : "EXPORT_FAIL";
    if (info) { info.hidden = false; info.textContent = text; }
    document.title = text;
    const canvas = document.getElementById("previewCanvas");
    canvas.width = Math.round(size.w * 0.5);
    canvas.height = Math.round(size.h * 0.5);
    drawCover(canvas.getContext("2d"), canvas.width, canvas.height, state);
  }
}
