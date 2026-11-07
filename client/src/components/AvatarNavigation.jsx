import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import './AvatarNavigation.css';

export default function AvatarNavigation({ user, pending, logout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null), menu = useRef(null), lastFirst = useRef(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const items = menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)');
    (lastFirst.current ? items[items.length - 1] : items[0])?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close(focus = true) { setOpen(false); if (focus) trigger.current?.focus(); }
  function navigate() { close(); onNavigate(); }
  function keys(event) {
    if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); close(); return; }
    if (event.key === 'Tab') { close(); return; }
    const items = [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = (index + items.length - 1) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
  }
  return <div ref={root} className="avatar-navigation">
    <button ref={trigger} className="avatar-nav-trigger" type="button" aria-label={`Account menu for ${user.name}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => { lastFirst.current = false; setOpen(value => !value); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); lastFirst.current = event.key === 'ArrowUp'; setOpen(true); } }}><UserAvatar user={user} decorative /><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" /></svg></button>
    {open && <div ref={menu} id={id} role="menu" aria-label="Student account" className="avatar-menu" onKeyDown={keys}><div className="avatar-menu-identity"><span>YOUR EVENTNEXUS</span><strong>{user.name}</strong></div><NavLink role="menuitem" tabIndex={-1} to="/student/dashboard" onClick={navigate}>My campus <span aria-hidden="true">↗</span></NavLink><NavLink role="menuitem" tabIndex={-1} to="/student/profile" onClick={navigate}>My profile <span aria-hidden="true">↗</span></NavLink><button role="menuitem" tabIndex={-1} type="button" disabled={pending} onClick={async () => { if (await logout()) close(); }}>{pending ? 'Logging out…' : 'Log out'} <span aria-hidden="true">↗</span></button></div>}
  </div>;
}
