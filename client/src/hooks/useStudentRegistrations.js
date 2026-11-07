import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { publishRegistrationChange, subscribeRegistrationChange } from '../lib/registrationEvents';

export default function useStudentRegistrations() {
  const { user, status } = useAuth();
  const [source] = useState(() => globalThis.crypto.randomUUID());
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ userId: '', version: -1, records: null, error: false });
  const revision = useRef(0);
  const enabled = status === 'ready' && user?.role === 'student';
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => subscribeRegistrationChange(null, refresh, source), [refresh, source]);
  useEffect(() => {
    function check() { if (document.visibilityState === 'visible') refresh(); }
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const requestRevision = revision.current;
    api.get('/registrations/me', { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!Array.isArray(data.data)) throw new Error('Invalid registrations response');
        if (!controller.signal.aborted && requestRevision === revision.current) setResult({ userId: user.id, version, records: data.data, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted && requestRevision === revision.current) setResult(current => ({ userId: user.id, version, records: current.userId === user.id ? current.records : null, error: true }));
      });
    return () => controller.abort();
  }, [enabled, user?.id, version]);

  const accept = useCallback((record, eventId) => {
    revision.current++;
    // Reconciliation returned a real replacement: fetch its populated event data.
    if (!record) setResult(current => ({ ...current, records: current.records?.filter(item => item.event?._id !== eventId) || null }));
    publishRegistrationChange(eventId, source);
    refresh();
  }, [refresh, source]);
  const current = result.userId === user?.id;
  return { records: current ? result.records : null, error: current && result.error, loading: status === 'loading' || (enabled && (!current || result.version !== version)), refresh, accept };
}
