const sharp = require('sharp');
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
let processing = 0;
function photoError(status, message) { return Object.assign(new Error(message), { status }); }
async function processAvatar(input, contentType) {
    if (!Buffer.isBuffer(input) || !input.length) throw photoError(400, 'Select a photo to upload.');
    if (input.length > MAX_PHOTO_BYTES) throw photoError(413, 'Choose a photo smaller than 5 MB.');
    if (!PHOTO_TYPES.includes(contentType)) throw photoError(415, 'Use a JPEG, PNG or WebP photo.');
    const detected = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
        : input[0] === 255 && input[1] === 216 && input[2] === 255 ? 'image/jpeg'
            : input.subarray(0, 4).toString('ascii') === 'RIFF' && input.subarray(8, 12).toString('ascii') === 'WEBP' ? 'image/webp' : null;
    if (detected !== contentType) throw photoError(415, 'The file contents must match a JPEG, PNG or WebP photo.');
    if (processing >= 2) throw photoError(429, 'Photo processing is busy. Please try again shortly.');
    processing++;
    try {
        const image = sharp(input, { limitInputPixels: 20000000, failOn: 'warning' });
        const meta = await image.metadata();
        const expected = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[meta.format];
        if (!expected || expected !== contentType || (meta.pages || 1) !== 1) throw photoError(415, 'Use a non-animated JPEG, PNG or WebP photo with matching file content.');
        if (!meta.width || !meta.height || meta.width > 8192 || meta.height > 8192) throw photoError(413, 'Use an image no larger than 8192 pixels on either side.');
        // Decode/re-encode; never pass original file data or EXIF/GPS metadata to storage.
        return await image.rotate().resize(512, 512, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).timeout({ seconds: 10 }).toBuffer();
    } catch (error) {
        if (error.status) throw error;
        throw photoError(422, 'This photo could not be decoded safely. Choose another JPEG, PNG or WebP.');
    } finally { processing--; }
}
module.exports = { processAvatar, MAX_PHOTO_BYTES, PHOTO_TYPES, photoError };
