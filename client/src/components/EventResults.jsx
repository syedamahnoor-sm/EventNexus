import EventCard from './EventCard';
import Arrow from './Arrow';
export default function EventResults({ events, loading, error, retry, filtered = false, clear }) {
  if (loading) return <div className="event-grid" role="status" aria-label="Loading events">{[0, 1, 2].map(i => <div className="skeleton" key={i}><div /><span /><span /><span /></div>)}</div>;
  if (error) return <div className="empty-state" role="alert"><span className="empty-mark">↗</span><div><p className="eyebrow">A small interruption</p><h3>The noticeboard is out of reach.</h3><p>We couldn’t load events. Please try again in a moment.</p><button className="button" onClick={retry}>Try again <Arrow /></button></div></div>;
  if (!events.length) return <div className="empty-state"><span className="empty-mark" aria-hidden="true">✳</span><div><p className="eyebrow">Room for what’s next</p><h3>{filtered ? 'Nothing here. Yet.' : 'The next chapter is on its way.'}</h3><p>{filtered ? 'No events match these filters. Try a different interest, date, or search.' : 'No upcoming events have been published. Check back for new things to learn, people to meet, and reasons to show up.'}</p>{filtered && <button className="button" onClick={clear}>Reset filters <Arrow /></button>}</div><span className="empty-index" aria-hidden="true">[ OPEN POSSIBILITIES ]</span></div>;
  return <div className="event-grid">{events.map(event => <EventCard key={event._id} event={event} />)}</div>;
}
