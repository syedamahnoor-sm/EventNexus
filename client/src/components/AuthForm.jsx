import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Arrow from './Arrow';
import { useAuth } from '../auth/AuthContext';
import { authDestination, authFeedback, initialLoginRole, validateAuth } from '../auth/authRules';
import LoginRoleSelector from './LoginRoleSelector';

function PasswordField({ id, label, value, onChange, error, creating, hint }) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-field"><label htmlFor={id}>{label}</label><div className="auth-password"><input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} value={value} onChange={onChange} required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} spellCheck={false} /><button type="button" className="password-toggle" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onClick={() => setVisible(current => !current)}>{visible ? 'Hide' : 'Show'}</button></div>{error ? <p className="auth-field-error" id={`${id}-error`}>{error}</p> : hint ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}</div>;
}

export default function AuthForm({ registering = false }) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState(() => ({ name: '', email: location.state?.email || '', password: '', confirm: '', role: initialLoginRole(location.state) }));
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const form = useRef(null);
  const errorSummary = useRef(null);
  const from = location.state?.from;
  useEffect(() => {
    const previous = document.title;
    document.title = `${registering ? 'Create an account' : 'Log in'} | EventNexus`;
    return () => { document.title = previous; };
  }, [registering]);
  useEffect(() => { if (feedback) errorSummary.current?.focus(); }, [feedback]);
  if (auth.user && auth.status === 'ready') return <Navigate to={authDestination(from, auth.role)} replace />;
  function change(event) {
    const { name, value } = event.target;
    setValues(current => ({ ...current, [name]: value }));
    if (errors[name]) setErrors(current => ({ ...current, [name]: undefined }));
    if (name === 'role') setFeedback(null);
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || auth.pending || auth.initializing) return;
    const invalid = validateAuth(values, registering);
    setErrors(invalid);
    setFeedback(null);
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    lock.current = true;
    setSubmitting(true);
    const credentials = { email: values.email.trim().toLowerCase(), password: values.password };
    try {
      if (registering) {
        await auth.register({ ...credentials, name: values.name.trim() });
        setValues(current => ({ ...current, password: '', confirm: '' }));
        navigate('/login', { replace: true, state: { email: credentials.email, registered: true, role: 'student', from } });
      } else {
        const data = await auth.login({ ...credentials, role: values.role });
        setValues(current => ({ ...current, password: '' }));
        navigate(authDestination(from, data.user.role), { replace: true });
      }
    } catch (error) {
      const result = authFeedback(error, registering ? 'register' : 'login');
      setErrors(result.fields || {});
      setFeedback(result.message);
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }
  const disabled = submitting || auth.pending || auth.initializing;
  return <AuthLayout registering={registering}>
    <div className="auth-form-heading"><p className="eyebrow">{registering ? '01 / MAKE IT YOUR CAMPUS' : '01 / PICK UP WHERE YOU LEFT OFF'}</p><h2 id="auth-form-title">{registering ? <>Your next chapter<br />starts here.</> : <>Good to have<br />you back.</>}</h2><p>{registering ? 'A little curiosity goes a long way. Create your student account and see where it takes you.' : 'Log in to your campus life. The familiar faces, new interests, and next possibilities.'}</p></div>
    {!registering && location.state?.registered && <p className="auth-success" role="status">Your account is ready. Log in with your new password to continue.</p>}
    {auth.status === 'error' && <p className="auth-hint" role="status">We couldn’t check your existing session. You can still try logging in.</p>}
    <form ref={form} className="auth-form" noValidate onSubmit={submit} aria-busy={submitting}>
      {feedback && <div className="auth-error-summary" role="alert" tabIndex={-1} ref={errorSummary}>{feedback}</div>}
      <fieldset disabled={submitting || auth.pending} className="auth-fields"><legend className="sr-only">{registering ? 'Create your student account' : 'Your login details'}</legend>
      {!registering && <LoginRoleSelector value={values.role} onChange={change} error={errors.role} />}
      {registering && <div className="auth-field"><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" value={values.name} onChange={change} required maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p className="auth-field-error" id="name-error">{errors.name}</p>}</div>}
      <div className="auth-field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={values.email} onChange={change} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p className="auth-field-error" id="email-error">{errors.email}</p>}</div>
      <PasswordField id="password" label="Password" value={values.password} onChange={change} error={errors.password} creating={registering} hint={registering ? 'At least 8 characters. Longer passphrases are welcome (up to 72 UTF-8 bytes).' : undefined} />
      {registering && <PasswordField id="confirm" label="Confirm password" value={values.confirm} onChange={change} error={errors.confirm} creating />}
      </fieldset>
      {registering && <p className="auth-account-note"><span>STUDENT ACCOUNT</span>Public signup is for students. Already an organizer? <Link to="/login" state={{ from, role: 'organizer' }}>Log in with your existing account.</Link></p>}
      <button className="button lime auth-submit" type="submit" disabled={disabled} aria-busy={submitting}>{auth.initializing ? 'Checking your session…' : submitting ? registering ? 'Creating your account…' : 'Logging you in…' : registering ? 'Create my account' : `Log in as ${values.role === 'organizer' ? 'Organizer' : 'Student'}`}<Arrow diagonal /></button>
      <p className="auth-session-note">{registering ? 'After signup, you’ll log in with your new credentials.' : 'Your session stays with this browser. Log out when using a shared device.'}</p>
    </form>
    <div className="auth-switch"><span>{registering ? 'Already part of the story?' : 'A new face on campus?'}</span><Link to={registering ? '/login' : '/register'} state={{ from, role: values.role }}>{registering ? 'Log in' : 'Create an account'} <Arrow diagonal /></Link></div>
  </AuthLayout>;
}
