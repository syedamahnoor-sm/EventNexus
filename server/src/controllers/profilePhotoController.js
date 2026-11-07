const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const User = require('../models/User');
const AvatarCleanup = require('../models/AvatarCleanup');
const publicUser = require('../utils/publicUser');
const { processAvatar, photoError, MAX_PHOTO_BYTES, PHOTO_TYPES } = require('../services/avatarImages');
const { createAvatarStorage, storageConfigured } = require('../services/avatarStorage');
const { cleanupAvatar } = require('../services/avatarCleanup');

const photoSettings = () => ({ configured: storageConfigured(), maxBytes: MAX_PHOTO_BYTES, types: PHOTO_TYPES });
function expectedVersion(req) {
    const value = req.get('X-Profile-Version');
    if (!/^(0|[1-9]\d*)$/.test(value || '') || !Number.isSafeInteger(Number(value)) || Number(value) >= Number.MAX_SAFE_INTEGER) throw photoError(400, 'Refresh your profile before changing its photo.');
    return Number(value);
}
function filterFor(req, version) {
    return { _id: req.user._id, role: 'student', ...(version === 0 ? { $or: [{ profileVersion: 0 }, { profileVersion: { $exists: false } }] } : { profileVersion: version }) };
}
// Factory provides storage injection for isolated tests, never a public mock/provider switch.
function createPhotoHandlers(getStore = createAvatarStorage) {
    async function change(req, res, remove = false) {
        let key, store, uploaded = false;
        try {
            const version = expectedVersion(req);
            if (version !== (req.user.profileVersion || 0)) throw photoError(409, 'Your profile changed. Refresh it before changing the photo.');
            const image = remove ? null : await processAvatar(req.body, req.get('Content-Type')?.split(';')[0].trim().toLowerCase());
            store = getStore();
            if (!store) throw photoError(503, 'Photo storage is not configured. Your profile photo has not changed.');
            let photo;
            if (!remove) {
                key = `eventnexus/student-avatars/${req.user._id}/${randomUUID()}`;
                // Record intent before the external upload; stale interrupted uploads are recoverable.
                await AvatarCleanup.create({ key, availableAt: new Date(Date.now() + 3600000) });
                photo = await store.upload(key, image);
                uploaded = true;
            }
            let user, previousKey;
            await mongoose.connection.transaction(async session => {
                const previous = await User.findOne(filterFor(req, version)).select('profilePhoto').session(session);
                if (!previous) throw photoError(409, 'Your profile changed. Refresh it before changing the photo.');
                previousKey = previous.profilePhoto?.key;
                user = await User.findOneAndUpdate(filterFor(req, version), { ...(remove ? { $unset: { profilePhoto: '' } } : { $set: { profilePhoto: photo } }), $inc: { profileVersion: 1 } }, { session, returnDocument: 'after', runValidators: true }).select('_id name email role createdAt studentProfile profileVersion profilePhoto');
                if (!user) throw photoError(409, 'Your profile changed. Refresh it before changing the photo.');
                if (key) await AvatarCleanup.deleteOne({ key }, { session });
                if (previousKey) await AvatarCleanup.updateOne({ key: previousKey }, { $set: { availableAt: new Date() } }, { upsert: true, session });
            });
            if (previousKey) cleanupAvatar(previousKey, store).catch(() => {});
            return res.status(200).json({ message: remove ? 'Profile photo removed' : 'Profile photo saved', user: publicUser(user) });
        } catch (error) {
            // On an uncertain external upload, keep the one-hour journal intent:
            // deleting too early could race a provider upload that completes late.
            if (key && store && uploaded) await cleanupAvatar(key, store).catch(() => {});
            return res.status(error.status || 503).json({ message: error.status ? error.message : 'Photo storage could not confirm the change. Check your profile before trying again.' });
        }
    }
    return { uploadPhoto: (req, res) => change(req, res), removePhoto: (req, res) => change(req, res, true) };
}
module.exports = { ...createPhotoHandlers(), createPhotoHandlers, photoSettings };
