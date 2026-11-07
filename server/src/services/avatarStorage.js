const crypto = require('node:crypto');
const KEY_PATTERN = /^eventnexus\/student-avatars\/[a-f\d]{24}\/[a-f\d-]{36}$/i;
function storageConfigured(env = process.env) {
    return Boolean(/^[a-z\d_-]+$/i.test(env.CLOUDINARY_CLOUD_NAME || '') && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}
function signature(params, secret) {
    const source = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return crypto.createHash('sha256').update(source + secret).digest('hex');
}
function createAvatarStorage(env = process.env, fetcher = fetch) {
    if (!storageConfigured(env)) return null;
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image`;
    async function call(action, params, image) {
        const form = new FormData();
        for (const [key, value] of Object.entries(params)) form.set(key, String(value));
        form.set('api_key', env.CLOUDINARY_API_KEY);
        form.set('signature', signature(params, env.CLOUDINARY_API_SECRET));
        if (image) form.set('file', new Blob([image], { type: 'image/webp' }), 'avatar.webp');
        const response = await fetcher(`${endpoint}/${action}`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('Avatar storage request failed');
        return response.json();
    }
    return {
        async upload(key, image) {
            if (!KEY_PATTERN.test(key)) throw new Error('Invalid owned avatar key');
            const data = await call('upload', { public_id: key, timestamp: Math.floor(Date.now() / 1000), overwrite: false }, image);
            const url = new URL(data.secure_url);
            if (data.public_id !== key || data.format !== 'webp' || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || !url.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`) || !url.pathname.endsWith(`/${key}.webp`) || url.search || url.hash) throw new Error('Invalid avatar storage response');
            return { key, url: url.href };
        },
        async remove(key) {
            if (!KEY_PATTERN.test(key)) throw new Error('Invalid owned avatar key');
            const data = await call('destroy', { public_id: key, timestamp: Math.floor(Date.now() / 1000), invalidate: true });
            if (!['ok', 'not found'].includes(data.result)) throw new Error('Avatar deletion unconfirmed');
        }
    };
}
module.exports = { createAvatarStorage, storageConfigured, signature, KEY_PATTERN };
