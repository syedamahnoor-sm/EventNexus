import { Link, useLocation } from 'react-router-dom';
import Arrow from './Arrow';
import EventArtwork from './EventArtwork';
import { hasEventRecap } from '../lib/eventAvailability';

export default function ArchiveEventCard({ event, priority = false }) {
  const location = useLocation();
  const date = new Date(event.date);
  const valid = Number.isFinite(date.getTime());
  const recap = hasEventRecap(event);
  return <article className="archive-card">
    <Link className="archive-event-link" to={`/events/${event._id}${recap ? '#recap' : ''}`} state={{ from: location.pathname + location.search }}>
      <time className="archive-date" dateTime={valid ? event.date : undefined}>
        <span>{valid ? date.toLocaleDateString('en', { month: 'short' }) : 'Date'}</span>
        <strong>{valid ? date.getDate() : '—'}</strong>
        <span>{valid ? date.getFullYear() : 'unavailable'}</span>
      </time>
      <div className="archive-entry">
        <EventArtwork category={event.category} imageUrl={event.imageUrl} imageAlt={event.imageAlt} priority={priority} sizes="(max-width: 760px) calc(100vw - 94px), (max-width: 1100px) 65vw, 800px" />
        <div className="archive-category"><span>{event.category}</span><span>PAST EVENT</span></div>
        <h3>{event.title}</h3><p className="archive-location">{event.location}</p>
        <div className="archive-action">{recap ? 'View recap' : 'View event'}<Arrow diagonal /></div>
      </div>
    </Link>
  </article>;
}
