export function validateAuth(values, registering = false) {
  const errors = {};
  if (registering && (values.name.trim().length < 2 || values.name.trim().length > 100)) errors.name = 'Use between 2 and 100 characters for your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 254) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Enter your password.';
  else if (registering && (values.password.length < 8 || new TextEncoder().encode(values.password).length > 72)) errors.password = 'Use at least 8 characters and no more than 72 UTF-8 bytes.';
  if (registering && values.confirm !== values.password) errors.confirm = 'Your passwords don’t match.';
  if (!registering && values.role !== undefined && !['student', 'organizer'].includes(values.role)) errors.role = 'Choose Student or Organizer.';
  return errors;
}

export function authFeedback(error, operation) {
  const status = error.response?.status;
  if (!error.response) return { message: operation === 'register'
    ? 'We couldn’t confirm account creation. Check your connection, then try logging in before submitting again.'
    : 'We couldn’t reach EventNexus. Check your connection and try again.' };
  if (status === 401 && operation === 'login') return { message: 'That email and password don’t match. Please try again.' };
  if (status === 409 && operation === 'register') return { message: 'An account already uses this email. Log in to continue.', fields: { email: 'This email is already registered.' } };
  if (status === 429) return { message: 'Too many attempts. Please wait a little before trying again.' };
  if (status === 403 && operation === 'login' && error.response.data?.code === 'ROLE_MISMATCH') {
    const role = error.response.data.accountRole;
    const label = role === 'organizer' ? 'Organizer' : role === 'student' ? 'Student' : null;
    return { message: label ? `This account uses ${label} login. Select ${label} above and try again.` : 'Choose the login option that matches your existing account.', fields: { role: 'Select the matching account type to continue.' } };
  }
  if (status === 403) return { message: 'Your security check expired. Please try again to get a fresh check.' };
  if (status === 400 && Array.isArray(error.response.data?.errors)) {
    const fields = Object.fromEntries(error.response.data.errors.filter(item => ['name', 'email', 'password'].includes(item.field)).map(item => [item.field, item.message]));
    return { message: 'Please check the highlighted fields.', fields };
  }
  return { message: 'EventNexus couldn’t complete this request. Please try again shortly.' };
}

// Only known in-app destinations; never forward an arbitrary URL from route state.
export function authDestination(from, role) {
  const fallback = role === 'organizer' ? '/organizer/dashboard' : role === 'student' ? '/student/dashboard' : '/events';
  const path = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '';
  if (!path || path.includes('\\') || [...path].some(character => character.charCodeAt(0) < 32)) return fallback;
  const pathname = path.split(/[?#]/)[0];
  if (['/', '/events', '/events/past'].includes(pathname) || /^\/events\/[a-f\d]{24}$/i.test(pathname)) return path;
  if (/^\/events\/[a-f\d]{24}\/register$/i.test(pathname) && role === 'student') return path;
  if (pathname === `/${role}/dashboard` && ['student', 'organizer'].includes(role)) return path;
  if (pathname === '/student/profile' && role === 'student') return path;
  if (role === 'organizer' && (pathname === '/organizer/events/new' || /^\/organizer\/events\/[a-f\d]{24}\/(?:edit|participants(?:\/[a-f\d]{24})?)$/i.test(pathname))) return path;
  return fallback;
}

export function initialLoginRole(state) {
  if (state?.registered) return 'student';
  if (['student', 'organizer'].includes(state?.role)) return state.role;
  const from = typeof state?.from === 'string' ? state.from.split(/[?#]/)[0] : state?.from?.pathname;
  return from === '/organizer/dashboard' || from === '/organizer/events/new' || /^\/organizer\/events\/[a-f\d]{24}\/(?:edit|participants(?:\/[a-f\d]{24})?)$/i.test(from || '') ? 'organizer' : 'student';
}
