import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { subscribeEventChange } from '../lib/eventChanges';
import { subscribeRegistrationChange } from '../lib/registrationEvents';

export default function useOwnedEvent(id) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ event: null, error: null, version: -1 });
  const reload = useCallback(() => setVersion(value => value + 1), []);
  const valid = /^[a-f\d]{24}$/i.test(id || '');
  useEffect(() => subscribeEventChange(id, reload), [id, reload]);
  useEffect(() => subscribeRegistrationChange(id, reload), [id, reload]);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    api.get(`/organizer/events/${id}`, { signal: controller.signal, timeout: 15000 }).then(({ data }) => {
      if (!controller.signal.aborted) setState({ event: data.data, error: null, version });
    }).catch(error => { if (!controller.signal.aborted) setState(previous => ({ event: error.response?.status === 404 ? null : previous.event, error: error.response?.status === 404 ? 'missing' : 'network', version })); });
    return () => controller.abort();
  }, [id, valid, version]);
  return { ...state, error: valid ? state.error : 'invalid', loading: valid && state.version !== version, reload };
}
