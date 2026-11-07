import { useState } from 'react';
import { profileInitials } from '../lib/studentProfile';
import './UserAvatar.css';

export default function UserAvatar({ user, url = user.photoUrl, className = '', decorative = false }) {
  const [failed, setFailed] = useState(null);
  const show = url && url !== failed;
  return <span className={`user-avatar ${className}`} role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${show ? 'Profile photo' : 'Initials'} for ${user.name}`}>
    {show ? <img src={url} alt="" width="256" height="256" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(url)} /> : profileInitials(user.name)}
  </span>;
}
