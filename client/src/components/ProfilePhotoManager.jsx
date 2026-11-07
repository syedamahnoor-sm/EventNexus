import { useEffect, useRef, useState } from 'react';
import UserAvatar from './UserAvatar';
import { createAuthClient } from '../auth/authClient';
import api from '../api/axios';
import { MAX_PHOTO_BYTES, photoSelectionError } from '../lib/profilePhoto';
import './ProfilePhotoManager.css';

function Camera() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7h5l2-3h4l2 3h5v13H3z" /><circle cx="12" cy="13" r="4" /></svg>; }
export default function ProfilePhotoManager({ user, settings, accept, reload, disabled }) {
  const [selection, setSelection] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [remove, setRemove] = useState(false);
  const [client] = useState(() => createAuthClient(api));
  const input = useRef(null), busy = useRef(false), status = useRef(null);
  const selectionRevision = useRef(0);
  const configured = Boolean(settings?.configured);
  useEffect(() => () => { if (selection) URL.revokeObjectURL(selection.url); }, [selection]);
  useEffect(() => () => { selectionRevision.current++; }, []);
  useEffect(() => { if (feedback) status.current?.focus(); }, [feedback]);
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy.current) return;
    const revision = ++selectionRevision.current;
    setSelection(null);
    const error = photoSelectionError(file);
    if (error) { setFeedback({ error: true, text: error }); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      if (revision !== selectionRevision.current) { URL.revokeObjectURL(url); return; }
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192 || image.naturalWidth * image.naturalHeight > 20000000) throw new Error('Image dimensions');
      setSelection({ file, url }); setRemove(false); setFeedback(null);
    } catch {
      URL.revokeObjectURL(url);
      if (revision === selectionRevision.current) setFeedback({ error: true, text: 'This photo cannot be previewed safely. Use a valid JPEG, PNG or WebP up to 8192 pixels per side and 20 megapixels.' });
    }
  }
  async function update() {
    if (busy.current || uncertain || !configured) return;
    busy.current = true; setPending(true); setFeedback(null);
    try {
      const options = { headers: { 'X-Profile-Version': String(user.profileVersion) }, timeout: 60000 };
      const data = remove ? await client.delete('/students/profile/photo', {}, options) : await client.post('/students/profile/photo', selection.file, { ...options, headers: { ...options.headers, 'Content-Type': selection.file.type } });
      accept(data.user); setSelection(null); setRemove(false);
      setFeedback({ error: false, text: remove ? 'Your profile photo has been removed.' : 'Your profile photo is saved.' });
    } catch (error) {
      const code = error.response?.status;
      if (code === 409) { reload(); setFeedback({ error: true, text: 'Your profile changed. Review the refreshed profile, then save your photo again.' }); }
      else if (code === 400 || code === 413 || code === 415 || code === 422 || code === 429) setFeedback({ error: true, text: error.response.data.message });
      else if (code === 403) setFeedback({ error: true, text: 'Your security check or session could not be verified. Please try again.' });
      else if (code === 401) setFeedback({ error: true, text: 'Your session ended. Log in again to manage your photo.' });
      else {
        setUncertain(true);
        setFeedback({ error: true, text: 'The photo change could not be confirmed. Check the saved profile before trying again.' });
      }
    } finally { busy.current = false; setPending(false); }
  }
  async function check() {
    if (busy.current) return;
    busy.current = true; setPending(true);
    const saved = await reload();
    if (saved) {
      setUncertain(false); setSelection(null); setRemove(false);
      setFeedback({ error: false, text: 'Saved photo status refreshed. Review the picture above before making another change.' });
    } else setFeedback({ error: true, text: 'Your photo is still unconfirmed. Reconnect and check again.' });
    busy.current = false; setPending(false);
  }
  return <div className="profile-photo-manager">
    <div className="profile-photo-composition"><UserAvatar user={user} url={selection?.url || user.photoUrl} className="profile-photo-avatar" /><button className="profile-camera" type="button" aria-label={user.photoUrl ? 'Choose a replacement profile photo' : 'Choose a profile photo'} onClick={() => input.current?.click()} disabled={pending || uncertain || disabled}><Camera /></button></div>
    <input className="sr-only" ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} aria-label="Select profile photo" tabIndex={-1} disabled={pending || uncertain || disabled} />
    {selection && <p className="photo-preview-label">Preview · centre crop</p>}
    <div className="profile-photo-controls">
      {!selection && !remove && <><button type="button" disabled={pending || uncertain || disabled} onClick={() => input.current?.click()}>{user.photoUrl ? 'Change photo' : 'Add photo'}</button>{user.photoUrl && <button type="button" disabled={pending || uncertain || disabled || !configured} onClick={() => { setRemove(true); setFeedback(null); }}>Remove photo</button>}</>}
      {(selection || remove) && <><p>{remove ? 'Remove this photo and use your initials?' : 'Save this picture to your profile?'}</p><button type="button" className="photo-save" onClick={update} disabled={pending || uncertain || disabled || !configured}>{pending ? 'Saving…' : remove ? 'Confirm removal' : 'Save photo'}</button><button type="button" disabled={pending || uncertain} onClick={() => { setSelection(null); setRemove(false); setFeedback(null); }}>Cancel selection</button></>}
      {uncertain && <button type="button" onClick={check} disabled={pending || disabled}>{pending ? 'Checking…' : 'Check saved photo'}</button>}
    </div>
    <p className="photo-format-note">JPEG, PNG or WebP · up to {MAX_PHOTO_BYTES / 1024 / 1024} MB.</p>
    {!configured && <p className="photo-storage-note">Photo saving is unavailable until storage is configured. You can preview a selection; it won’t be uploaded.</p>}
    {feedback && <p className={feedback.error ? 'photo-feedback photo-feedback--error' : 'photo-feedback'} role={feedback.error ? 'alert' : 'status'} tabIndex={-1} ref={status}>{feedback.text}</p>}
  </div>;
}
