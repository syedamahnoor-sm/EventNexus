import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { subscribeEventChange } from '../lib/eventChanges';

export default function useEvents({ search = '', category = '', period = '', scope = 'upcoming', status = scope === 'past' ? '' : 'upcoming', sort = 'soonest', page = 1, limit = 12 } = {}) {
  const [state, setState] = useState({ events: [], pagination: { total: 0, totalPages: 0 }, loading: true, error: false });
  const [retryKey, setRetryKey] = useState(0);
  const retry = useCallback(() => setRetryKey(value => value + 1), []);
  useEffect(() => subscribeEventChange(null, retry), [retry]);
  const key = JSON.stringify({ search, category, period, scope, status, sort, page, limit, retryKey });
  useEffect(() => {
    const controller = new AbortController();
    const params = JSON.parse(key);
    delete params.retryKey;
    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/events', { params, timeout: 15000, signal: controller.signal });
        if (!controller.signal.aborted) setState({ events: response.data.data, pagination: response.data.pagination, loading: false, error: false, key });
      } catch (error) {
        if (error.code !== 'ERR_CANCELED' && !controller.signal.aborted) setState({ events: [], pagination: { total: 0, totalPages: 0 }, loading: false, error: true, key });
      }
    }, search ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, search]);
  return { ...state, loading: state.key !== key || state.loading, retry };
}
