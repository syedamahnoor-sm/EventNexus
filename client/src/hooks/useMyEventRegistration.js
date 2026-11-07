import { useCallback, useEffect, useRef, useState } from 'react';
import { publishRegistrationChange, subscribeRegistrationChange } from '../lib/registrationEvents';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function useMyEventRegistration(id) {
  const { user, status } = useAuth();
  const [source] = useState(() => globalThis.crypto.randomUUID());
  const revision = useRef(0);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: '', registration: null, error: false });
  const key = `${user?.id || ''}:${id}:${version}`;
  const enabled = status === 'ready' && user?.role === 'student' && /^[a-f\d]{24}$/i.test(id || '');
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => subscribeRegistrationChange(id, refresh, source), [id, refresh, source]);
  const accept = useCallback(registration => {
    revision.current++;
    setResult({ key, registration, error: false });
    publishRegistrationChange(id, source);
  }, [id, key, source]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const requestRevision = revision.current;
    api.get(`/events/${id}/registration`, { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => { if (!controller.signal.aborted && requestRevision === revision.current) setResult({ key, registration: data.data, error: false }); })
      .catch(() => { if (!controller.signal.aborted && requestRevision === revision.current) setResult({ key, registration: null, error: true }); });
    return () => controller.abort();
  }, [id, key, enabled]);
  return { registration: result.key === key ? result.registration : null, error: enabled && result.key === key && result.error, loading: status === 'loading' || (enabled && result.key !== key), refresh, accept };
}
