import BrandMark from './BrandMark';
import { useState } from 'react';
import { CATEGORIES } from '../lib/events';
import './EventArtwork.css';

export default function EventArtwork({ category, imageUrl, imageAlt = '', priority = false, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const index = Math.max(0, CATEGORIES.indexOf(category));
  const photo = Boolean(imageUrl && imageUrl !== failedUrl);
  const local = /^\/images\/events\/[a-z0-9-]+\.webp$/.test(imageUrl || '') && !imageUrl.endsWith('-640.webp');
  if (photo) return <div className={`event-art art-${index} event-art--photo ${className}`}>
    <img
      className="event-photo"
      src={imageUrl}
      srcSet={local ? `${imageUrl.replace(/\.webp$/, '-640.webp')} 640w, ${imageUrl} 1280w` : undefined}
      sizes={local ? (priority ? '(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 55vw, 760px' : '(max-width: 440px) calc(100vw - 40px), (max-width: 760px) 45vw, (max-width: 1100px) 30vw, 410px') : undefined}
      alt={imageAlt}
      width="1280" height="800"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailedUrl(imageUrl)}
    />
  </div>;
  return <div className={`event-art art-${index} ${imageUrl ? 'event-art--photo event-art--fallback' : ''} ${className}`} aria-hidden="true">
    <span className="art-label">EVENTNEXUS / {category || 'Other'}</span>
    <span className="art-symbol">{index === 1 || index === 5 ? <BrandMark /> : ['↗', '', '↯', '↗', '◎'][index]}</span>
    <span className="art-bottom">A REASON TO SHOW UP.<span>EN / 0{index + 1}</span></span>
  </div>;
}
