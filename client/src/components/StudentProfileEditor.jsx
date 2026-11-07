import { useEffect, useRef, useState } from 'react';
import Arrow from './Arrow';
import api from '../api/axios';
import { createAuthClient } from '../auth/authClient';
import { PROFILE_FIELDS, clearProfileDraft, profilePayload, profileValues, readProfileDraft, storeProfileDraft, validateProfile } from '../lib/studentProfile';

export default function StudentProfileEditor({ profile, loading, accept, reload }) {
  const [draft, setDraft] = useState(() => readProfileDraft(profile.id));
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [client] = useState(() => createAuthClient(api));
  const busy = useRef(false), root = useRef(null), status = useRef(null);
  const dirty = draft && JSON.stringify(profilePayload(draft.values, 0)) !== JSON.stringify(profilePayload(draft.baseValues || profileValues(profile), 0));
  const baselineUnchanged = draft && PROFILE_FIELDS.every(field => (draft.baseValues?.[field.name] || '').trim() === profileValues(profile)[field.name].trim());
  const conflict = draft && draft.version !== profile.profileVersion && !baselineUnchanged;
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (feedback) status.current?.focus(); }, [feedback]);
  function keepDraft(next) { setDraft(next); storeProfileDraft(profile.id, next); }
  function edit() {
    const values = profileValues(profile);
    keepDraft({ values, baseValues: values, version: profile.profileVersion });
    setFeedback(null); setErrors({});
    requestAnimationFrame(() => document.getElementById('profile-name')?.focus());
  }
  function change(event) {
    const { name, value } = event.target;
    keepDraft({ ...draft, values: { ...draft.values, [name]: value } });
    setErrors(current => ({ ...current, [name]: undefined }));
  }
  function cancel() {
    clearProfileDraft(profile.id); setDraft(null); setErrors({}); setUncertain(false);
    setFeedback({ type: 'info', text: uncertain ? 'Draft discarded. Checking your saved profile.' : 'Edits discarded. Showing your saved profile.' });
    if (uncertain) reload();
  }
  function merge() {
    const latest = profileValues(profile);
    const values = Object.fromEntries(PROFILE_FIELDS.map(field => [field.name, draft.values[field.name].trim() === (draft.baseValues?.[field.name] || '').trim() ? latest[field.name] : draft.values[field.name]]));
    keepDraft({ values, baseValues: latest, version: profile.profileVersion });
    setFeedback({ type: 'info', text: 'Your edits are kept. Untouched fields use the latest saved values. Review before saving.' });
  }
  async function checkSaved() {
    if (busy.current) return;
    busy.current = true; setPending(true);
    const saved = await reload();
    if (saved) {
      const values = profileValues(saved);
      const matches = PROFILE_FIELDS.every(field => values[field.name].trim() === draft.values[field.name].trim());
      setUncertain(false);
      if (matches) {
        accept(saved); clearProfileDraft(profile.id); setDraft(null);
        setFeedback({ type: 'success', text: 'Saved profile verified. These details are on your account.' });
      } else setFeedback({ type: 'info', text: 'The current saved profile is loaded. Your draft is still here; review it before saving.' });
    } else setFeedback({ type: 'error', text: 'We couldn’t verify the saved profile. Your draft is kept. Reconnect and check again.' });
    busy.current = false; setPending(false);
  }
  async function save(event) {
    event.preventDefault();
    if (busy.current || conflict || uncertain || loading) return;
    const invalid = validateProfile(draft.values); setErrors(invalid); setFeedback(null);
    if (Object.keys(invalid).length) { requestAnimationFrame(() => root.current?.querySelector('[aria-invalid="true"]')?.focus()); return; }
    busy.current = true; setPending(true);
    try {
      const data = await client.patch('/students/profile', profilePayload(draft.values, baselineUnchanged ? profile.profileVersion : draft.version));
      accept(data.user); clearProfileDraft(profile.id); setDraft(null);
      setFeedback({ type: 'success', text: 'Your profile is saved. Future registrations will start with these details.' });
    } catch (error) {
      const code = error.response?.status;
      if (code === 400) {
        setErrors(Object.fromEntries((error.response.data.errors || []).filter(item => PROFILE_FIELDS.some(field => field.name === item.field)).map(item => [item.field, item.message])));
        setFeedback({ type: 'error', text: 'Please check the highlighted details.' });
      } else if (code === 409) {
        setFeedback({ type: 'error', text: 'Your saved profile changed elsewhere. Your draft is kept; review the latest details before saving.' });
        reload();
      } else if (code === 403) setFeedback({ type: 'error', text: 'Your session or security check couldn’t be verified. Please try again.' });
      else if (code === 401) setFeedback({ type: 'error', text: 'Your session ended. Please log in again.' });
      else if (!error.response || code >= 500) {
        setUncertain(true);
        setFeedback({ type: 'error', text: 'We couldn’t confirm the save. Your draft is kept. Check the saved profile before trying again.' });
      } else setFeedback({ type: 'error', text: 'Your profile couldn’t be saved. Your draft is kept; please try again shortly.' });
    } finally { busy.current = false; setPending(false); }
  }
  return <section ref={root} className="profile-editor" aria-labelledby="profile-editor-title">
    <p className="eyebrow">01 / THE DETAILS THAT CONNECT YOU</p><h2 id="profile-editor-title">{draft ? 'Make it yours.' : 'A little about you.'}</h2>
    <p className="profile-editor-intro">{draft ? 'Your name is required. Add academic details at your own pace; they’ll help with future event registrations.' : 'A few useful details, ready for your next registration. Updating them here never changes an existing event registration.'}</p>
    {feedback && <p ref={status} tabIndex={-1} role={feedback.type === 'error' ? 'alert' : 'status'} className={`profile-feedback profile-feedback--${feedback.type}`}>{feedback.text}</p>}
    {draft ? <>
      <p className="profile-draft-note">Your draft stays in this tab while you browse. Save before closing, refreshing or signing out.</p>
      {conflict && <div className="profile-conflict" role="status"><p>Your saved details have changed. Your edits haven’t been overwritten.</p><details><summary>Compare with saved details</summary><dl>{PROFILE_FIELDS.filter(field => draft.values[field.name].trim() !== profileValues(profile)[field.name].trim()).map(field => <div key={field.name}><dt>{field.label}</dt><dd>{profileValues(profile)[field.name] || 'Not added yet'}</dd></div>)}</dl></details><button type="button" onClick={merge} disabled={pending || loading || uncertain}>Keep my edits and review <Arrow /></button></div>}
      <form onSubmit={save} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="profile-fields"><legend className="sr-only">Edit your student profile</legend>
          {PROFILE_FIELDS.map(field => <div className="profile-field" key={field.name}><label htmlFor={`profile-${field.name}`}>{field.label} {!field.required && <span>{field.name === 'contactNumber' ? '(optional)' : '(recommended)'}</span>}</label><input id={`profile-${field.name}`} name={field.name} type={field.type || 'text'} autoComplete={field.autoComplete || 'off'} value={draft.values[field.name]} onChange={change} maxLength={field.max} required={field.required} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] || field.hint ? `${field.name}-profile-help` : undefined} />{(errors[field.name] || field.hint) && <p id={`${field.name}-profile-help`} className={errors[field.name] ? 'profile-field-error' : 'profile-field-hint'}>{errors[field.name] || field.hint}</p>}</div>)}
          <div className="profile-field profile-field--email"><label htmlFor="profile-email">Account email</label><input id="profile-email" type="email" autoComplete="email" value={profile.email} readOnly aria-describedby="profile-email-help" /><p className="profile-field-hint" id="profile-email-help">Used for login. Email changes aren’t available.</p></div>
        </fieldset>
        <div className="profile-save-actions">{uncertain ? <button className="button lime" type="button" onClick={checkSaved} disabled={pending || loading}>{pending ? 'Checking…' : 'Check saved profile'} <Arrow /></button> : <button className="button lime" type="submit" disabled={pending || loading || conflict || !dirty}>{pending ? 'Saving your profile…' : 'Save profile'} <Arrow diagonal /></button>}<button type="button" className="profile-cancel" disabled={pending} onClick={cancel}>Cancel edits</button></div>
      </form>
    </> : <><dl className="profile-saved-details">{PROFILE_FIELDS.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{profileValues(profile)[field.name] || <span>Not added yet</span>}</dd></div>)}</dl><button type="button" className="button lime profile-edit-button" onClick={edit} disabled={loading}>Edit profile <Arrow diagonal /></button></>}
  </section>;
}
