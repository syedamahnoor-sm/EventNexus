function clientOrigin(env = process.env) {
    const value = env.CLIENT_URL?.trim() || (env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');
    let url;
    try { url = new URL(value); } catch { throw new Error('CLIENT_URL must be the exact frontend origin.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
        throw new Error('CLIENT_URL must be an origin without a path or trailing slash; production requires HTTPS.');
    }
    return value;
}

function proxyHops(env = process.env) {
    const value = env.TRUST_PROXY_HOPS || '0';
    if (!/^(0|[1-9]|10)$/.test(value)) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10.');
    return Number(value);
}

function sessionCookieOptions(env = process.env) {
    const production = env.NODE_ENV === 'production';
    return { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', path: '/' };
}

module.exports = { clientOrigin, proxyHops, sessionCookieOptions };
