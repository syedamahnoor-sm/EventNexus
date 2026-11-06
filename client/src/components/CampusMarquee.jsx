import { useState } from 'react';
import BrandMark from './BrandMark';
import './CampusMarquee.css';

const PHRASES = ['A LITTLE CURIOSITY', 'CAN TAKE YOU A LONG WAY.', 'MAKE ROOM FOR SOMETHING NEW.'];

/** Identical, gapless groups make -50% exactly one complete repeat. */
export default function CampusMarquee() {
  const [paused, setPaused] = useState(false);
  return <section className="brand-strip campus-marquee" aria-label="A little campus inspiration" data-paused={paused}>
    <p className="sr-only">A little curiosity can take you a long way. Make room for something new.</p>
    <div className="marquee-window" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map(group => <div className="marquee-group" key={group}>
          {[0, 1].map(repeat => <div className="marquee-run" key={repeat}>
            {PHRASES.map((phrase, index) => <div className="marquee-beat" key={phrase}>
              <b>{phrase}</b>{index === 1 ? <svg className="marquee-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 19 19 5M5 5h14v14" /></svg> : <BrandMark />}
            </div>)}
          </div>)}
        </div>)}
      </div>
    </div>
    <button className="marquee-control" type="button" aria-label={paused ? 'Resume marquee' : 'Pause marquee'} onClick={() => setPaused(value => !value)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{paused ? <path d="m9 5 10 7-10 7Z" /> : <path d="M9 5v14M15 5v14" />}</svg>
    </button>
  </section>;
}
