import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';
import { createAuthClient } from '../auth/authClient';
import { canManageEvent } from '../lib/eventManagement';
import { publishEventChange } from '../lib/eventChanges';
import { eventDate } from '../lib/events';
import OrganizerConfirmDialog from './OrganizerConfirmDialog';
import './OrganizerEventManagement.css';

function LifecycleDialog({ event, action, close, complete, returnFocus }) {
  const [record, setRecord] = useState(event);
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState('');
  const [client] = useState(() => createAuthClient(api));
  const busy = useRef(false);
  async function run() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (uncertain) {
        const { data } = await api.get(`/organizer/events/${event._id}`, { timeout: 15000 });
        if (action === 'cancel' && data.data.status === 'cancelled') { complete(data.data, 'The saved event is cancelled. Registration records remain intact.'); return; }
        setRecord(data.data); setUncertain(false); setError('Current saved status checked. Review this event before confirming again.');
      } else {
        const options = { headers: { 'X-Event-Version': String(record.__v || 0) } };
        const response = action === 'delete' ? await client.delete(`/events/${event._id}`, {}, options) : await client.post(`/events/${event._id}/cancel`, {}, options);
        complete(response.data || null, action === 'delete' ? 'Event deleted. No student registrations were removed.' : 'Event cancelled. Existing registration records are preserved.');
      }
    } catch (failure) {
      const code = failure.response?.status;
      if (uncertain && code === 404 && action === 'delete') { complete(null, 'This event is no longer available in your workspace.'); return; }
      if (!failure.response || code >= 500) { setUncertain(true); setError('The result could not be confirmed. Check the saved event before taking another action.'); }
      else if (code === 401) setError('Your session ended. Log in again to manage this event.');
      else if (code === 403) setError('Your account or security check could not be verified. Try again after reconnecting.');
      else if (code === 409) { setUncertain(true); setError(failure.response.data.message || 'The event changed. Check its saved state.'); }
      else setError(failure.response.data.message || 'The event could not be changed.');
    } finally { busy.current = false; setPending(false); }
  }
  return <OrganizerConfirmDialog returnFocus={returnFocus} title={action === 'delete' ? 'Remove this event?' : 'A change of plans?'} pending={pending} onClose={close} confirm={run} confirmLabel={uncertain ? 'Check saved event' : action === 'delete' ? 'Confirm deletion' : 'Confirm cancellation'} keepLabel={uncertain ? 'Close dialog' : 'Keep event'} disabled={!uncertain && !canManageEvent(record)}>
    <div className="organizer-confirm-event"><strong>{record.title}</strong><time dateTime={record.date}>{eventDate(record.date)}</time></div>
    <p>{action === 'delete' ? 'This permanently removes a future event with no registrations. If anyone registers before confirmation, deletion will be refused.' : 'Registration will close immediately and the event will leave upcoming discovery. Existing student registrations and their details stay on record. Students can see the cancelled status; no automatic messages are sent.'}</p>
    {error && <p className="organizer-management-error" role="alert">{error}</p>}
  </OrganizerConfirmDialog>;
}
export default function OrganizerEventActions({ event, onChange, onDelete, disabled = false }) {
  const { user } = useAuth();
  const [action, setAction] = useState(null), [notice, setNotice] = useState('');
  const trigger = useRef(null);
  const owner = typeof event.organizer === 'object' ? event.organizer?._id : event.organizer;
  // Dashboard previews are already server-scoped; populated public records must match ownership.
  if (user?.role !== 'organizer' || (owner && String(owner) !== user.id)) return null;
  function complete(record, message) {
    setAction(null); setNotice(message); publishEventChange(event._id);
    onChange?.(record, message);
    if (!record) onDelete?.(message);
  }
  return <div className="organizer-event-management">
    <Link className="text-link organizer-participants-link" to={`/organizer/events/${event._id}/participants`}>Manage participants ↗</Link>
    {notice && <p role="status" tabIndex={-1} data-event-management-result>{notice}</p>}
    {canManageEvent(event) && <div className="organizer-event-management-links"><Link className="organizer-edit-link" to={`/organizer/events/${event._id}/edit`}>Edit event ↗</Link><button type="button" disabled={disabled} onClick={e => { trigger.current = e.currentTarget; setAction('cancel'); }}>Cancel event</button>{event.registeredCount === 0 && <button className="organizer-delete-trigger" type="button" disabled={disabled} onClick={e => { trigger.current = e.currentTarget; setAction('delete'); }}>Delete event</button>}</div>}
    {action && <LifecycleDialog returnFocus={trigger} event={event} action={action} close={() => setAction(null)} complete={complete} />}
  </div>;
}
