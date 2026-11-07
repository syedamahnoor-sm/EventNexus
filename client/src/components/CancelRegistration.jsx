import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useCancelRegistration from '../hooks/useCancelRegistration';
import { canCancelRegistration } from '../lib/cancellation';
import { eventDate } from '../lib/events';
import './CancelRegistration.css';

function ConfirmationDialog({ event, registration, onClose, onResult, refreshEvent, refreshRegistration, returnFocus }) {
  const dialog = useRef(null);
  const keep = useRef(null);
  const error = useRef(null);
  const action = useCancelRegistration({ event, registration, refreshEvent,
    onCancelled: () => onResult(null, 'cancelled'),
    onReconciled: record => {
      if (!record) onResult(null, 'absent');
      else if (record._id !== registration._id) onResult(record, 'replaced');
    },
  });
  useEffect(() => {
    const element = dialog.current;
    const triggerElement = returnFocus.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    keep.current.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (triggerElement?.isConnected) triggerElement.focus();
        else document.querySelector('[data-cancellation-result]')?.focus();
      });
    };
  }, [returnFocus]);
  useEffect(() => { if (action.error) error.current?.focus(); }, [action.error]);
  function close() {
    if (action.pending) return;
    if (action.uncertain) { refreshRegistration(); refreshEvent(); }
    onClose();
  }
  function containFocus(event) {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !buttons.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !buttons.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  return <dialog ref={dialog} className="cancel-dialog" aria-labelledby="cancel-title" aria-describedby="cancel-description" onKeyDown={containFocus} onCancel={event => { event.preventDefault(); close(); }}>
    <p className="eyebrow">YOUR REGISTRATION / A CHANGE OF PLANS</p>
    <h2 id="cancel-title">Make room<br />for what’s next?</h2>
    <div className="cancel-event"><strong>{event.title}</strong><time dateTime={event.date}>{eventDate(event.date)}</time></div>
    <p id="cancel-description">Your registration will be cancelled and your place released. You can register again while the event is open and seats are available.</p>
    {action.error && <p className="cancel-error" role="alert" tabIndex={-1} ref={error}>{action.error}</p>}
    <div className="cancel-dialog-actions"><button type="button" ref={keep} className="button lime" disabled={action.pending} onClick={close}>{action.uncertain ? 'Close dialog' : 'Keep registration'}</button><button type="button" className="button cancel-confirm" disabled={action.pending || (!action.uncertain && !canCancelRegistration(event, registration))} aria-busy={action.pending} onClick={action.uncertain ? action.check : action.cancel}>{action.pending ? 'Checking your registration…' : action.uncertain ? 'Check registration status' : 'Confirm cancellation'}</button></div>
    <p className="cancel-footnote">{action.pending ? 'Please keep this dialog open while we confirm the result.' : action.uncertain ? 'The result is unconfirmed. Check status before taking another action.' : 'Nothing changes until you confirm.'}</p>
  </dialog>;
}

export default function CancelRegistration({ event, registration, onResult, refreshEvent, refreshRegistration, disabled = false }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const trigger = useRef(null);
  const eligible = auth.status === 'ready' && auth.role === 'student' && canCancelRegistration(event, registration);
  function result(record, outcome) {
    setNotice(outcome === 'cancelled' ? 'Your registration has been cancelled. Your place has been released.' : 'No active registration is recorded. Your status has been refreshed.');
    setOpen(false);
    onResult(record, outcome);
  }
  if (auth.role !== 'student') return null;
  if (auth.status !== 'ready') return <p className="cancellation-closed" role="status">Verify your session before managing your registration.</p>;
  return <div className="registration-cancellation">
    {!registration && notice && <p className="cancel-success" data-cancellation-result tabIndex={-1} role="status">{notice}</p>}
    {registration && (eligible ? <button type="button" ref={trigger} className="cancel-trigger" disabled={disabled} onClick={() => setOpen(true)}>Cancel registration</button> : <p className="cancellation-closed">Cancellation is closed for this event. Your registration remains on record.</p>)}
    {open && registration && <ConfirmationDialog event={event} registration={registration} onClose={() => setOpen(false)} onResult={result} refreshEvent={refreshEvent} refreshRegistration={refreshRegistration} returnFocus={trigger} />}
  </div>;
}
