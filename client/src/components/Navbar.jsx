import './Navbar.css';
import BrandMark from './BrandMark';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Arrow from './Arrow';
import AvatarNavigation from './AvatarNavigation';

export default function Navbar() {
 const [open, setOpen] = useState(false);
 const session = useAuth();
 const [logoutError, setLogoutError] = useState('');
 async function logout() {
  setLogoutError('');
  try { await session.logout(); setOpen(false); requestAnimationFrame(() => { const toggle = document.querySelector('.menu-toggle'); (toggle && getComputedStyle(toggle).display !== 'none' ? toggle : document.querySelector('.navigation a[href="/login"]'))?.focus(); }); return true; }
  catch { setLogoutError('Log out could not be confirmed. Please reconnect and try again.'); return false; }
 }
 useEffect(() => {
  const header = document.querySelector('.site-header');
  let frame = 0;
  const update = () => {
   cancelAnimationFrame(frame);
   frame = requestAnimationFrame(() => { header.dataset.scrolled = String(window.scrollY > 24); });
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  return () => { window.removeEventListener('scroll', update); cancelAnimationFrame(frame); };
 }, []);
 const close = () => setOpen(false);
 const accountPath = session.user?.role === 'organizer' ? '/organizer/dashboard' : '/student/dashboard';
 return <header className="site-header" id="top"><a className="skip-link" href="#main">Skip to content</a><div className="nav-inner wrap">
 <Link to="/" className="wordmark" onClick={close} aria-label="EventNexus home"><BrandMark /><span className="brand-name">eventnexus</span></Link>
 <span className="nav-caption">YOUR CAMPUS.<br />YOUR NEXT CHAPTER.</span>
 <button className="menu-toggle" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(value => !value)}>{open ? 'Close -' : 'Menu +'}</button>
 <nav id="main-navigation" aria-label="Main navigation" className={open ? 'navigation is-open' : 'navigation'} onKeyDown={event => { if (event.key === 'Escape') { close(); document.querySelector('.menu-toggle')?.focus(); } }}>
 <NavLink to="/" end onClick={close}>Home</NavLink><NavLink to="/events" end onClick={close}>Explore events</NavLink><NavLink to="/events/past" onClick={close}>Previous events</NavLink>
 {session.user ? <><NavLink className="account-entry" to={accountPath} onClick={close}>{session.user.role === 'organizer' ? 'Organizer account' : 'My campus'}</NavLink>{session.user.role === 'student' ? <AvatarNavigation key={session.user.id} user={session.user} pending={session.pending} logout={logout} onNavigate={close} /> : <button className="button small nav-logout" onClick={logout} disabled={session.pending}>{session.pending ? 'Please wait...' : 'Log out'} <Arrow diagonal /></button>}</> : session.status === 'ready' ? <><NavLink className="account-entry" to="/login" onClick={close}>Log in</NavLink><Link className="button small" to="/register" onClick={close}>Join the campus <Arrow diagonal /></Link></> : session.status === 'error' ? <button className="nav-session-retry account-entry" onClick={session.refresh}>Retry account check</button> : <span className="session-loading" role="status" aria-label="Checking session" />}
 {logoutError && <p className="nav-auth-error" role="alert">{logoutError}</p>}
 </nav></div></header>;
}
