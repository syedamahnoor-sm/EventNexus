import { useEffect, useId, useRef } from 'react';
import './OrganizerEventManagement.css';

// A successful participant action can replace its trigger with a stable results
// region before closing. Read that destination when focus is actually restored.
function restoreDialogFocus(targetRef, fallback) {
  const target = targetRef?.current || fallback;
  if (target?.isConnected) target.focus();
  else (document.querySelector('[data-event-management-result]') || document.querySelector('main'))?.focus();
}

export default function OrganizerConfirmDialog({ title, children, pending, onClose, confirm, confirmLabel, keepLabel = 'Keep event', disabled = false, returnFocus }) {
  const dialog = useRef(null), keep = useRef(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current, previous = returnFocus?.current || document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal(); keep.current.focus(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; requestAnimationFrame(() => restoreDialogFocus(returnFocus, previous)); };
  }, [returnFocus]);
  function keys(event) {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled),input:not(:disabled),select:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !buttons.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !buttons.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  return <dialog ref={dialog} className="organizer-confirm-dialog" aria-labelledby={id} aria-busy={pending} onKeyDown={keys} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}>
    <p className="eyebrow">YOUR EVENT / A CONSIDERED CHANGE</p><h2 id={id}>{title}</h2>{children}
    <div className="organizer-confirm-buttons"><button ref={keep} type="button" className="button lime" disabled={pending} onClick={onClose}>{keepLabel}</button><button type="button" className="button organizer-destructive" disabled={pending || disabled} onClick={confirm}>{pending ? 'Confirming…' : confirmLabel}</button></div>
    <p className="organizer-confirm-footnote">{pending ? 'Please keep this dialog open while the server confirms the result.' : 'Nothing changes until you explicitly confirm.'}</p>
  </dialog>;
}
