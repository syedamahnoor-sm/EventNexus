import { activeRegistration } from '../lib/registrationLifecycle';
import { useRef, useState } from 'react';
import api from '../api/axios';
import { createAuthClient } from '../auth/authClient';

export default function useCancelRegistration({ event, registration, onCancelled, onReconciled, refreshEvent }) {
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [client] = useState(() => createAuthClient(api));
  async function run(checkOnly = false) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (checkOnly || uncertain) {
        const { data } = await api.get(`/events/${event._id}/registration`, { timeout: 10000 });
        if (!data.data || !activeRegistration(data.data)) { onReconciled(data.data); return; }
        onReconciled(data.data);
        setUncertain(false);
        setError('Your registration is still active. You can keep it or confirm cancellation again.');
        return;
      }
      const response = await client.delete(`/events/${event._id}/register`, { registrationId: registration._id });
      if (response.alreadyCancelled) { const { data } = await api.get(`/events/${event._id}/registration`, { timeout: 10000 }); onReconciled(data.data); return; }
      onCancelled(response.data);
    } catch (failure) {
      const status = failure.response?.status;
      if (status === 404) {
        // A stale reference may have been replaced by a new registration. Look up,
        // never cancel that new record or claim this request succeeded.
        setUncertain(true);
        setError('This registration is no longer active. Check the current status.');
      } else if (status === 409) {
        setError(failure.response.data.message || 'Cancellation is no longer available.');
        refreshEvent();
      } else if (status === 401) setError('Your session ended. Log in again to check your registration.');
      else if (status === 403) setError('Your session or security check could not be verified. Please try again.');
      else if (failure.response?.data?.code === 'REGISTRATION_MIGRATION_REQUIRED') setError(failure.response.data.message);
      else if (!failure.response || status >= 500) {
        setUncertain(true);
        setError('We couldn’t confirm the result. Check registration status before trying again.');
      } else setError('Cancellation could not be completed. Please try again shortly.');
    } finally { busy.current = false; setPending(false); }
  }
  return { pending, uncertain, error, cancel: () => run(), check: () => run(true) };
}
