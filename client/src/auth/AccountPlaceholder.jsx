import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Arrow from '../components/Arrow';

// Explicitly handle the existing dashboard routes without introducing dashboard functionality.
export default function AccountPlaceholder() {
  const { user, role } = useAuth();
  return <main id="main" tabIndex={-1} className="account-state wrap entrance"><p className="eyebrow">{role.toUpperCase()} ACCOUNT / SIGNED IN</p><h1>You’re part<br />of the story.</h1><p>Welcome, {user.name}. Your session is active.</p><p>Your {role === 'organizer' ? 'organizer workspace' : 'student dashboard'} is coming in a future milestone. For now, see what’s happening on campus.</p><Link className="button lime" to="/events">Explore events <Arrow diagonal /></Link></main>;
}
