import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Arrow from './Arrow';
import { useAuth } from '../auth/AuthContext';
import { REGISTRATION_FIELDS, initialStudentDetails, registrationPayload, validateRegistration } from '../lib/registration';
import { createAuthClient } from '../auth/authClient';
import api from '../api/axios';

export default function StudentRegistrationForm({ event, onConfirmed, refreshEvent, checkRegistration }) {
  const { user } = useAuth();
  const [values, setValues] = useState(() => initialStudentDetails(user));
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const busy = useRef(false);
  const root = useRef(null);
  const title = useRef(null);
  const client = useRef(null);
  if (client.current === null) client.current = createAuthClient(api);
  useEffect(() => { if (review) title.current?.focus(); }, [review]);
  useEffect(() => { if (feedback) root.current?.querySelector('[role="alert"]')?.focus(); }, [feedback]);
  function change(event) {
    setValues(current => ({ ...current, [event.target.name]: event.target.value }));
    setErrors(current => ({ ...current, [event.target.name]: undefined }));
  }
  async function submit(eventSubmit) {
    eventSubmit.preventDefault();
    if (busy.current || uncertain) return;
    const invalid = validateRegistration(values);
    setErrors(invalid);
    setFeedback(null);
    if (Object.keys(invalid).length) {
      setReview(false);
      requestAnimationFrame(() => root.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    if (!review) { setReview(true); return; }
    busy.current = true;
    setPending(true);
    try {
      const data = await client.current.post(`/events/${event._id}/register`, registrationPayload(values));
      onConfirmed(data.data);
      refreshEvent();
    } catch (error) {
      const status = error.response?.status;
      if (status === 400 && Array.isArray(error.response.data?.errors)) {
        setErrors(Object.fromEntries(error.response.data.errors.filter(item => item.field.startsWith('attendee.')).map(item => [item.field.slice(9), item.message])));
        setReview(false);
        setFeedback('Please check your details and review them again.');
      } else if (status === 409) {
        setFeedback(error.response.data.message || 'Event availability changed. Please check again.');
        refreshEvent(); checkRegistration();
      } else if (status === 401) {
        setFeedback('Your session ended. Please log in again to complete registration.');
      } else if (status === 403) {
        setFeedback('Your session or security check could not be verified. Please check your session and try again.');
      } else if (!error.response || status >= 500) {
        setUncertain(true);
        setFeedback('We couldn’t confirm the result. Check your registration before trying again; your request may have reached the server.');
      } else setFeedback('Registration could not be completed. Please try again shortly.');
    } finally { busy.current = false; setPending(false); }
  }
  async function reconcile() {
    if (busy.current) return;
    busy.current = true; setPending(true);
    try {
      const { data } = await api.get(`/events/${event._id}/registration`, { timeout: 10000 });
      refreshEvent();
      if (data.data) onConfirmed(data.data);
      else { setUncertain(false); setFeedback('No registration is recorded yet. You may review and submit again.'); }
    } catch { setFeedback('Your registration is still unconfirmed. Reconnect and check again before resubmitting.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section ref={root} className="en-registration-form" aria-labelledby="registration-form-title"><div className="registration-form-header"><p className="eyebrow">{review ? '02 / ONE LAST LOOK' : '01 / A LITTLE ABOUT YOU'}</p><h2 id="registration-form-title" ref={title} tabIndex={-1}>{review ? 'Looks like you?' : 'Make it official.'}</h2><p>{review ? 'Check the details below. Only the final submit reserves a place.' : 'The details that connect you to this experience. All fields are required unless marked optional.'}</p></div>
    {feedback && <p className="registration-form-alert" tabIndex={-1} role="alert">{feedback}</p>}
    <form onSubmit={submit} noValidate aria-busy={pending}>
      {review ? <dl className="registration-review">{REGISTRATION_FIELDS.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{values[field.name].trim() || 'Not provided'}</dd></div>)}</dl> : <fieldset className="registration-fields" disabled={pending}><legend className="sr-only">Student details</legend>{REGISTRATION_FIELDS.map(field => <div className="registration-field" key={field.name}><label htmlFor={`attendee-${field.name}`}>{field.label} {field.optional && <span>(optional)</span>}</label><input id={`attendee-${field.name}`} name={field.name} type={field.type || 'text'} autoComplete={field.autocomplete || 'off'} maxLength={field.max} value={values[field.name]} onChange={change} required={!field.optional} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] || field.hint ? `${field.name}-help` : undefined} />{(errors[field.name] || field.hint) && <p id={`${field.name}-help`} className={errors[field.name] ? 'registration-field-error' : 'registration-field-hint'}>{errors[field.name] || field.hint}</p>}</div>)}</fieldset>}
      <p className="registration-data-note">These details are saved with this event registration and available to its organizer. They do not change your account profile.</p>
      <div className="registration-form-actions">{uncertain ? <button className="button lime" type="button" onClick={reconcile} disabled={pending}>{pending ? 'Checking…' : 'Check registration status'} <Arrow /></button> : <button className="button lime" type="submit" disabled={pending}>{pending ? 'Confirming your place…' : review ? 'Submit registration' : 'Review my details'} <Arrow diagonal /></button>}{review && <button type="button" className="text-link" disabled={pending || uncertain} onClick={() => { setReview(false); requestAnimationFrame(() => document.getElementById('attendee-fullName')?.focus()); }}>Edit details</button>}</div>
    </form><Link className="registration-exit" to={`/events/${event._id}`} onClick={event => { if (pending) event.preventDefault(); }} aria-disabled={pending}>Back to event details</Link>
  </section>;
}
