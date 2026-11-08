import { useRef, useState } from 'react';
import api from '../api/axios';
import { createAuthClient } from '../auth/authClient';
import { organizerCanCancel, activeRegistration, registrationStatus } from '../lib/registrationLifecycle';
import { publishRegistrationChange } from '../lib/registrationEvents';
import OrganizerConfirmDialog from './OrganizerConfirmDialog';
import { eventDate } from '../lib/events';
import './OrganizerRegistrationCancellation.css';

export default function OrganizerRegistrationCancellation({ event, registration }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [client] = useState(() => createAuthClient(api));
  const trigger = useRef(null), busy = useRef(false), reasonInput = useRef(null);
  const returnTarget = useRef(null);
  const eligible = organizerCanCancel(event, registration);
  async function confirm() {
    if (busy.current) return;
    if (!uncertain && (reason.trim().length < 5 || reason.trim().length > 500 || /[<>]/.test(reason) || [...reason].some(character => { const code = character.charCodeAt(0); return code < 32 && ![9, 10, 13].includes(code) || code === 127; }))) { setError('Enter a plain-text reason of 5–500 characters.'); reasonInput.current?.focus(); return; }
    busy.current = true; setPending(true); setError('');
    try {
      const path = `/events/${event._id}/registrations/${registration._id}`;
      const response = uncertain ? (await api.get(path, { timeout: 15000 })).data : await client.post(`${path}/cancel`, { reason: reason.trim(), confirmed: true });
      if (activeRegistration(response.data)) { setUncertain(false); setError('The saved registration is still active. Review the reason before confirming again.'); return; }
      returnTarget.current = document.querySelector('.participants-results-line') || document.querySelector('main');
      setNotice(`${registrationStatus(response.data)}. The saved status has been verified.`); setOpen(false); setUncertain(false);
      publishRegistrationChange(event._id);
    } catch (failure) {
      const status = failure.response?.status;
      if (failure.response?.data?.code === 'REGISTRATION_MIGRATION_REQUIRED') setError(failure.response.data.message);
      else if (!failure.response || status >= 500) { setUncertain(true); setError('The result is unconfirmed. Check the saved registration before taking another action.'); }
      else setError(status === 401 ? 'Your session ended. Log in again to check the saved status.' : status === 403 ? 'Your account or security check could not be verified.' : failure.response.data?.message || 'Cancellation could not be completed.');
    } finally { busy.current = false; setPending(false); }
  }
  return <div className="organizer-registration-cancel">{notice && <p role="status">{notice}</p>}{eligible && <button type="button" ref={trigger} className="participant-cancel-trigger" onClick={() => { returnTarget.current = trigger.current; setOpen(true); setError(''); }}>Cancel registration</button>}{open && <OrganizerConfirmDialog title="A change to their plans." returnFocus={returnTarget} pending={pending} onClose={() => { if (!pending) { setOpen(false); if (uncertain) publishRegistrationChange(event._id); } }} confirm={confirm} confirmLabel={uncertain ? 'Check saved status' : 'Confirm cancellation'} keepLabel={uncertain ? 'Close dialog' : 'Keep registration'} disabled={!uncertain && !eligible}>
    <div className="organizer-confirm-event"><strong>{event.title}</strong><time dateTime={event.date}>{eventDate(event.date)}</time></div><p>You’re cancelling {registration.attendee?.fullName ? `${registration.attendee.fullName}’s` : 'this student’s'} registration. Their seat will be released once the server confirms. The student can see your reason. Their submitted answers and the cancellation remain on record.</p>
    <label className="participant-reason-label" htmlFor={`cancel-reason-${registration._id}`}>Cancellation reason <span>(required, 5–500 characters)</span></label><textarea ref={reasonInput} id={`cancel-reason-${registration._id}`} maxLength={500} rows={4} value={reason} disabled={pending || uncertain} onChange={e => { setReason(e.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? `cancel-error-${registration._id}` : undefined} />{error && <p id={`cancel-error-${registration._id}`} className="organizer-management-error" role="alert">{error}</p>}
  </OrganizerConfirmDialog>}</div>;
}
