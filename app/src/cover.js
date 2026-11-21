// Neon Bay Cover Studio — cover rendering engine.
// Draws the multi-panel poster onto any 2d canvas at any size, so the live
// preview and the exported PNG come from the exact same code path.

export const EXPORT_SIZES = {
  "1080x1080": { w: 1080, h: 1080, label: "square" },
  "1080x1350": { w: 1080, h: 1350, label: "portrait" },
  "1920x1080": { w: 1920, h: 1080, label: "wide" },
};

export const GRADES = {
  sunset: { name: "Vice Sunset", stops: ["#ff2975", "#ff7b00", "#ffd319"], glow: "#ff2975" },
  neon: { name: "Neon Night", stops: ["#00e5ff", "#7b2fff", "#ff2975"], glow: "#00e5ff" },
  golden: { name: "Golden Hour", stops: ["#ffb347", "#ff8c42", "#c25e1e"], glow: "#ffb347" },
  teal: { name: "Teal Noir", stops: ["#00e5a0", "#0077ff", "#0a1030"], glow: "#00e5a0" },
  pop: { name: "Pop Punch", stops: ["#ffef00", "#ff2975", "#00e5ff"], glow: "#ffef00" },
};

export const LAYOUTS = ["triple", "strip", "hero", "grid"];

// One panel: where it sits on the cover (fractions of W/H) and which photo
// slot fills it. Panels are the poster's comic-book grid.
export function layoutPanels(layout, W, H) {
  const g = Math.round(Math.min(W, H) * 0.012) || 4; // gutter
  const m = Math.round(Math.min(W, H) * 0.018) || 6; // outer margin
  const inner = { x: m, y: m, w: W - m * 2, h: H - m * 2 };
  const third = (inner.w - g * 2) / 3;
  const half = (inner.w - g) / 2;
  switch (layout) {
    case "strip":
      return [0, 1, 2].map((slot, i) => ({
        slot, x: inner.x + i * (third + g), y: inner.y, w: third, h: inner.h,
      }));
    case "hero": {
      const topH = inner.h * 0.6;
      const botH = inner.h - topH - g;
      return [
        { slot: 0, x: inner.x, y: inner.y, w: inner.w, h: topH },
        { slot: 1, x: inner.x, y: inner.y + topH + g, w: half, h: botH },
        { slot: 2, x: inner.x + half + g, y: inner.y + topH + g, w: half, h: botH },
      ];
    }
    case "grid": {
      const cellH = (inner.h - g) / 2;
      return [0, 1, 2, 0].map((slot, i) => ({
        slot,
        x: inner.x + (i % 2) * (half + g),
        y: inner.y + Math.floor(i / 2) * (cellH + g),
        w: half, h: cellH,
      }));
    }
    case "triple":
    default: {
      const side = (inner.w - g * 2) * 0.27;
      const centre = inner.w - side * 2 - g * 2;
      return [
        { slot: 0, x: inner.x, y: inner.y, w: side, h: inner.h },
        { slot: 1, x: inner.x + side + g, y: inner.y, w: centre, h: inner.h },
        { slot: 2, x: inner.x + side + centre + g * 2, y: inner.y, w: side, h: inner.h },
      ];
    }
  }
}

export function defaultPanels(layout) {
  const rects = layoutPanels(layout, 100, 100);
  // Spread each panel's crop across its photo (left / centre / right) so one
  // photo filling several panels reads as a triptych, not a copy-paste.
  // oy favours the top of the photo, where faces usually are.
  return rects.map((p, i) => ({
    slot: p.slot,
    zoom: 1.15,
    ox: (i - (rects.length - 1) / 2) * 0.55,
    oy: -0.3,
  }));
}

// Draw one photo into a panel rect, cover-fit, with the panel's own crop.
export function drawPhotoPanel(ctx, img, rect, crop) {
  const { x, y, w, h } = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(w / iw, h / ih);
  const zoom = crop.zoom || 1;
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  let dx = x + (w - dw) / 2 + (crop.ox || 0) * ((dw - w) / 2);
  let dy = y + (h - dh) / 2 + (crop.oy || 0) * ((dh - h) / 2);
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  try { ctx.filter = "saturate(1.28) contrast(1.07) brightness(1.02)"; } catch (_) { /* older canvas */ }
  ctx.drawImage(img, dx, dy, dw, dh);
  try { ctx.filter = "none"; } catch (_) { /* older canvas */ }
  ctx.restore();
}

// Placeholder panel when no photo is loaded yet: grade gradient + stripes.
export function drawEmptyPanel(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, grade.stops[0]);
  grad.addColorStop(0.55, grade.stops[1]);
  grad.addColorStop(1, grade.stops[2]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#12041f";
  for (let sx = -h; sx < w + h; sx += Math.max(28, w * 0.09)) {
    ctx.beginPath();
    ctx.moveTo(x + sx, y + h);
    ctx.lineTo(x + sx + h, y);
    ctx.lineTo(x + sx + h + Math.max(14, w * 0.045), y);
    ctx.lineTo(x + sx + Math.max(14, w * 0.045), y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.max(13, Math.round(w * 0.055))}px Oswald, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ADD YOUR PHOTO", x + w / 2, y + h / 2);
}

// Sunset grade wash + vignette over the whole cover.
export function applyGrade(ctx, W, H, grade) {
  const wash = ctx.createLinearGradient(0, 0, W * 0.25, H);
  wash.addColorStop(0, grade.stops[0]);
  wash.addColorStop(0.55, grade.stops[1]);
  wash.addColorStop(1, grade.stops[2]);
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.14;
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H * 0.4);
  ctx.restore();
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vig.addColorStop(0, "rgba(10,2,24,0)");
  vig.addColorStop(1, "rgba(10,2,24,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// Deterministic grain so preview and export match exactly.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawGrain(ctx, W, H) {
  const rand = seededRandom(20261119);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  const n = Math.round((W * H) / 2600);
  for (let i = 0; i < n; i++) {
    const px = rand() * W;
    const py = rand() * H;
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  ctx.restore();
}

export function drawHalftone(ctx, W, H, color) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  const step = Math.max(14, Math.round(W * 0.014));
  const y0 = H * 0.62;
  for (let yy = y0; yy < H; yy += step) {
    for (let xx = step / 2; xx < W; xx += step) {
      const t = (yy - y0) / (H - y0);
      const r = Math.max(0.6, step * 0.22 * (0.5 + t));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Retro sun with rays, tucked into the top-right corner as a small sticker
// so it never sits on a face in the middle of a panel.
export function drawSunRays(ctx, W, H, grade) {
  const cx = W * 0.9;
  const cy = H * 0.1;
  const r = Math.min(W, H) * 0.06;
  ctx.save();
  ctx.globalAlpha = 0.9;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, "rgba(255,41,117,0)");
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = grade.stops[2];
  ctx.lineWidth = Math.max(3, r * 0.09);
  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r * 1.3;
    const y1 = cy + Math.sin(a) * r * 1.3;
    const x2 = cx + Math.cos(a) * r * 1.65;
    const y2 = cy + Math.sin(a) * r * 1.65;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, grade.stops[2]);
  disc.addColorStop(1, grade.stops[0]);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fitFont(ctx, text, fontFamily, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${fontFamily}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${fontFamily}`;
  }
  return size;
}

// Big condensed title with a hard outline and a drop shadow, slightly tilted.
export function drawTitleBlock(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const title = (state.title || "SUNSET HEIST").toUpperCase();
  const subtitle = (state.subtitle || "").toUpperCase();
  const pad = W * 0.045;
  // Leave the bottom-right corner clear for the COVER STUDIO badge.
  const maxW = W - pad * 2 - Math.round(W * 0.22);
  ctx.save();
  ctx.translate(pad, H - pad);
  ctx.rotate(-0.035);
  const titleSize = fitFont(ctx, title, "Anton, sans-serif", maxW, Math.round(W * 0.115));
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(10,2,24,0.85)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = Math.round(titleSize * 0.06);
  ctx.shadowOffsetY = Math.round(titleSize * 0.07);
  ctx.strokeStyle = "#12041f";
  ctx.lineWidth = Math.max(4, titleSize * 0.1);
  ctx.strokeText(title, 0, 0);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = state.titleColor || "#ffd319";
  ctx.fillText(title, 0, 0);
  if (subtitle) {
    const subSize = Math.max(13, Math.round(W * 0.021));
    ctx.font = `600 ${subSize}px Oswald, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch (_) { /* unsupported */ }
    const subW = ctx.measureText(subtitle).width;
    const pillPad = Math.round(subSize * 0.9);
    const pillH = subSize + pillPad;
    const pillY = -titleSize - Math.round(subSize * 1.15) - pillH + Math.round(subSize * 0.45);
    ctx.fillStyle = grade.stops[0];
    ctx.beginPath();
    ctx.roundRect(0, pillY, subW + pillPad * 2, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(subtitle, pillPad, pillY + pillH / 2 + 1);
    try { ctx.letterSpacing = "0px"; } catch (_) { /* unsupported */ }
  }
  ctx.restore();
}

export function drawCityBadge(ctx, W, H) {
  const size = Math.max(13, Math.round(W * 0.018));
  ctx.save();
  ctx.font = `600 ${size}px Oswald, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.35)}px`; } catch (_) { /* unsupported */ }
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(10,2,24,0.9)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("★ NEON BAY", W * 0.045, H * 0.04);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("COVER STUDIO", W * 0.955, H * 0.96);
  ctx.restore();
}

// The one draw routine: preview canvas and exported PNG both call this.
export function drawCover(ctx, W, H, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0d0618";
  ctx.fillRect(0, 0, W, H);
  const rects = layoutPanels(state.layout, W, H);
  const panels = state.panels || defaultPanels(state.layout);
  rects.forEach((rect, i) => {
    const crop = panels[i] || { slot: rect.slot, zoom: 1.15, ox: 0, oy: -0.3 };
    // One photo fills every panel; a second or third photo takes its own.
    const photo = (state.photos || [])[crop.slot]
      || (state.photos || []).find((p) => p);
    if (photo && photo.img) drawPhotoPanel(ctx, photo.img, rect, crop);
    else drawEmptyPanel(ctx, rect, grade);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  if (state.rays) drawSunRays(ctx, W, H, grade);
  applyGrade(ctx, W, H, grade);
  if (state.halftone) drawHalftone(ctx, W, H, grade.stops[2]);
  drawTitleBlock(ctx, W, H, state);
  drawCityBadge(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);
  // Neon outer frame.
  ctx.strokeStyle = grade.stops[0];
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(
    Math.round(W * 0.008), Math.round(H * 0.008),
    W - Math.round(W * 0.016), H - Math.round(H * 0.016),
  );
  ctx.globalAlpha = 1;
}

// Render the cover at a real export size and hand back a PNG blob.
export function exportCoverPNG(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES["1920x1080"];
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  drawCover(ctx, size.w, size.h, state);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("not an image"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}
