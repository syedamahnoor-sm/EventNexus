import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { AuthContext } from './AuthContext';
import { createAuthClient } from './authClient';
import { clearOtherProfileDrafts } from '../lib/studentProfile';
import { clearOtherEventDrafts } from '../lib/eventManagement';

const client = createAuthClient(api);
let sessionRequest;
function fetchSession() {
  // Share initialization across StrictMode's effect replay and simultaneous consumers.
  if (!sessionRequest) {
    const request = api.get('/auth/me', { timeout: 10000 }).finally(() => { if (sessionRequest === request) sessionRequest = null; });
    sessionRequest = request;
  }
  return sessionRequest;
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });
  const [pending, setPending] = useState(false);
  const epoch = useRef(0);
  const busy = useRef(false);
  const channel = useRef(null);
  const lastCheck = useRef(0);
  useEffect(() => { clearOtherProfileDrafts(session.user?.id); }, [session.user?.id]);
  useEffect(() => { if (session.status === 'ready' && session.user) clearOtherEventDrafts(session.user.role === 'organizer' ? session.user.id : null); }, [session.status, session.user]);
  const restore = useCallback(async () => {
    const version = epoch.current;
    try {
      const { data } = await fetchSession();
      if (version === epoch.current) setSession({ status: 'ready', user: data.user });
    } catch (error) {
      if (version === epoch.current) setSession(current => ({ status: error.response?.status === 401 ? 'ready' : 'error', user: error.response?.status === 401 ? null : current.user }));
    }
    lastCheck.current = Date.now();
  }, []);
  useEffect(() => {
    restore();
    function refresh() { if (!busy.current && Date.now() - lastCheck.current > 5000 && document.visibilityState === 'visible') restore(); }
    window.addEventListener('focus', refresh);
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('eventnexus-session');
      channel.current.onmessage = () => { client.clear(); sessionRequest = null; epoch.current++; restore(); };
    }
    const interceptor = api.interceptors.response.use(response => response, error => {
      if (error.response?.status === 401 && error.config?.url !== '/auth/login' && error.config?.url !== '/auth/me') {
        epoch.current++;
        client.clear();
        setSession({ status: 'ready', user: null });
      }
      return Promise.reject(error);
    });
    return () => { window.removeEventListener('focus', refresh); channel.current?.close(); api.interceptors.response.eject(interceptor); };
  }, [restore]);

  const updateUser = useCallback((user, broadcast = false) => {
    epoch.current++;
    setSession(current => {
      if (current.user?.id !== user.id || current.user?.role !== user.role) return current;
      if ((current.user.profileVersion || 0) > (user.profileVersion || 0)) return current;
      return { status: 'ready', user };
    });
    lastCheck.current = Date.now();
    if (broadcast) channel.current?.postMessage('profile-changed');
  }, []);

  async function action(operation, payload) {
    if (busy.current) throw new Error('An authentication request is already in progress');
    busy.current = true;
    epoch.current++;
    setPending(true);
    try {
      const data = await client.post(`/auth/${operation}`, payload);
      if (operation === 'login') setSession({ status: 'ready', user: data.user });
      if (operation === 'logout') { clearOtherEventDrafts(null); setSession({ status: 'ready', user: null }); }
      if (operation !== 'register') channel.current?.postMessage('changed');
      lastCheck.current = Date.now();
      return data;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return <AuthContext.Provider value={{ user: session.user, status: session.status, initializing: session.status === 'loading', authenticated: Boolean(session.user), role: session.user?.role || null, pending, refresh: restore, updateUser, login: values => action('login', values), register: values => action('register', values), logout: () => action('logout') }}>{children}</AuthContext.Provider>;
}
