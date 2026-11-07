import './Navbar.css';
import BrandMark from './BrandMark';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import api from '../api/axios';
import Arrow from './Arrow';

export default function Navbar() {
 const [open, setOpen] = useState(false);
 const [session, setSession] = useState({ status: 'loading', user: null });
 const { pathname } = useLocation();
 useEffect(() => {
  const controller = new AbortController();
  api.get('/auth/me', { timeout: 10000, signal: controller.signal }).then(({ data }) => setSession({ status: 'ready', user: data.user })).catch(error => {
   if (!controller.signal.aborted) setSession({ status: error.response?.status === 401 ? 'ready' : 'unavailable', user: null });
  });
  return () => controller.abort();
 }, [pathname]);
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
 {session.user ? <Link className="button small account-entry" to={accountPath} onClick={close}>My {session.user.role === 'organizer' ? 'workspace' : 'events'} <Arrow diagonal /></Link> : session.status !== 'loading' ? <><Link className="account-entry" to="/login" onClick={close}>Log in</Link><Link className="button small" to="/register" onClick={close}>Join the campus <Arrow diagonal /></Link></> : <span className="session-loading" aria-label="Checking session" />}
 </nav></div></header>;
}
