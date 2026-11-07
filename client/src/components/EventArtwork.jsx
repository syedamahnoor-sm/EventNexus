import BrandMark from './BrandMark';
import { CATEGORIES } from '../lib/events';

export default function EventArtwork({ category, className = '' }) {
  const index = Math.max(0, CATEGORIES.indexOf(category));
  return <div className={`event-art art-${index} ${className}`} aria-hidden="true">
    <span className="art-label">EVENTNEXUS / {category || 'Other'}</span>
    <span className="art-symbol">{index === 1 || index === 5 ? <BrandMark /> : ['↗', '', '↯', '↗', '◎'][index]}</span>
    <span className="art-bottom">A REASON TO SHOW UP.<span>EN / 0{index + 1}</span></span>
  </div>;
}
