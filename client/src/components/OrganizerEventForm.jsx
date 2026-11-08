import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';
import { createAuthClient } from '../auth/authClient';
import { EVENT_FIELDS, clearEventDraft, eventFormPayload, eventFormValues, eventMatches, readEventDraft, storeEventDraft, validateEventForm } from '../lib/eventManagement';
import { publishEventChange } from '../lib/eventChanges';
import { eventDate } from '../lib/events';
import { dashboardEventTime } from '../lib/studentDashboard';
import OrganizerEventFields from './OrganizerEventFields';
import OrganizerConfirmDialog from './OrganizerConfirmDialog';
import RegistrationQuestionBuilder from './RegistrationQuestionBuilder';
import QuestionDefinitionSummary from './QuestionDefinitionSummary';
import Arrow from './Arrow';

export default function OrganizerEventForm({ event = null, reload }) {
  const { user } = useAuth(), navigate = useNavigate();
  const [draft, setDraft] = useState(() => readEventDraft(user.id, event?._id) || { values: eventFormValues(event), base: eventFormValues(event), version: event?.__v || 0, creationKey: globalThis.crypto.randomUUID(), uncertain: false, submitted: null });
  const [review, setReview] = useState(false), [errors, setErrors] = useState({}), [feedback, setFeedback] = useState(''), [pending, setPending] = useState(false), [discard, setDiscard] = useState(false);
  const [client] = useState(() => createAuthClient(api));
  const [questionChangesAcknowledged, setQuestionChangesAcknowledged] = useState(false);
  const busy = useRef(false), form = useRef(null), status = useRef(null);
  const dirty = JSON.stringify(draft.values) !== JSON.stringify(draft.base);
  const conflict = event && (event.__v || 0) !== draft.version;
  const needsQuestionAcknowledgment = event?.registeredCount > 0 && JSON.stringify(draft.values.registrationQuestions || []) !== JSON.stringify(eventFormValues(event).registrationQuestions);
  function keep(next) { setDraft(next); storeEventDraft(user.id, event?._id, next); }
  useEffect(() => {
    if (!dirty && !draft.uncertain && !pending) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, draft.uncertain, pending]);
  useEffect(() => { if (feedback) status.current?.focus(); }, [feedback]);
  function change(e) { const { name, value } = e.target; keep({ ...draft, values: { ...draft.values, [name]: value } }); setErrors(current => ({ ...current, [name]: undefined })); }
  function changeQuestions(questions) { keep({ ...draft, questionChangesAcknowledged: false, values: { ...draft.values, registrationQuestions: questions } }); setQuestionChangesAcknowledged(false); setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith('question') && !key.startsWith('option') && key !== 'registrationQuestions'))); }
  function success(saved, message) {
    clearEventDraft(user.id, event?._id); publishEventChange(saved._id);
    navigate(`/events/${saved._id}`, { replace: true, state: { managementNotice: message } });
  }
  function startReview(e) {
    e.preventDefault(); if (busy.current || conflict || draft.uncertain) return;
    const invalid = validateEventForm(draft.values); setErrors(invalid); setFeedback('');
    if (Object.keys(invalid).length) { requestAnimationFrame(() => form.current?.querySelector('[aria-invalid=true]')?.focus()); return; }
    setReview(true); requestAnimationFrame(() => document.getElementById('event-review-heading')?.focus());
  }
  async function save(retry = false) {
    if (busy.current || (!retry && (conflict || draft.uncertain))) return;
    if (needsQuestionAcknowledgment && !(questionChangesAcknowledged || (retry && draft.questionChangesAcknowledged))) { setFeedback('Acknowledge how question changes affect future registrations before saving.'); return; }
    const submitted = retry ? draft.submitted : eventFormPayload(draft.values);
    if (!submitted) return;
    if (!retry) { const invalid = validateEventForm(draft.values); if (Object.keys(invalid).length) { setErrors(invalid); setReview(false); setFeedback('Review the highlighted details before saving.'); return; } }
    busy.current = true; setPending(true); setFeedback('');
    // Retain the exact request and recovery key before it can reach the server.
    const attempt = { ...draft, submitted, uncertain: true, questionChangesAcknowledged: questionChangesAcknowledged || draft.questionChangesAcknowledged }; keep(attempt);
    try {
      const response = event ? await client.patch(`/events/${event._id}`, submitted, { headers: { 'X-Event-Version': String(draft.version), ...(attempt.questionChangesAcknowledged ? { 'X-Confirm-Question-Changes': 'true' } : {}) } }) : await client.post('/events', submitted, { headers: { 'X-Idempotency-Key': draft.creationKey } });
      success(event ? response.data : response.event, event ? 'Your event changes are saved.' : 'Your event is published and ready to discover.');
    } catch (failure) {
      const code = failure.response?.status;
      if (!failure.response || code >= 500 || (!event && code === 409)) {
        setFeedback('The save could not be confirmed. Your exact submission is kept. Check the saved event before trying again.');
      } else {
        keep({ ...attempt, uncertain: false });
        const fields = failure.response.data?.errors?.fieldErrors || {};
        setErrors(Object.fromEntries(Object.entries(fields).filter(([name]) => EVENT_FIELDS.includes(name)).map(([name, messages]) => [name, messages[0]])));
        if (code === 400) setReview(false);
        if (code === 409) reload?.();
        setFeedback(code === 401 ? 'Your session ended. Your draft is kept; log in again to continue.' : code === 403 ? 'Your account or security check could not be verified. Reconnect and try again.' : failure.response.data?.message || 'The event could not be saved. Your draft is kept.');
      }
    } finally { busy.current = false; setPending(false); }
  }
  async function checkSaved() {
    if (busy.current) return;
    busy.current = true; setPending(true); setFeedback('');
    try {
      const { data } = await api.get(event ? `/organizer/events/${event._id}` : `/organizer/events/creation/${draft.creationKey}`, { timeout: 15000 });
      if (data.data && (!event || eventMatches(data.data, draft.submitted))) { success(data.data, 'The saved event has been verified. These details are on the noticeboard.'); return; }
      if (event && data.data && (data.data.__v || 0) !== draft.version) { keep({ ...draft, uncertain: false }); reload?.(); setFeedback('The event has changed. Your draft is kept. Review the latest saved version before another submission.'); }
      else setFeedback('No matching save is confirmed yet. You can check again or retry the exact same submission safely.');
    } catch { setFeedback('We couldn’t check the saved event. Reconnect and check again; your submission is still unconfirmed.'); }
    finally { busy.current = false; setPending(false); }
  }
  function reconcile() {
    const latest = eventFormValues(event);
    const values = Object.fromEntries(EVENT_FIELDS.map(field => [field, JSON.stringify(draft.values[field]) === JSON.stringify(draft.base?.[field]) ? latest[field] : draft.values[field]]));
    keep({ ...draft, values, base: latest, version: event.__v || 0, uncertain: false, questionChangesAcknowledged: false }); setQuestionChangesAcknowledged(false); setReview(false); setFeedback('Your edits are kept. Untouched fields now use the latest saved details. Review everything before saving.');
  }
  const payload = review ? eventFormPayload(draft.values) : null;
  return <div className="event-editor-form-area" ref={form}>
    <p className="event-editor-draft-note">Your draft stays in this tab, including after refresh. {event ? 'Existing registrations are preserved.' : 'Nothing is published until you review and submit.'} Signing out discards the draft.</p>
    {feedback && <p className="event-editor-feedback" ref={status} role="alert" tabIndex={-1}>{feedback}</p>}
    {conflict && <div className="event-editor-conflict"><h2>Something changed.</h2><p>Your event was updated elsewhere. Your edits have not been overwritten.</p><details><summary>Compare the current saved details</summary><dl>{EVENT_FIELDS.filter(field => JSON.stringify(draft.values[field]) !== JSON.stringify(eventFormValues(event)[field])).map(field => <div key={field}><dt>{field}</dt><dd>{field === 'registrationQuestions' ? <QuestionDefinitionSummary questions={eventFormValues(event).registrationQuestions} /> : eventFormValues(event)[field] || 'Not provided'}</dd></div>)}</dl></details><button type="button" className="text-link" disabled={pending || draft.uncertain} onClick={reconcile}>Use latest version and keep my edits <Arrow /></button></div>}
    {draft.uncertain && <section className="event-editor-recovery" aria-label="Unconfirmed submission"><h2>Let’s check the noticeboard.</h2><p>Your last save has an uncertain result. Check it before making a different submission.</p><div><button type="button" className="button lime" onClick={checkSaved} disabled={pending}>{pending ? 'Checking…' : 'Check saved event'} <Arrow /></button><button type="button" className="text-link" disabled={pending || conflict} onClick={() => save(true)}>Retry same submission</button></div></section>}
    {review ? <section className="event-editor-review" aria-labelledby="event-review-heading"><p className="eyebrow">ONE LAST LOOK / BEFORE IT GOES LIVE</p><h2 id="event-review-heading" tabIndex={-1}>Ready to make it happen?</h2><dl><div><dt>Event</dt><dd>{payload.title}</dd></div><div><dt>Category</dt><dd>{payload.category}</dd></div><div><dt>Date & time</dt><dd>{eventDate(payload.date)} · {dashboardEventTime(payload.date)}</dd></div><div><dt>Venue</dt><dd>{payload.location}</dd></div><div><dt>Capacity</dt><dd>{payload.capacity} places</dd></div><div><dt>Description</dt><dd className="event-review-description">{payload.description}</dd></div><div><dt>Image</dt><dd>{payload.imageUrl || 'EventNexus artwork fallback'}{payload.imageUrl && <small>{payload.imageAlt}</small>}</dd></div><div><dt>Registration questions</dt><dd><QuestionDefinitionSummary questions={payload.registrationQuestions} /></dd></div></dl>{needsQuestionAcknowledgment && <label className="question-change-acknowledgment"><input type="checkbox" checked={questionChangesAcknowledged} onChange={e => setQuestionChangesAcknowledged(e.target.checked)} disabled={pending || draft.uncertain} />I understand that existing answers keep the original questions and these changes apply to future registrations.</label>}<p>{event ? 'Your changes will update the existing event. Student registrations and their historical snapshots stay intact.' : 'Publishing makes this event visible in upcoming campus discovery.'}</p><div className="event-editor-submit-line"><button type="button" className="button lime" onClick={() => save()} disabled={pending || draft.uncertain || conflict || (needsQuestionAcknowledgment && !questionChangesAcknowledged)}>{pending ? 'Saving your event…' : event ? 'Save event changes' : 'Publish event'} <Arrow diagonal /></button><button type="button" className="text-link" disabled={pending || draft.uncertain} onClick={() => setReview(false)}>Back to editing</button></div></section> : <form onSubmit={startReview} noValidate aria-busy={pending}><fieldset disabled={pending || draft.uncertain}><legend className="sr-only">{event ? 'Edit your event' : 'Create an event'}</legend><OrganizerEventFields values={draft.values} errors={errors} change={change} registeredCount={event?.registeredCount || 0} /><RegistrationQuestionBuilder questions={draft.values.registrationQuestions || []} onChange={changeQuestions} errors={errors} hasRegistrations={event?.registeredCount > 0} /></fieldset><div className="event-editor-submit-line"><button className="button lime" type="submit" disabled={pending || draft.uncertain || conflict || (event && !dirty)}>Review {event ? 'changes' : 'event'} <Arrow diagonal /></button><button type="button" className="text-link" disabled={pending || draft.uncertain} onClick={() => setDiscard(true)}>Discard draft</button></div></form>}
    {discard && <OrganizerConfirmDialog title="Leave this draft behind?" keepLabel="Keep editing" confirmLabel="Discard draft" pending={false} onClose={() => setDiscard(false)} confirm={() => { clearEventDraft(user.id, event?._id); navigate('/organizer/dashboard'); }}><p>Your unsaved event details will be discarded. Nothing already saved on the server is removed.</p></OrganizerConfirmDialog>}
  </div>;
}
