import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { apiBaseUrl } from './apiBaseUrl.js';

test('Vercel API URL joins auth and event routes with exactly one /api and credentials', () => {
  const baseURL = apiBaseUrl('https://eventnexus-api-441o.onrender.com/api/');
  const api = axios.create({ baseURL, withCredentials: true });
  for (const route of ['/auth/me', '/auth/csrf-token', '/auth/login', '/auth/logout', '/events', '/registrations/me', '/organizer/dashboard', '/students/profile']) {
    assert.equal(api.getUri({ url: route }), 'https://eventnexus-api-441o.onrender.com/api' + route);
  }
  assert.equal(api.defaults.withCredentials, true);
});

test('production refuses missing or unsafe API configuration instead of using localhost', () => {
  assert.equal(apiBaseUrl(undefined, true), 'http://localhost:5000/api');
  for (const value of [undefined, '', '/api', 'https://example.com', 'https://example.com/api/api', 'http://example.com/api', 'https://localhost/api', 'https://127.0.0.1/api', 'https://[::1]/api', 'https://example.com/api?x=1', 'https://example.com/api#fragment', 'https://user:password@example.com/api']) assert.throws(() => apiBaseUrl(value));
});
