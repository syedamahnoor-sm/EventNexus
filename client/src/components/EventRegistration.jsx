import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Arrow from './Arrow';

export default function EventRegistration({ event, availability, refresh }) {
  const [attempt, setAttempt] = useState(0);
  const [account, setAccount] = useState({ state: 'checking', attempt: -1 });
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const mutation = useRef(null);
  const uncertain = useRef(false);
  const checking = account.attempt !== attempt;

  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      try {
        const { data } = await api.get('/auth/me', { signal: controller.signal, timeout: 10000 });
        if (data.user.role !== 'student') {
          if (!controller.signal.aborted) setAccount({ state: 'organizer', attempt });
          return;
        }
        const response = await api.get('/registrations/me', { signal: controller.signal, timeout: 10000 });
        const registered = response.data.data.some(item => (item.event?._id || item.event) === event._id);
        if (!controller.signal.aborted) {
          setAccount({ state: registered ? 'registered' : 'student', attempt });
          if (uncertain.current) { refresh(); uncertain.current = false; }
        }
      } catch (error) {
        if (!controller.signal.aborted) setAccount({ state: error.response?.status === 401 ? 'guest' : 'error', attempt });
      }
    }
    check();
    return () => controller.abort();
  }, [event._id, attempt, refresh]);

  useEffect(() => () => mutation.current?.abort(), []);

  async function register() {
    if (busy.current || checking || account.state !== 'student' || !availability.canRegister) return;
    busy.current = true;
    setSubmitting(true);
    setFeedback(null);
    const controller = new AbortController();
    mutation.current = controller;
    let sent = false;
    try {
      const { data } = await api.get('/auth/csrf-token', { signal: controller.signal, timeout: 10000 });
      sent = true;
      await api.post(`/events/${event._id}/register`, {}, {
        headers: { 'X-CSRF-Token': data.csrfToken }, signal: controller.signal, timeout: 15000,
      });
      if (controller.signal.aborted) return;
      setAccount({ state: 'registered', attempt });
      setFeedback({ type: 'success', text: 'You’re registered. Your place is confirmed.' });
      refresh();
    } catch (error) {
      if (controller.signal.aborted) return;
      const status = error.response?.status;
      if (status === 401) {
        setAccount({ state: 'guest', attempt });
        setFeedback({ type: 'error', text: 'Your session has ended. Please log in again.' });
      } else if (status === 409) {
        setFeedback({ type: 'error', text: error.response.data.message || 'Availability has changed. Checking your registration…' });
        uncertain.current = true;
        setAttempt(value => value + 1);
        refresh();
      } else if (sent && (!error.response || status >= 500)) {
        setFeedback({ type: 'error', text: 'We couldn’t confirm the result. Check your registration before trying again.' });
        uncertain.current = true;
        setAccount({ state: 'error', attempt });
      } else {
        if (status === 403) setAccount({ state: 'error', attempt });
        setFeedback({ type: 'error', text: status === 403 ? 'Your session or security token could not be verified. Please check your session and try again.' : 'Registration could not be completed. Please try again.' });
      }
    } finally {
      busy.current = false;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  function renderAction() {
    if (checking) return <p role="status">Checking your session and registration…</p>;
    if (account.state === 'registered') return <>
      <p className="registered-note">✓ Your registration is recorded.</p>
      <Link className="text-link" to="/student/dashboard">My events <Arrow /></Link>
    </>;
    if (!availability.canRegister) return <p>New registrations are unavailable for this event.</p>;
    if (account.state === 'guest') return <>
      <Link className="button lime" to="/login" state={{ from: `/events/${event._id}` }}>Log in to register <Arrow diagonal /></Link>
      <p>A student account is required to reserve a place.</p>
    </>;
    if (account.state === 'organizer') return <p>Registration is available to student accounts. You’re signed in as an organizer.</p>;
    if (account.state === 'error') return <>
      <p>We couldn’t verify your session or registration.</p>
      <button className="button secondary" onClick={() => setAttempt(value => value + 1)}>Check again <Arrow /></button>
    </>;
    return <button className="button lime" onClick={register} disabled={submitting} aria-busy={submitting}>
      {submitting ? 'Reserving your place…' : 'Register for this event'}<Arrow diagonal />
    </button>;
  }

  return <aside className="registration-panel" aria-labelledby="registration-heading">
    <p className="eyebrow">YOUR PLACE IN THE STORY</p>
    <h2 id="registration-heading">{account.state === 'registered' && !checking ? 'You’re on the list.' : 'Be part of it.'}</h2>
    <div className={`registration-status status-${availability.state}`}><span aria-hidden="true" />{availability.title}</div>
    <p className="registration-copy">{availability.description}</p>
    <div className="seat-count"><strong>{availability.remaining ?? '—'}</strong><span>places remaining<br />{availability.capacity ? `of ${availability.capacity} total places` : 'Capacity unconfirmed'}</span></div>
    {availability.capacity && <meter className="seat-meter" min="0" max={availability.capacity} value={availability.remaining} aria-label={`${availability.remaining} seats remaining out of ${availability.capacity}`} />}
    <div className="registration-action">{renderAction()}</div>
    {feedback && <p className={`registration-feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
    <p className="registration-footnote">Availability is confirmed when your registration is accepted.</p>
  </aside>;
}
