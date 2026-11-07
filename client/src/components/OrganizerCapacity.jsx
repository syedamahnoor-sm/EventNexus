import { useId } from 'react';
import { organizerCapacity } from '../lib/organizerDashboard';

export default function OrganizerCapacity({ event }) {
  const id = useId();
  const seats = organizerCapacity(event);
  if (!seats) return <p className="organizer-capacity-unknown">Capacity information unavailable.</p>;
  return <div className={`organizer-capacity${seats.full ? ' organizer-capacity--full' : ''}`}>
    <p id={id}><strong>{seats.count}<span> / {seats.capacity}</span></strong><span>registered students</span></p>
    <div className="organizer-capacity-track" role="meter" aria-labelledby={id} aria-valuemin={0} aria-valuemax={seats.capacity} aria-valuenow={Math.min(seats.count, seats.capacity)} aria-valuetext={`${seats.count} registrations out of ${seats.capacity} places`}><span style={{ width: `${seats.percent}%` }} /></div>
    <span className="organizer-capacity-caption">{event.phase === 'upcoming' ? seats.full ? 'Fully booked' : `${seats.remaining} ${seats.remaining === 1 ? 'seat' : 'seats'} remaining` : `${seats.remaining} unfilled ${seats.remaining === 1 ? 'place' : 'places'}`}</span>
  </div>;
}
