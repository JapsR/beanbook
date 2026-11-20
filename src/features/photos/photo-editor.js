/**
 * Full-screen photo editor: square crop, drag to move, pinch or scroll to zoom, rotate.
 */
import { $ } from "../../core/dom.js";
import { icon } from "../../ui/icons.js";
import { toast } from "../../ui/toast.js";
import { okPhoto } from "../../domain/records.js";
import { refreshPhotoField, setFormPhoto } from "./photo-field.js";

export const crop = {
  img: null, ang: 0, rot: 0, asp: "orig", zoom: 1, tx: 0, ty: 0, W: 0, H: 0, ptrs: new Map(), url: null
};

export const editor = $("#editor");

const edDims = () => {
  const q = crop.rot % 180 !== 0, i = crop.img;
  return { rw: q ? i.naturalHeight : i.naturalWidth, rh: q ? i.naturalWidth : i.naturalHeight };
};

const edAng = () => (crop.rot + crop.ang) * Math.PI / 180;

const edBox = () => {
  const a = edAng(), c = Math.abs(Math.cos(a)), n = Math.abs(Math.sin(a));
  return { bw: crop.W * c + crop.H * n, bh: crop.W * n + crop.H * c };
};

const edScale = () => {
  const { bw, bh } = edBox(), i = crop.img;
  return Math.max(bw / i.naturalWidth, bh / i.naturalHeight) * crop.zoom;
};

/* Keep the crop frame inside the photo at any angle. */
function edClamp() {
  const a = edAng(), c = Math.cos(a), n = Math.sin(a), i = crop.img, sc = edScale(), { bw, bh } = edBox(), mx = Math.max(0, (i.naturalWidth * sc - bw) / 2), my = Math.max(0, (i.naturalHeight * sc - bh) / 2);
  let ux = crop.tx * c + crop.ty * n, uy = -crop.tx * n + crop.ty * c;
  ux = Math.min(mx, Math.max(-mx, ux));
  uy = Math.min(my, Math.max(-my, uy));
  crop.tx = ux * c - uy * n;
  crop.ty = ux * n + uy * c;
}

function edPaint(ctx, k) {
  const i = crop.img, sc = edScale();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.translate(crop.W / 2 + crop.tx, crop.H / 2 + crop.ty);
  ctx.rotate(edAng());
  ctx.scale(sc, sc);
  ctx.drawImage(i, -i.naturalWidth / 2, -i.naturalHeight / 2);
}

export function edDraw() {
  const cv = $("#ed-canvas");
  if (!cv) {
    return;
  }
  edClamp();
  edPaint(cv.getContext("2d"), cv.width / crop.W);
}

export function edLayout() {
  const st = $("#ed-stage"), cv = $("#ed-canvas");
  if (!st || !cv) {
    return;
  }
  const { rw, rh } = edDims();
  const asp = crop.asp === "orig" ? rw / rh : { "1": 1, "4:3": 4 / 3, "3:4": 3 / 4 }[crop.asp], aw = Math.max(80, st.clientWidth - 32), ah = Math.max(80, st.clientHeight - 32);
  let W = aw, H = W / asp;
  if (H > ah) {
    H = ah;
    W = H * asp;
  }
  crop.W = W;
  crop.H = H;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  edDraw();
}

export function closeEditor() {
  editor.hidden = true;
  editor.innerHTML = "";
  if (crop.url) {
    URL.revokeObjectURL(crop.url);
    crop.url = null;
  }
  crop.img = null;
  crop.ptrs.clear();
}

export async function openEditor(src, isUrl) {
  let img;
  try {
    img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  } catch (e) {
    if (isUrl) {
      URL.revokeObjectURL(src);
    }
    toast("That image could not be read. Try a JPEG or PNG.");
    return;
  }
  Object.assign(crop, {
    img, ang: 0, rot: 0, asp: "1", zoom: 1, tx: 0, ty: 0, url: isUrl ? src : null
  });
  crop.ptrs.clear();
  editor.innerHTML = `<div class="sheet-head"><h2>Move and scale</h2><button class="ib" type="button" data-act="ed-rot" data-id="90" aria-label="Rotate">${icon("rot")}</button></div>
  <div class="ed-stage" id="ed-stage"><canvas id="ed-canvas" aria-label="Photo preview. Drag to move, pinch to zoom."></canvas></div>
  <p class="ed-hint">Drag to move, pinch to zoom</p>
  <div class="ed-tools"><label class="ed-zoom" for="ed-ang"><span>Rotate</span><input class="plain" id="ed-ang" type="range" min="-45" max="45" step="1" value="0"><output id="ed-ang-out" for="ed-ang">0°</output></label></div>
  <div class="sheet-foot"><button class="btn" type="button" data-act="ed-cancel">Cancel</button><button class="btn primary" type="button" data-act="ed-done">Done</button></div>`;
  editor.hidden = false;
  const cv = $("#ed-canvas"), P = crop.ptrs, dist = () => {
    const [p, q] = [...P.values()];
    return Math.hypot(p.x - q.x, p.y - q.y) || 1;
  };
  cv.addEventListener("pointerdown", e => {
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (x) {
    }
    P.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  cv.addEventListener("pointermove", e => {
    const p = P.get(e.pointerId);
    if (!p) {
      return;
    }
    if (P.size === 1) {
      crop.tx += e.clientX - p.x;
      crop.ty += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    } else if (P.size === 2) {
      const d0 = dist();
      p.x = e.clientX;
      p.y = e.clientY;
      crop.zoom = Math.min(4, Math.max(1, crop.zoom * dist() / d0));
    }
    edDraw();
  });
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    crop.zoom = Math.min(4, Math.max(1, crop.zoom * (e.deltaY < 0 ? 1.08 : .93)));
    edDraw();
  }, { passive: false });
  const up = e => P.delete(e.pointerId);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  edLayout();
}

export function edDone() {
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  let k = Math.min(1000 / Math.max(crop.W, crop.H), 1 / edScale()), q = .82, out = "";
  for (let n = 0; n < 8; n++) {
    cv.width = Math.max(1, Math.round(crop.W * k));
    cv.height = Math.max(1, Math.round(crop.H * k));
    edPaint(ctx, cv.width / crop.W);
    out = cv.toDataURL("image/jpeg", q);
    if (out.length < 180000) {
      break;
    }
    k *= .82;
    q -= .05;
  }
  if (!okPhoto(out)) {
    toast("That photo could not be saved. Try another one.");
    return;
  }
  setFormPhoto(out, true);
  closeEditor();
  refreshPhotoField();
}
