import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useStudentRegistrations from '../hooks/useStudentRegistrations';
import { dashboardEventTime, groupStudentRegistrations, registrationEventState } from '../lib/studentDashboard';
import { eventDate } from '../lib/events';
import Arrow from '../components/Arrow';
import BrandMark from '../components/BrandMark';
import EventArtwork from '../components/EventArtwork';
import StudentEventEntry from '../components/StudentEventEntry';
import './StudentDashboard.css';

function DashboardContent() {
  const { user } = useAuth();
  const registrations = useStudentRegistrations();
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const result = useRef(null);
  const grouped = useMemo(() => groupStudentRegistrations(registrations.records || [], now), [registrations.records, now]);
  const next = grouped.next?.event;
  const ready = registrations.records !== null;
  const countsReady = ready && !registrations.error;
  useEffect(() => {
    const previous = document.title;
    document.title = 'Your campus, collected | EventNexus';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => {
    if (!next) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, new Date(next.date).getTime() - Date.now() + 25), 2147483647));
    return () => clearTimeout(timer);
  }, [next, now]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  function cancelled(record, eventId, title, outcome) {
    registrations.accept(record, eventId);
    setNotice(outcome === 'cancelled' ? `Your registration for ${title} has been cancelled. Your place has been released.` : record ? 'Your current registration has been refreshed. No cancellation was confirmed.' : `No active registration for ${title} is recorded. Your list has been refreshed.`);
    requestAnimationFrame(() => result.current?.focus());
  }
  return <main id="main" tabIndex={-1} className="student-dashboard wrap">
    <header className="student-welcome entrance">
      <div><p className="eyebrow">YOUR EVENTNEXUS / STUDENT DASHBOARD</p><p className="student-greeting">Good to see you, <strong>{user.name}.</strong></p><h1>Your campus,<br /><em>collected.</em></h1><p className="student-intro">The plans you’ve made. The experiences ahead.<br />A little space for your life beyond the classroom.</p></div>
      <div className="student-welcome-aside"><BrandMark /><span>MAKE ROOM<br />FOR WHAT’S NEXT.</span><Link className="text-link" to="/events">Find your next event <Arrow diagonal /></Link></div>
    </header>
    <nav className="student-section-nav" aria-label="Dashboard sections"><a href="#student-upcoming">01 / Coming up</a><a href="#student-past">02 / Looking back</a><button type="button" onClick={registrations.refresh} disabled={registrations.loading}>{registrations.loading ? 'Refreshing…' : 'Refresh my events'} <Arrow /></button></nav>
    {notice && <p ref={result} tabIndex={-1} data-cancellation-result className="student-result" role="status">{notice}</p>}
    {registrations.error && <div className="student-load-error" role="alert"><p>{ready ? 'We couldn’t refresh your registrations. This is the last loaded list; actions are paused until we reconnect.' : 'Your campus plans are out of reach. We couldn’t load your registrations.'}</p><button className="text-link" onClick={registrations.refresh} disabled={registrations.loading}>{registrations.loading ? 'Reconnecting…' : 'Try again'} <Arrow /></button></div>}
    <section className="student-overview" aria-label="Your registrations overview" aria-busy={registrations.loading}>
      <div className="student-count"><span className="eyebrow">ON YOUR HORIZON</span><strong>{countsReady ? grouped.upcoming.length : '—'}</strong><span>upcoming registered {countsReady && grouped.upcoming.length === 1 ? 'event' : 'events'}</span></div>
      <div className="student-count"><span className="eyebrow">IN YOUR CHAPTERS</span><strong>{countsReady ? grouped.past.length : '—'}</strong><span>past {countsReady && grouped.past.length === 1 ? 'registration' : 'registrations'}</span></div>
      <div className="student-next-label"><span className="eyebrow">NEXT IN YOUR DIARY</span>{!countsReady ? <p>{registrations.error ? 'Your plans need a refresh.' : 'Finding your next event…'}</p> : next ? <><strong>{eventDate(next.date)}</strong><span>{dashboardEventTime(next.date)}</span></> : <p>Your next chapter is<br />still yours to choose.</p>}</div>
    </section>
    {!ready && registrations.loading ? <div className="student-skeleton" role="status"><span className="sr-only">Loading your registrations</span><div /><div /></div> : ready && <>
      {next && <section className="student-next-event" aria-labelledby="student-next-heading"><div className="student-next-copy"><p className="eyebrow">THE NEXT THING TO LOOK FORWARD TO</p><h2 id="student-next-heading">{next.title}</h2><p>{eventDate(next.date)} · {dashboardEventTime(next.date)}<br />{next.location}</p><Link className="button lime" to={`/events/${next._id}`}>Take a closer look <Arrow diagonal /></Link></div><Link className="student-next-image" to={`/events/${next._id}`} aria-label={`View ${next.title}`}><EventArtwork category={next.category} imageUrl={next.imageUrl} imageAlt={next.imageAlt} priority sizes="(max-width: 760px) 100vw, 55vw" /></Link></section>}
      <section id="student-upcoming" className="student-events-section" aria-labelledby="student-upcoming-heading" aria-busy={registrations.loading}><div className="student-section-heading"><div><p className="eyebrow">01 / THE PLANS AHEAD</p><h2 id="student-upcoming-heading">Save the date.</h2></div><p>Your upcoming registrations,<br />nearest first.</p></div>
        {grouped.upcoming.length ? <div className="student-event-list">{grouped.upcoming.map(registration => <StudentEventEntry key={registration._id} registration={registration} disabled={registrations.error} refresh={registrations.refresh} onResult={cancelled} />)}</div> : <div className="student-empty"><span className="student-empty-number" aria-hidden="true">↗</span><div><h3>A little space for something new.</h3><p>You have no upcoming event registrations. Follow an interest and see where it takes you.</p><Link className="text-link" to="/events">Explore events <Arrow diagonal /></Link></div></div>}
      </section>
      <section id="student-past" className="student-events-section student-past" aria-labelledby="student-past-heading"><div className="student-section-heading"><div><p className="eyebrow">02 / A LITTLE LOOK BACK</p><h2 id="student-past-heading">Previous chapters.</h2></div><p>Past registrations, most recent first.<br />A record of registration, not verified attendance.</p></div>
        {grouped.past.length ? <div className="student-event-list">{grouped.past.map(registration => <StudentEventEntry key={registration._id} registration={registration} past />)}</div> : <div className="student-past-empty"><p>No past registrations yet. When an event’s scheduled start has passed, its registration will appear here.</p><Link className="text-link" to="/events/past">Visit Campus Rewind <Arrow diagonal /></Link></div>}
      </section>
      {grouped.unavailable.length > 0 && <section className="student-unavailable" aria-labelledby="student-unavailable-heading"><p className="eyebrow">A CHANGE OF PLANS</p><h2 id="student-unavailable-heading">Worth a check.</h2><p>These registrations have cancelled, missing or unconfirmed event information. They aren’t counted as upcoming or past experiences.</p><ul>{grouped.unavailable.map(registration => <li key={registration._id}><div><strong>{registration.event?.title || 'Event no longer available'}</strong><span>{registrationEventState(registration.event)}</span><small>Registration reference: {registration._id}</small></div>{registration.event?._id && <Link className="text-link" to={`/events/${registration.event._id}`}>View event <Arrow diagonal /></Link>}</li>)}</ul></section>}
    </>}
    <footer className="student-closing"><p>Leave a little room<br /><em>for discovery.</em></p><Link className="button secondary" to="/events">Back to the noticeboard <Arrow diagonal /></Link></footer>
  </main>;
}
export default function StudentDashboard() { const { user } = useAuth(); return <DashboardContent key={user.id} />; }
