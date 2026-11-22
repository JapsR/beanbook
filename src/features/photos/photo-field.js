/**
 * Photo picker inside the coffee and preparation forms. Holds the photos being edited until the form is saved.
 *
 * A coffee has one photo. A preparation can have several (up to PHOTOS_MAX): they show as a row of
 * thumbnails with a remove button each and an "Add" tile. Each entry is { id, data }: id is the stored
 * photo it came from, or null for a photo picked in this form that is not stored yet.
 */
import { $, esc } from "../../core/dom.js";
import { icon } from "../../ui/icons.js";
import { sheetRoot } from "../../ui/sheet.js";
import { PHOTOS_MAX, brewPhotoIds } from "../../domain/records.js";
import { state } from "../../data/state.js";
import { addPhoto, delPhoto } from "../../data/storage.js";

const formPhoto = { list: [], multi: false, changed: false };

/* Starts the field for a form. ids: the record's stored photo ids. multi: allow several photos. */
export function setFormPhotos(ids, multi) {
  formPhoto.list = ids.filter(id => state.photos[id]).map(id => ({ id, data: state.photos[id] }));
  formPhoto.multi = multi;
  formPhoto.changed = false;
}

/* A photo coming out of the editor: replaces the coffee photo, or is added to a preparation's photos. */
export function pickedPhoto(data) {
  formPhoto.list = formPhoto.multi ? [...formPhoto.list, { id: null, data }].slice(0, PHOTOS_MAX) : [{ id: null, data }];
  formPhoto.changed = true;
}

export function removeFormPhoto(i) {
  formPhoto.list = formPhoto.list.filter((x, n) => n !== Number(i));
  formPhoto.changed = true;
}

const fileInput = label => `<input id="photo-file" type="file" accept="image/*" aria-label="${label}">`;

export const photoField = () => formPhoto.multi ? multiField() : singleField();

function singleField() {
  const p = formPhoto.list[0];
  return `<div class="f"><span class="lbl">Photo</span><div class="photo-pick"><div class="prev" id="photo-prev">${p ? `<img src="${p.data}" alt="Selected photo">` : icon("camera", 28)}</div>
  <div class="acts"><label class="btn small file-btn">${icon("camera", 18)}${p ? "Change photo" : "Add photo"}${fileInput("Choose a photo")}</label>
  ${p ? `<button class="btn small ghost" type="button" data-act="photo-clear" data-id="0">Remove</button>` : `<p class="hint">Take one or pick from your gallery.</p>`}</div></div></div>`;
}

function multiField() {
  const l = formPhoto.list, room = l.length < PHOTOS_MAX;
  return `<div class="f"><span class="lbl">Photos${l.length ? ` <span class="photo-count">${l.length} of ${PHOTOS_MAX}</span>` : ""}</span><div class="photo-pick multi">
  ${l.map((p, i) => `<div class="prev"><img src="${p.data}" alt="Photo ${i + 1}"><button class="photo-del" type="button" data-act="photo-clear" data-id="${i}" aria-label="Remove photo ${i + 1}">${icon("close", 16)}</button></div>`).join("")}
  ${room ? `<label class="prev photo-add file-btn">${icon("camera", 24)}<span>${l.length ? "Add" : "Add photo"}</span>${fileInput(l.length ? "Add another photo" : "Choose a photo")}</label>` : ""}
  ${l.length ? "" : `<p class="hint">Take one or pick from your gallery. You can add up to ${esc(PHOTOS_MAX)}.</p>`}</div></div>`;
}

export function refreshPhotoField() {
  const el = $(".photo-pick", sheetRoot);
  if (el) {
    const t = document.createElement("div");
    t.innerHTML = photoField();
    el.closest(".f").replaceWith(t.firstElementChild);
  }
}

/* On save: store new photos, delete removed ones, and point the record at the result. */
export function applyPhoto(old, obj) {
  if (!formPhoto.changed) {
    return;
  }
  const keep = new Set(formPhoto.list.map(p => p.id).filter(Boolean));
  (old ? (formPhoto.multi ? brewPhotoIds(old) : [old.photoId]) : []).forEach(id => id && !keep.has(id) && delPhoto(id));
  const ids = formPhoto.list.map(p => p.id || addPhoto(p.data));
  obj.photoId = ids[0] || null;
  if (formPhoto.multi) {
    obj.morePhotoIds = ids.slice(1);
  }
}
