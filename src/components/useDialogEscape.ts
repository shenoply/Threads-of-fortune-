import { useEffect, useRef, type RefObject } from 'react';

/** Escape, and the phone's Back (App sends it as an Escape to the topmost dialog), closes this panel
 *  when it is the one on top, and only this panel: the key is marked as handled so App does not also
 *  step back a screen. Unlike useEscapeClose it copes with a panel opened inside another (the
 *  wardrobe inside a shop's catalogue, a sheet inside the town panel): the innermost one goes first.
 *  `onClose` returning false means it had nothing to close, and the key passes on. */
export function useDialogEscape(ref: RefObject<HTMLElement>, onClose: () => void | boolean, enabled = true) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!enabled) return;
    const me = ref.current;
    if (me) me.setAttribute('data-esc', '');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const el = ref.current;
      if (!el || !el.isConnected) return;
      const after = (x: Element) => x !== el && !!(el.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
      // another panel with its own Escape sits later in the page (inside this one or over it)
      if ([...document.querySelectorAll('[data-esc]')].some(after)) return;
      // any other dialog laid over this one (not inside it) closes itself first
      if ([...document.querySelectorAll('[role=dialog], [role=alertdialog]')].some((x) => after(x) && !el.contains(x))) return;
      if (close.current() === false) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); me?.removeAttribute('data-esc'); };
  }, [ref, enabled]);
}
