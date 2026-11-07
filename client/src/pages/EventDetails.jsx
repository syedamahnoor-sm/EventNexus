import EventHistoryPanel from '../components/EventHistoryPanel';
import EventRecap from '../components/EventRecap';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Arrow from '../components/Arrow';
import BrandMark from '../components/BrandMark';
import EventArtwork from '../components/EventArtwork';
import EventRegistration from '../components/EventRegistration';
import Footer from '../components/Footer';
import useEventDetails from '../hooks/useEventDetails';
import { eventAvailability, isPastEvent, hasEventRecap } from '../lib/eventAvailability';
import './EventDetails.css';

function dateLabels(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { date: 'Date to be announced', time: 'Time to be announced' };
  return {
    date: new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date),
  };
}

function DetailsContent({ id }) {
  const { event, error, loading, refresh } = useEventDetails(id);
  const { state, hash } = useLocation();
  const [now, setNow] = useState(() => Date.now());
  const historical = Boolean(event && isPastEvent(event, now));
  const showRecap = historical && hasEventRecap(event);
  const back = /^\/events(?:\/past)?(?:\?|$)/.test(state?.from || '') ? state.from : historical ? '/events/past' : '/events';
  useEffect(() => {
    if (showRecap && hash === '#recap') {
      const section = document.getElementById('recap');
      section?.scrollIntoView(); section?.focus({ preventScroll: true });
    }
  }, [showRecap, hash]);
  const eventDate = event?.date;
  useEffect(() => {
    const deadline = new Date(eventDate).getTime();
    if (!Number.isFinite(deadline) || deadline <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, deadline - Date.now() + 25), 2147483647));
    return () => clearTimeout(timer);
  }, [eventDate, now]);
  useEffect(() => {
    const previous = document.title;
    document.title = event ? `${event.title} — EventNexus` : 'Event details — EventNexus';
    return () => { document.title = previous; };
  }, [event]);

  if (!event && loading) return <><main className="event-details wrap" id="main" tabIndex={-1} aria-busy="true">
    <p className="eyebrow" role="status">OPENING THE CAMPUS NOTICEBOARD…</p>
    <div className="details-skeleton" aria-hidden="true"><div /><div /><section><div /><div /></section></div>
  </main><Footer /></>;

  if (!event) {
    const title = error === 'invalid' ? 'This event link isn’t valid.' : error === 'missing' ? 'This page has left the noticeboard.' : 'A small interruption.';
    const description = error === 'invalid' ? 'Check the event address, or find your next experience on the campus noticeboard.' : error === 'missing' ? 'We couldn’t find this event. It may have been removed by its organizer.' : 'We couldn’t load the event details. Please try again in a moment.';
    return <><main className="event-details wrap" id="main" tabIndex={-1}>
      <Link className="details-back" to={back}>← {back.startsWith('/events/past') ? 'Back to previous events' : 'Back to events'}</Link>
      <section className="details-error" aria-labelledby="details-error-heading"><BrandMark /><p className="eyebrow">ROOM FOR WHAT’S NEXT</p><h1 id="details-error-heading">{title}</h1><p role="alert">{description}</p><div>{error === 'network' && <button className="button" onClick={refresh}>Try again <Arrow /></button>}<Link className="text-link" to="/events">Explore events <Arrow diagonal /></Link></div></section>
    </main><Footer /></>;
  }

  const availability = eventAvailability(event, now);
  const labels = dateLabels(event.date);
  return <><main className="event-details wrap" id="main" tabIndex={-1}>
    <nav className="details-breadcrumb" aria-label="Breadcrumb"><Link to={back}>← {back.startsWith('/events/past') ? 'Back to previous events' : 'Back to events'}</Link><span>{historical ? 'THE EVENTNEXUS ARCHIVE / EVENT RECORD' : 'THE CAMPUS NOTICEBOARD / EVENT DETAILS'}</span></nav>
    <header className="details-header entrance"><div className="details-kicker"><Link to={`/events?category=${encodeURIComponent(event.category || 'Other')}`}>{event.category || 'Other'} <Arrow diagonal /></Link><span className={`details-status status-${availability.state}`}>{availability.title}</span></div><h1>{event.title}</h1><p className="details-organizer">Organized by <strong>{event.organizer?.name || 'Organizer information unavailable'}</strong></p></header>
    {error && <div className="details-refresh-error" role="alert">We couldn’t refresh event availability. Displayed information may have changed. <button onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Try again'}</button></div>}
    <div className="details-layout"><div className="details-story">
      <div className="details-poster"><EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} priority className="details-art" /><div className="details-poster-caption"><span>{event.imageUrl ? 'ILLUSTRATIVE PHOTOGRAPH' : 'CAMPUS LIFE. WIDE OPEN.'}</span><span>{historical ? 'CAMPUS REWIND / EVENT RECORD' : 'SHOW UP / BE PART OF IT'}</span></div></div>
      <section className="details-facts" aria-labelledby="details-facts-heading"><h2 id="details-facts-heading" className="sr-only">At a glance</h2><dl><div><dt>01 / DATE & TIME</dt><dd><time dateTime={Number.isFinite(new Date(event.date).getTime()) ? event.date : undefined}>{labels.date}<span>{labels.time}</span></time><small>Shown in your local time zone.</small></dd></div><div><dt>02 / THE MEETING POINT</dt><dd>{event.location || 'Location to be announced'}</dd></div><div><dt>03 / THE ROOM</dt><dd>{availability.capacity ? `${availability.capacity} total places` : 'Capacity unconfirmed'}<span>{historical ? 'Registration closed' : availability.remaining === null ? 'Availability unconfirmed' : `${availability.remaining} places remaining`}</span></dd></div></dl></section>
      <section className="details-about" aria-labelledby="about-heading"><div className="section-heading"><div><p className="eyebrow">THE DETAILS / BEFORE YOU SHOW UP</p><h2 id="about-heading">What’s the story<span className="accent-dot">?</span></h2></div></div><p className="details-description">{event.description || 'The organizer hasn’t provided a description.'}</p></section>
      {showRecap && <EventRecap event={event} />}
      <div className="details-signoff"><BrandMark /><p>One experience.<br /><strong>A whole new perspective.</strong></p></div>
    </div>{historical ? <EventHistoryPanel /> : <EventRegistration event={event} availability={availability} refresh={refresh} />}</div>
    <div className="details-next"><p>Keep your curiosity going.</p><Link className="text-link" to={back}>{historical ? 'Back to previous events' : 'Back to the noticeboard'} <Arrow diagonal /></Link></div>
  </main><Footer /></>;
}

export default function EventDetails() {
  const { id } = useParams();
  return <DetailsContent key={id} id={id} />;
}
