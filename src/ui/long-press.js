/**
 * Long press on touch screens, right-click with a mouse: one callback for both.
 *
 * Touch: holding a matching element still for LONG_PRESS_MS opens it; moving the finger or scrolling
 * cancels. The click that follows a long press is swallowed, so the item does not also open.
 * Android fires its own "contextmenu" on a long press; that is caught too, so the menu opens once.
 */
const LONG_PRESS_MS = 500;
const press = { timer: 0, x: 0, y: 0, el: null, fired: false, touch: false };

function endPress() {
  clearTimeout(press.timer);
  press.timer = 0;
  press.el?.classList.remove("pressing");
  press.el = null;
}

export function bindLongPress(selector, open) {
  const fire = el => {
    endPress();
    // only a touch press is followed by a click to swallow; a right-click is not
    press.fired = press.touch;
    setTimeout(() => {
      press.fired = false;
    }, 1000);
    navigator.vibrate?.(10);
    open(el);
  };
  document.addEventListener("pointerdown", e => {
    press.fired = false;
    press.touch = e.pointerType !== "mouse";
    const el = press.touch && e.target.closest(selector);
    if (!el) {
      return;
    }
    endPress();
    Object.assign(press, { x: e.clientX, y: e.clientY, el });
    el.classList.add("pressing");
    press.timer = setTimeout(() => fire(el), LONG_PRESS_MS);
  });
  document.addEventListener("pointermove", e => {
    if (press.timer && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
      endPress();
    }
  });
  ["pointerup", "pointercancel"].forEach(t => document.addEventListener(t, endPress));
  document.addEventListener("scroll", endPress, true);
  document.addEventListener("contextmenu", e => {
    const el = e.target.closest(selector);
    if (!el) {
      return;
    }
    e.preventDefault();
    if (!press.fired) {
      fire(el);
    }
  });
  /* capture phase: runs before the app's own click handler */
  document.addEventListener("click", e => {
    if (press.fired) {
      press.fired = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
