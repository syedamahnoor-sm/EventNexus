import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function useStudentProfile() {
  const { user, updateUser, refresh: refreshSession } = useAuth();
  const [result, setResult] = useState({ user: null, loading: true, error: false, photoUpload: null });
  const request = useRef(null);
  const revision = useRef(0);
  const fetchProfile = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const current = ++revision.current;
    return api.get('/students/profile', { signal: controller.signal, timeout: 15000 }).then(({ data }) => {
      if (controller.signal.aborted || current !== revision.current) return null;
      if (data.user.id !== user.id) return refreshSession().then(() => null);
      setResult({ user: data.user, loading: false, error: false, photoUpload: data.photoUpload });
      updateUser(data.user);
      return data.user;
    }).catch(() => {
      if (!controller.signal.aborted && current === revision.current) setResult(previous => ({ ...previous, loading: false, error: true }));
      return null;
    });
  }, [updateUser, user.id, refreshSession]);
  useEffect(() => { fetchProfile(); return () => request.current?.abort(); }, [fetchProfile]);
  const load = useCallback(() => {
    setResult(previous => ({ ...previous, loading: true, error: false }));
    return fetchProfile();
  }, [fetchProfile]);
  const accept = useCallback(profile => {
    revision.current++; request.current?.abort();
    setResult(previous => ({ ...previous, user: profile, loading: false, error: false }));
    updateUser(profile, true);
  }, [updateUser]);
  const saved = result.user && (user.profileVersion >= result.user.profileVersion ? user : result.user);
  return { ...result, user: saved, load, accept };
}
