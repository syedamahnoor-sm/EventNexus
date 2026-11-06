import Arrow from './Arrow';
import './JourneySteps.css';

const STEPS = [
  ['Discover', 'See what’s happening beyond your timetable.'],
  ['Explore', 'Find the details. Follow what interests you.'],
  ['Join', 'Choose your event and register for your place.'],
  ['Experience', 'Meet the people. Make the memory. Repeat.'],
];

export default function JourneySteps() {
  return <ol className="journey-steps">
    {STEPS.map(([title, copy], index) => <li
      className="journey-step"
      key={title}
      tabIndex={0}
      // Informational list items: touch selects a reading focus, without a fake action.
      onPointerUp={event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
    >
      <div><span>0{index + 1}</span><Arrow /></div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </li>)}
  </ol>;
}
