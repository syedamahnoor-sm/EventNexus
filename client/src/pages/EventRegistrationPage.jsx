import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Arrow from '../components/Arrow';
import CancelRegistration from '../components/CancelRegistration';
import EventArtwork from '../components/EventArtwork';
import StudentRegistrationForm from '../components/StudentRegistrationForm';
import RegistrationAnswerSummary from '../components/RegistrationAnswerSummary';
import useEventDetails from '../hooks/useEventDetails';
import useMyEventRegistration from '../hooks/useMyEventRegistration';
import { eventAvailability } from '../lib/eventAvailability';
import { eventDate } from '../lib/events';
import { useAuth } from '../auth/AuthContext';
import './EventRegistrationPage.css';

function RegistrationContent({ id }) {
  const details = useEventDetails(id);
  const account = useMyEventRegistration(id);
  const [submitted, setSubmitted] = useState(false);
  const [cancellation, setCancellation] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const confirmation = useRef(null);
  const event = details.event;
  const registration = account.registration;
  const eventDateValue = event?.date;
  useEffect(() => {
    const deadline = new Date(eventDateValue).getTime();
    if (!Number.isFinite(deadline) || deadline <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, deadline - Date.now() + 25), 2147483647));
    return () => clearTimeout(timer);
  }, [eventDateValue, now]);
  useEffect(() => {
    const previous = document.title;
    document.title = event ? `${registration ? 'Registration confirmed' : 'Register'} | ${event.title} | EventNexus` : 'Event registration | EventNexus';
    return () => { document.title = previous; };
  }, [event, registration]);
  useEffect(() => { if (registration) confirmation.current?.focus(); }, [registration]);
  if (!event) return <main id="main" tabIndex={-1} className="registration-page wrap"><p className="eyebrow">EVENT REGISTRATION</p><h1>{details.loading ? 'A place for you.' : 'A small interruption.'}</h1><p role={details.loading ? 'status' : 'alert'}>{details.loading ? 'Loading event details…' : details.error === 'missing' || details.error === 'invalid' ? 'This event could not be found. Check the link or explore the campus noticeboard.' : 'We couldn’t load this event. Please try again.'}</p>{details.error === 'network' && <button className="button" onClick={details.refresh}>Try again <Arrow /></button>}<Link className="text-link" to="/events">Explore events <Arrow /></Link></main>;
  const availability = eventAvailability(event, now);
  const closed = ['cancelled', 'completed', 'past', 'unconfirmed'].includes(availability.state);
  return <main id="main" tabIndex={-1} className="registration-page wrap"><nav className="registration-breadcrumb" aria-label="Breadcrumb"><Link to={`/events/${id}`}>← Event details</Link><span>YOUR CAMPUS / YOUR PLACE</span></nav><header className="registration-page-heading entrance"><p className="eyebrow">{registration ? 'REGISTRATION / CONFIRMED' : cancellation ? 'REGISTRATION / NO ACTIVE PLACE' : 'EVENT REGISTRATION'}</p><h1>{registration ? <>You’re on<br /><em>the list.</em></> : cancellation ? <>Your plans.<br /><em>Your call.</em></> : <>Good things start<br />with <em>showing up.</em></>}</h1></header><div className="registration-page-layout"><aside className="registration-event-summary"><EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} priority /><div className="registration-event-info"><p className="eyebrow">{event.category}</p><h2>{event.title}</h2><dl><div><dt>WHEN</dt><dd>{eventDate(event.date)}<br />{Number.isFinite(new Date(event.date).getTime()) ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(event.date)) : 'Time to be announced'}</dd></div><div><dt>WHERE</dt><dd>{event.location}</dd></div></dl><p className="registration-availability" role="status">{details.loading ? 'Refreshing availability…' : details.error ? 'Availability could not be refreshed.' : registration ? 'Your registration is recorded.' : `${availability.title}${availability.canRegister ? ` · ${availability.remaining} places available` : ''}`}</p></div></aside>
    {registration ? <section className="registration-confirmation" aria-labelledby="confirmation-title"><p className="eyebrow">YOUR PLACE IS RECORDED</p><h2 id="confirmation-title" ref={confirmation} tabIndex={-1}>{closed ? 'Your place, recorded.' : 'See you there.'}</h2><p role="status">{submitted === registration._id ? 'Your registration was submitted successfully.' : 'You’re already registered for this event.'}</p><p>{['cancelled', 'completed'].includes(event.status) || new Date(event.date).getTime() <= now ? 'Registration remains on record. Check the current event status before making plans.' : 'Your place is confirmed in EventNexus. The event details are here whenever you need them.'}</p><dl><div><dt>STATUS</dt><dd>{closed ? 'Registration recorded' : 'Registration confirmed'}{!availability.canRegister && availability.state !== 'full' ? ` · ${availability.title}` : ''}</dd></div>{registration._id && <div><dt>REGISTRATION REFERENCE</dt><dd className="registration-reference">{registration._id}</dd></div>}</dl><RegistrationAnswerSummary answers={registration.answers} /><CancelRegistration refreshRegistration={account.refresh} event={event} registration={registration} disabled={account.loading || account.error || Boolean(details.error)} refreshEvent={details.refresh} onResult={(record, outcome) => { account.accept(record); setSubmitted(false); setCancellation(outcome); }} /><Link className="button lime" to={`/events/${id}`}>Back to event <Arrow diagonal /></Link><Link className="text-link" to="/events">Keep exploring <Arrow /></Link></section> : cancellation ? <section className="cancelled-registration-state" data-cancellation-result tabIndex={-1}><p className="eyebrow">REGISTRATION / NO ACTIVE PLACE</p><h2>{cancellation === 'cancelled' ? 'Plans change.' : 'You’re up to date.'}</h2><p role="status">{cancellation === 'cancelled' ? 'Your registration has been cancelled and your place released.' : 'No active registration is recorded. Your status has been refreshed.'}</p><Link className="button lime" to={`/events/${id}`}>Back to event <Arrow diagonal /></Link>{availability.canRegister && <button className="text-link" onClick={() => setCancellation(null)}>Start a new registration <Arrow /></button>}</section> : account.loading ? <section className="registration-form-state" role="status"><h2>One moment.</h2><p>Checking your existing registration…</p></section> : account.error || details.error ? <section className="registration-form-state"><h2>Let’s check first.</h2><p role="alert">Your registration or event availability couldn’t be verified. Please reconnect before submitting.</p><button className="button" onClick={() => { account.refresh(); details.refresh(); }}>Check again <Arrow /></button></section> : !availability.canRegister ? <section className="registration-form-state"><h2>{availability.title}</h2><p role="alert">{availability.description}</p><Link className="text-link" to="/events">Find your next experience <Arrow /></Link></section> : <StudentRegistrationForm event={event} onConfirmed={record => { setSubmitted(record._id); setCancellation(null); account.accept(record); }} refreshEvent={details.refresh} checkRegistration={account.refresh} />}
  </div></main>;
}
export default function EventRegistrationPage() { const { id } = useParams(); const { user } = useAuth(); return <RegistrationContent key={`${id}:${user.id}`} id={id} />; }
