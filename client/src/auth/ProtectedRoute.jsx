import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Arrow from '../components/Arrow';
import '../pages/Auth.css';

export default function ProtectedRoute({ role, children }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading') return <main id="main" tabIndex={-1} className="account-state wrap" role="status"><p className="eyebrow">ACCOUNT ACCESS</p><h1>One moment.</h1><p>Checking your session…</p></main>;
  if (auth.status === 'error') return <main id="main" tabIndex={-1} className="account-state wrap"><h1>Let’s reconnect.</h1><p role="alert">Your session couldn’t be verified. Please check your connection.</p><button className="button" onClick={auth.refresh}>Try again <Arrow /></button></main>;
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  if (auth.role !== role) return <main id="main" tabIndex={-1} className="account-state wrap"><p className="eyebrow">ACCOUNT ACCESS</p><h1>A different workspace.</h1><p>This page is for {role} accounts. You’re signed in with a {auth.role} account.</p><Link className="button" to={`/${auth.role}/dashboard`}>Go to your account <Arrow diagonal /></Link><Link className="text-link" to="/events">Explore events <Arrow /></Link></main>;
  return children;
}
