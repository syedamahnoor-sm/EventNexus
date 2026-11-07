import { Link } from 'react-router-dom';
import Arrow from './Arrow';
import EventArtwork from './EventArtwork';
import CancelRegistration from './CancelRegistration';
import { eventDate } from '../lib/events';
import { dashboardEventTime } from '../lib/studentDashboard';

export default function StudentEventEntry({ registration, past = false, disabled, onResult, refresh }) {
  const event = registration.event;
  return <article className={past ? 'student-event-entry student-event-entry--past' : 'student-event-entry'}>
    <Link to={`/events/${event._id}`} className="student-event-image" aria-label={`View ${event.title}`}><EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} sizes="(max-width: 760px) 100vw, 250px" /></Link>
    <div className="student-event-content">
      <div className="student-event-meta"><span>{event.category}</span><span>{past ? 'Past registration' : 'Registration confirmed'}</span></div>
      <h3><Link to={`/events/${event._id}`}>{event.title}</Link></h3>
      <p className="student-event-date"><time dateTime={event.date}>{eventDate(event.date)} · {dashboardEventTime(event.date)}</time></p>
      <p className="student-event-location">{event.location}</p>
      <div className="student-event-actions"><Link className="text-link" to={`/events/${event._id}`}>View event <Arrow diagonal /></Link>{!past && <Link className="student-confirmation-link" to={`/events/${event._id}/register`}>View confirmation</Link>}</div>
      {!past && <CancelRegistration event={event} registration={registration} disabled={disabled} refreshEvent={refresh} refreshRegistration={refresh} onResult={(record, outcome) => onResult(record, event._id, event.title, outcome)} />}
    </div>
  </article>;
}
