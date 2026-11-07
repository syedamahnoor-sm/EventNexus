import EventArtwork from './EventArtwork';
import { Link, useLocation } from 'react-router-dom';
import Arrow from './Arrow';
import { eventDate } from '../lib/events';
import { eventSeats } from '../lib/eventAvailability';

export default function EventCard({ event }) {
  const location = useLocation();
  const { remaining } = eventSeats(event);
  return <article className="event-card"><Link to={`/events/${event._id}`} state={{ from: location.pathname + location.search }}>
    <EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} />
    <div className="card-meta"><span>{event.category || 'Other'}</span><span className={remaining === 0 ? 'full' : ''}>{remaining === null ? 'See availability' : remaining === 0 ? 'Fully booked' : `${remaining} places left`}</span></div>
    <h3>{event.title}</h3><p className="card-description">{event.description}</p>
    <div className="card-date"><time dateTime={event.date}>{eventDate(event.date)}</time><span>{event.location}</span></div>
    <div className="card-link">Take a closer look <Arrow diagonal /></div>
  </Link></article>;
}
