import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';
import { participantError } from '../lib/participants';
import { subscribeRegistrationChange } from '../lib/registrationEvents';
import { subscribeEventChange } from '../lib/eventChanges';

export default function useParticipants(id, registrationId, { search, sort, page }) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0), [state, setState] = useState(null);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const queryKey = JSON.stringify([user.id, id, registrationId, search, sort, page]);
  const key = JSON.stringify([queryKey, revision]);
  const scope = JSON.stringify([user.id, id, registrationId]);
  const valid = /^[a-f\d]{24}$/i.test(id || '') && (!registrationId || /^[a-f\d]{24}$/i.test(registrationId));
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    api.get(`/events/${id}/registrations${registrationId ? `/${registrationId}` : ''}`, { params: registrationId ? undefined : { search, sort, page, limit: 12 }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => {
        if (!data.event || (registrationId ? !data.data?._id : !Array.isArray(data.data) || !data.pagination)) throw new Error('Invalid participant response');
        if (!controller.signal.aborted) setState({ key, queryKey, scope, data, error: null });
      }).catch(error => { if (!controller.signal.aborted) setState({ key, queryKey, scope, data: null, error: participantError(error.response?.status) }); });
    return () => controller.abort();
  }, [key, queryKey, scope, valid, id, registrationId, search, sort, page]);
  useEffect(() => subscribeRegistrationChange(id, refresh), [id, refresh]);
  useEffect(() => subscribeEventChange(id, refresh), [id, refresh]);
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [refresh]);
  // Keep the same query mounted during background refresh so window focus cannot
  // remove a link just as a keyboard or pointer user activates it. Identity/query
  // changes never reuse rows, and a failed verification clears the result.
  const data = valid && state?.queryKey === queryKey ? state.data : null;
  return { data, context: valid && state?.scope === scope ? { event: state.data?.event, total: state.data?.rosterTotal } : null, error: valid ? state?.key === key ? state.error : null : 'invalid', loading: valid && state?.key !== key && !data, refreshing: valid && state?.key !== key && Boolean(data), refresh };
}
