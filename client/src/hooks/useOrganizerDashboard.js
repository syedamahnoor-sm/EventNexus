import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { subscribeRegistrationChange } from '../lib/registrationEvents';
import { subscribeEventChange } from '../lib/eventChanges';

export default function useOrganizerDashboard({ view, page }) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: '', version: -1, data: null, error: false });
  const key = `${user.id}:${view}:${page}`;
  const lastFocus = useRef(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/organizer/dashboard', { params: { view, page, limit: 8 }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!data.data?.overview || !Array.isArray(data.data.events) || !data.pagination) throw new Error('Invalid dashboard response');
        if (!controller.signal.aborted) setResult({ key, version, data, error: false });
      }).catch(() => {
        if (!controller.signal.aborted) setResult(previous => ({ key, version, data: previous.key === key ? previous.data : null, error: true }));
      });
    return () => controller.abort();
  }, [key, view, page, version]);
  useEffect(() => {
    function check() { if (document.visibilityState === 'visible' && Date.now() - lastFocus.current > 1000) { lastFocus.current = Date.now(); refresh(); } }
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [refresh]);
  useEffect(() => subscribeRegistrationChange(null, refresh), [refresh]);
  useEffect(() => subscribeEventChange(null, refresh), [refresh]);
  // Keep the shared overview/filters mounted during query changes, preserving focus.
  const data = result.data;
  const nextDate = data?.data.next?.date;
  useEffect(() => {
    if (!nextDate) return;
    const timer = setTimeout(refresh, Math.min(2147483647, Math.max(1000, new Date(nextDate).getTime() - Date.now() + 100)));
    return () => clearTimeout(timer);
  }, [nextDate, refresh, version]);
  return { data, changing: result.key !== key, error: result.key === key && result.error, loading: result.key !== key || result.version !== version, refresh };
}
