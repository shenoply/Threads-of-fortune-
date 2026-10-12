import { useEffect, useRef, type RefObject } from 'react';

/** Escape (and the phone's back gesture, which App turns into an Escape on the topmost dialog) closes
 *  this panel when it is the one on top. Caught on the way down, so nothing under it acts on the same
 *  key; a dialog opened over this one is left to close itself first. */
export function useEscapeClose(ref: RefObject<HTMLElement>, onClose: () => void, enabled = true) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const me = ref.current;
      if (!me) return;
      const dialogs = [...document.querySelectorAll('[role=dialog]')];
      const top = dialogs[dialogs.length - 1];
      // another dialog sits over this one (later in the page and not inside it): it goes first
      if (top && top !== me && !me.contains(top) && (me.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ref, enabled]);
}
