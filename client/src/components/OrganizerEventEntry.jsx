import { Link } from 'react-router-dom';
import Arrow from './Arrow';
import EventArtwork from './EventArtwork';
import OrganizerCapacity from './OrganizerCapacity';
import OrganizerEventActions from './OrganizerEventActions';
import { organizerStatus } from '../lib/organizerDashboard';
import { eventDate } from '../lib/events';
import { dashboardEventTime } from '../lib/studentDashboard';

export default function OrganizerEventEntry({ event, onChange, disabled }) {
  return <article className={`organizer-event organizer-event--${event.phase}`}>
    <Link className="organizer-event-image" to={`/events/${event._id}`} aria-label={`View ${event.title}`}><EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} sizes="(max-width: 600px) 100vw, 230px" /></Link>
    <div className="organizer-event-copy"><div className="organizer-event-meta"><span>{event.category}</span><span className="organizer-status">{organizerStatus(event)}</span></div><h3><Link to={`/events/${event._id}`}>{event.title}</Link></h3><p>{event.date && Number.isFinite(new Date(event.date).getTime()) ? <time dateTime={event.date}>{eventDate(event.date)} · {dashboardEventTime(event.date)}</time> : 'Date unavailable'}</p><p>{event.location}</p><Link className="text-link" to={`/events/${event._id}`}>View event <Arrow diagonal /></Link></div>
    <OrganizerCapacity event={event} />
    <div className="organizer-row-management"><OrganizerEventActions event={event} onChange={onChange} disabled={disabled} /></div>
  </article>;
}
