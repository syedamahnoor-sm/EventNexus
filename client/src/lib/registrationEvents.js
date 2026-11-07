const name = 'eventnexus-registration-change';
const origin = globalThis.crypto.randomUUID();
export function publishRegistrationChange(eventId, source) {
  const data = { eventId, source, origin };
  window.dispatchEvent(new CustomEvent(name, { detail: data }));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(name);
    channel.postMessage(data);
    channel.close();
  }
}
export function subscribeRegistrationChange(eventId, callback, source) {
  const receive = data => { if (data?.eventId === eventId && (!source || data.source !== source)) callback(); };
  const listener = event => receive(event.detail);
  window.addEventListener(name, listener);
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(name) : null;
  if (channel) channel.onmessage = event => { if (event.data?.origin !== origin) receive(event.data); };
  return () => { window.removeEventListener(name, listener); channel?.close(); };
}
