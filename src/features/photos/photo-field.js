/**
 * Photo picker inside the coffee and preparation forms. Holds the photo being edited until the form is saved.
 */
import { $ } from "../../core/dom.js";
import { icon } from "../../ui/icons.js";
import { sheetRoot } from "../../ui/sheet.js";
import { addPhoto, delPhoto } from "../../data/storage.js";

const formPhoto = { data: null, changed: false };

export const setFormPhoto = (data, changed) => {
  formPhoto.data = data;
  formPhoto.changed = changed;
};

export const photoField = () => `<div class="f"><span class="lbl">Photo</span><div class="photo-pick"><div class="prev" id="photo-prev">${formPhoto.data ? `<img src="${formPhoto.data}" alt="Selected photo">` : icon("camera", 28)}</div>
  <div class="acts"><label class="btn small file-btn">${icon("camera", 18)}${formPhoto.data ? "Change photo" : "Add photo"}<input id="photo-file" type="file" accept="image/*" aria-label="Choose a photo"></label>
  ${formPhoto.data ? `<button class="btn small ghost" type="button" data-act="photo-clear">Remove</button>` : `<p class="hint">Take one or pick from your gallery.</p>`}</div></div></div>`;

export function refreshPhotoField() {
  const el = $(".photo-pick", sheetRoot);
  if (el) {
    const t = document.createElement("div");
    t.innerHTML = photoField();
    el.closest(".f").replaceWith(t.firstElementChild);
  }
}

export function applyPhoto(old, obj) {
  if (!formPhoto.changed) {
    return;
  }
  if (old && old.photoId) {
    delPhoto(old.photoId);
  }
  obj.photoId = formPhoto.data ? addPhoto(formPhoto.data) : null;
}
