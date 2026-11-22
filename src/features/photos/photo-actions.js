/**
 * Button handlers for the photo editor and the photo field.
 */
import { closeEditor, crop, edDone, edLayout } from "./photo-editor.js";
import { refreshPhotoField, removeFormPhoto } from "./photo-field.js";

export const photoActions = {
  "ed-cancel": () => closeEditor(), "ed-done": () => edDone(),
  "ed-rot": id => {
    crop.rot = (crop.rot + Number(id) + 360) % 360;
    crop.tx = crop.ty = 0;
    edLayout();
  },
  "photo-clear": i => {
    removeFormPhoto(i);
    refreshPhotoField();
  }
};
