import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { subscribeRegistrationChange } from '../lib/registrationEvents';

export default function useEventDetails(id) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ event: null, error: null, version: -1 });
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => subscribeRegistrationChange(id, refresh), [id, refresh]);
  const valid = /^[a-f\d]{24}$/i.test(id || '');
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    api.get(`/events/${id}`, { signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ event: data.data, error: null, version });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        const status = error.response?.status;
        setResult(previous => ({
          event: status === 404 || status === 400 ? null : previous.event,
          error: status === 404 ? 'missing' : status === 400 ? 'invalid' : 'network', version,
        }));
      });
    return () => controller.abort();
  }, [id, valid, version]);
  return {
    ...result,
    error: valid ? result.error : 'invalid',
    loading: valid && result.version !== version,
    refresh,
  };
}
