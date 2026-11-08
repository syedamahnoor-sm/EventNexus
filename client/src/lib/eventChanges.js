const name = 'eventnexus-event-change';
const origin = globalThis.crypto.randomUUID();
export function publishEventChange(eventId) {
  const detail = { eventId, origin };
  window.dispatchEvent(new CustomEvent(name, { detail }));
  if ('BroadcastChannel' in window) { const channel = new BroadcastChannel(name); channel.postMessage(detail); channel.close(); }
}
export function subscribeEventChange(eventId, refresh) {
  const receive = detail => { if (detail?.eventId && (!eventId || detail.eventId === eventId)) refresh(); };
  const listener = event => receive(event.detail);
  window.addEventListener(name, listener);
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(name) : null;
  if (channel) channel.onmessage = event => { if (event.data?.origin !== origin) receive(event.data); };
  return () => { window.removeEventListener(name, listener); channel?.close(); };
}
