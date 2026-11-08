import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useOrganizerDashboard from '../hooks/useOrganizerDashboard';
import { organizerQuery, organizerStatus } from '../lib/organizerDashboard';
import { eventDate } from '../lib/events';
import { dashboardEventTime } from '../lib/studentDashboard';
import Arrow from '../components/Arrow';
import BrandMark from '../components/BrandMark';
import EventArtwork from '../components/EventArtwork';
import OrganizerCapacity from '../components/OrganizerCapacity';
import OrganizerEventEntry from '../components/OrganizerEventEntry';
import './OrganizerDashboard.css';

const views = { upcoming: 'Coming up', past: 'Past events', cancelled: 'Cancelled', review: 'Needs review' };
const emptyCopy = {
  upcoming: ['Room for your next big idea.', 'No scheduled upcoming events right now. Your past and cancelled events are kept in their own chapters.'],
  past: ['The story is still ahead.', 'No past events yet. Events appear here once their scheduled start has passed.'],
  cancelled: ['No changes of plan.', 'You have no cancelled events.'],
  review: ['Everything is in its chapter.', 'No events need a lifecycle review.']
};
function Workspace() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const [notice, setNotice] = useState(state?.managementNotice || '');
  const query = organizerQuery(params);
  const dashboard = useOrganizerDashboard(query);
  const payload = dashboard.data;
  const overview = !dashboard.error && payload?.data.overview;
  const next = payload?.data.next;
  const pagination = payload?.pagination;
  useEffect(() => {
    const previous = document.title; document.title = 'Your organizer workspace | EventNexus';
    return () => { document.title = previous; };
  }, []);
  function change(view, page = 1) {
    const search = new URLSearchParams();
    if (view !== 'upcoming') search.set('view', view);
    if (page > 1) search.set('page', page);
    setParams(search);
  }
  return <main id="main" tabIndex={-1} className="organizer-dashboard wrap">
    <header className="organizer-welcome entrance"><div><p className="eyebrow">YOUR EVENTNEXUS / ORGANIZER WORKSPACE</p><p className="organizer-greeting">The floor is yours, <strong>{user.name}.</strong></p><h1>Set the scene.<br /><em>Make a moment.</em></h1></div><div className="organizer-welcome-aside"><BrandMark /><p>Make the next great<br /> campus moment happen.</p><div className="organizer-primary-actions"><Link className="button lime" to="/organizer/events/new">Create event <Arrow diagonal /></Link><a className="button secondary" href="#organizer-events" aria-disabled={!payload} onClick={e => { if (!payload) e.preventDefault(); }}>Manage events <Arrow /></a></div></div></header>
    <div className="organizer-workspace-line"><a className="organizer-create-link" href="#organizer-events">Your events, at a glance <Arrow /></a><button type="button" onClick={dashboard.refresh} disabled={dashboard.loading}>{dashboard.loading ? 'Refreshing workspace…' : 'Refresh workspace'} <Arrow /></button></div>
    {notice && <p className="organizer-management-success" role="status" tabIndex={-1} data-event-management-result>{notice}</p>}
    {dashboard.error && <div className="organizer-error" role="alert"><p>{payload ? 'We couldn’t refresh your workspace. The events below are the last loaded snapshot; totals are paused until we reconnect.' : 'Your workspace couldn’t be loaded. Check your connection and try again.'}</p><button className="text-link" type="button" onClick={dashboard.refresh} disabled={dashboard.loading}>Try again <Arrow /></button></div>}
    <section className="organizer-overview" aria-label="Your organizer overview" aria-busy={dashboard.loading}>
      <div className="organizer-total"><span className="eyebrow">IN YOUR HANDS</span><strong data-metric="total">{overview ? overview.total : '—'}</strong><span>events created</span></div>
      <dl className="organizer-metrics"><div><dt>Upcoming events</dt><dd data-metric="upcoming">{overview ? overview.upcoming : '—'}</dd></div><div><dt>Past events</dt><dd data-metric="past">{overview ? overview.past : '—'}</dd></div><div><dt>Active registrations <small>Across all your events · not attendance</small></dt><dd data-metric="registrations">{overview ? overview.activeRegistrations : '—'}</dd></div><div><dt>Near capacity <small>Upcoming events at least 80% full</small></dt><dd data-metric="capacity">{overview ? overview.nearCapacity : '—'}</dd></div></dl>
    </section>
    {!payload && dashboard.loading ? <div className="organizer-skeleton" role="status"><span className="sr-only">Loading your events and registration totals</span><div /><div /><div /></div> : payload && <>
      <section className={`organizer-next${next ? '' : ' organizer-next--empty'}`} aria-labelledby="organizer-next-title">
        <div className="organizer-next-copy"><p className="eyebrow">01 / NEXT ON YOUR STAGE</p>{next ? <><div className="organizer-next-meta"><span>{next.category}</span><span>{organizerStatus(next)}</span></div><h2 id="organizer-next-title">{next.title}</h2><p><time dateTime={next.date}>{eventDate(next.date)} · {dashboardEventTime(next.date)}</time><br />{next.location}</p><OrganizerCapacity event={next} /><Link className="text-link" to={`/events/${next._id}`}>Take a closer look <Arrow diagonal /></Link></> : <><h2 id="organizer-next-title">{payload.data.overview.total ? 'A pause before the next moment.' : 'Every great event starts somewhere.'}</h2><p>{payload.data.overview.total ? 'There are no upcoming scheduled events in your workspace. Your other events are collected below.' : 'You haven’t created any events yet. When you do, your plans and registrations will come together here.'}</p><Link className="text-link" to="/events">See what’s happening on campus <Arrow diagonal /></Link></>}</div>
        {next ? <Link className="organizer-next-image" to={`/events/${next._id}`} aria-label={`View ${next.title}`}><EventArtwork category={next.category} imageUrl={next.imageUrl} imageAlt={next.imageAlt} priority sizes="(max-width: 760px) 100vw, 55vw" /></Link> : <div className="organizer-next-word" aria-hidden="true">GOOD<br /><em>things</em><br />AHEAD.<span>EVENTNEXUS / YOUR NEXT CHAPTER</span></div>}
      </section>
      <section id="organizer-events" tabIndex={-1} className="organizer-events-section" aria-labelledby="organizer-events-title" aria-busy={dashboard.loading}>
        <div className="organizer-section-heading"><div><p className="eyebrow">02 / YOUR CAMPUS CONTRIBUTION</p><h2 id="organizer-events-title">The events you shape.</h2></div><p>Your events. Real registrations.<br />A clear view of what comes next.</p></div>
        <div className="organizer-filter-line"><div className="organizer-views" role="group" aria-label="Event lifecycle filters">{Object.entries(views).filter(([key]) => key !== 'review' || payload.data.overview.review > 0 || query.view === 'review').map(([key, label]) => <button key={key} type="button" aria-pressed={query.view === key} onClick={() => change(key)}>{label}<span>{payload.data.overview[key]}</span></button>)}</div><p role="status" aria-live="polite">{dashboard.loading ? 'Updating events…' : `${pagination.total} ${pagination.total === 1 ? 'event' : 'events'} · ${query.view === 'upcoming' ? 'nearest first' : query.view === 'review' ? 'date order' : 'most recent first'}`}</p></div>
        {query.view === 'past' && <p className="organizer-list-note">Past means the scheduled start has passed. Registrations are not verified attendance.</p>}
        {query.view === 'review' && <p className="organizer-list-note">These records have an unconfirmed date or a lifecycle status that doesn’t match the scheduled date. They aren’t counted as upcoming or past.</p>}
        {dashboard.changing ? <div className="organizer-skeleton organizer-skeleton--list" role="status"><span className="sr-only">Loading this chapter</span><div /><div /></div> : payload.data.events.length ? <div className="organizer-event-list" key={`${query.view}:${query.page}`}>{payload.data.events.map(event => <OrganizerEventEntry key={event._id} event={event} disabled={dashboard.error || dashboard.loading} onChange={(_, message) => setNotice(message)} />)}</div> : <div className="organizer-empty"><span aria-hidden="true">↗</span><div><h3>{query.page > 1 ? 'You’ve reached the end of this chapter.' : emptyCopy[query.view][0]}</h3><p>{query.page > 1 ? 'There are no events on this page. Return to the first page to see the latest list.' : emptyCopy[query.view][1]}</p>{query.page > 1 ? <button className="text-link" type="button" onClick={() => change(query.view)}>Back to the first page <Arrow /></button> : <Link className="text-link" to="/events">Explore campus events <Arrow diagonal /></Link>}</div></div>}
        {(pagination.totalPages > 1 || query.page > 1) && <nav className="organizer-pagination" aria-label="Your events pagination"><button className="text-link" type="button" disabled={query.page === 1 || dashboard.loading} onClick={() => change(query.view, query.page - 1)}>← Previous</button><span>Page {query.page}{pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ''}</span><button className="text-link" type="button" disabled={!pagination.hasNextPage || dashboard.loading} onClick={() => change(query.view, query.page + 1)}>Next <Arrow /></button></nav>}
      </section>
    </>}
    <footer className="organizer-closing"><p>A little planning.<br /><em>A lasting impression.</em></p><Link className="text-link" to="/events/past">Find inspiration in Campus Rewind <Arrow diagonal /></Link></footer>
  </main>;
}
export default function OrganizerDashboard() { const { user } = useAuth(); return <Workspace key={user.id} />; }
