import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function useMyEventRegistration(id) {
  const { user, status } = useAuth();
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: '', registration: null, error: false });
  const key = `${user?.id || ''}:${id}:${version}`;
  const enabled = status === 'ready' && user?.role === 'student' && /^[a-f\d]{24}$/i.test(id || '');
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    api.get(`/events/${id}/registration`, { signal: controller.signal, timeout: 10000 })
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ key, registration: data.data, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, registration: null, error: true }); });
    return () => controller.abort();
  }, [id, key, enabled]);
  return { registration: result.key === key ? result.registration : null, error: enabled && result.key === key && result.error, loading: status === 'loading' || (enabled && result.key !== key), refresh };
}
