export default function LoginRoleSelector({ value, onChange, error }) {
  return <fieldset className="auth-role-selector" aria-describedby={error ? 'login-role-error' : 'login-role-help'}>
    <legend>YOUR PLACE ON CAMPUS</legend>
    <div className="auth-role-options" data-role={value}>
      <label className="auth-role-option"><input className="sr-only" type="radio" name="role" value="student" checked={value === 'student'} onChange={onChange} aria-invalid={Boolean(error)} /><span>Student</span><small>Find your next thing.</small></label>
      <label className="auth-role-option"><input className="sr-only" type="radio" name="role" value="organizer" checked={value === 'organizer'} onChange={onChange} aria-invalid={Boolean(error)} /><span>Organizer</span><small>Make something happen.</small></label>
    </div>
    <p id="login-role-help" className="auth-hint">{value === 'organizer' ? 'Use your existing organizer account. Public signup is for students.' : 'Use your student account to pick up where you left off.'}</p>
    {error && <p id="login-role-error" className="auth-field-error">{error}</p>}
  </fieldset>;
}
