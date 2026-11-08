import { activeRegistration } from '../lib/registrationLifecycle';
import { useCallback, useEffect, useRef, useState } from 'react';
import { publishRegistrationChange, subscribeRegistrationChange } from '../lib/registrationEvents';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function useMyEventRegistration(id) {
  const { user, status } = useAuth();
  const [source] = useState(() => globalThis.crypto.randomUUID());
  const revision = useRef(0);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: '', scope: '', registration: null, error: false });
  const key = `${user?.id || ''}:${id}:${version}`;
  const scope = `${user?.id || ''}:${id}`;
  const enabled = status === 'ready' && user?.role === 'student' && /^[a-f\d]{24}$/i.test(id || '');
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => subscribeRegistrationChange(id, refresh, source), [id, refresh, source]);
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [refresh]);
  const accept = useCallback(registration => {
    revision.current++;
    setResult({ key, scope, registration, error: false });
    publishRegistrationChange(id, source);
  }, [id, key, scope, source]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const requestRevision = revision.current;
    api.get(`/events/${id}/registration`, { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => { if (!controller.signal.aborted && requestRevision === revision.current) setResult({ key, scope, registration: data.data, error: false }); })
      .catch(() => { if (!controller.signal.aborted && requestRevision === revision.current) setResult({ key, scope, registration: null, error: true }); });
    return () => controller.abort();
  }, [id, key, scope, enabled]);
  const current = enabled && result.scope === scope;
  const record = current ? result.registration : null;
  return { registration: activeRegistration(record) ? record : null, cancelledRegistration: record && !activeRegistration(record) ? record : null, error: current && result.error, loading: status === 'loading' || (enabled && !current), refreshing: current && result.key !== key, refresh, accept };
}
